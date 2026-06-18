import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rateLimit";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
const redis = Redis.fromEnv();
const DECODO_AUTH_TOKEN = process.env.DECODO_AUTH_TOKEN || ""; 

interface TaskPayloadRow {
  sku: string;
  retailer: string;
  quantity: number;
  price: number;
  wholesale_price: number;
  unitCostDelta: number;
  recommendedSource: string;
  status: "Processing" | "Stable" | "Optimized" | "Alert";
}

export async function POST(req: NextRequest) {
  const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";
  if (isRateLimited(clientIp, { maxTokens: 10, refillRate: 1 })) {
    return NextResponse.json({ error: "Too Many Requests." }, { status: 429 });
  }

  let body: any;
  try { body = await req.json(); } catch (e) {
    return NextResponse.json({ error: "Malformed JSON payload matrix." }, { status: 400 });
  }

  const { items } = body;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Invalid structural payload format." }, { status: 400 });
  }

  const orgId = String(body.orgId || "ui_corporate_procure_dashboard").trim();
  const trackingId = `bl_job_${Math.random().toString(36).substring(2, 15)}`;

  try {
    const secureOrigin = req.nextUrl.origin.replace(/^http:/, "https:");

    // FIXED: Build flat task definitions that use the callback URL to preserve metadata parameters safely
    const tasks = items.map((item: any) => {
      const itemSku = String(item.sku || "UNKNOWN");
      const itemQty = parseInt(item.quantity || "1", 10);
      return {
        url: `https://www.amazon.com/dp/${itemSku}`,
        callback_url: `${secureOrigin}/api/procure/v1/webhook?jobId=${trackingId}&sku=${itemSku}&qty=${itemQty}`
      };
    });

    const res = await fetch("https://scraper-api.decodo.com/v3/batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DECODO_AUTH_TOKEN}`
      },
      body: JSON.stringify({ tasks }) // Decodo natively matches task-level callbacks in batch operations
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[DECODO_BATCH_GATE_REJECT]: Status ${res.status} - Payload: ${errText}`);
      return NextResponse.json({ error: "Failed to allocate parsing targets upstream." }, { status: 502 });
    }

    const validatedItemPayloads: TaskPayloadRow[] = items.map((i: any) => ({
      sku: i.sku,
      retailer: "Amazon.com",
      quantity: i.quantity || 1,
      price: 0,
      wholesale_price: 0,
      unitCostDelta: 0.0000,
      recommendedSource: "PENDING_LIVE_INGEST",
      status: "Processing"
    }));

    const runtimeCacheState = {
      status: "PROCESSING",
      progress: 10,
      orgId,
      totalItems: validatedItemPayloads.length,
      items: validatedItemPayloads,
      metrics: { totalItemsProcessed: validatedItemPayloads.length, projectedSavings: 0.00, shrinkflationAlerts: 0, optimizedRoutesCount: 0 }
    };

    await redis.set(trackingId, JSON.stringify(runtimeCacheState), { ex: 3600 });

    console.log(`[DECODO_BATCH_INIT]: Batch array initialized safely using flat tracking routes under ID: ${trackingId}`);
    return NextResponse.json({ status: "ASYNC_CLUSTER_ACCEPTED", trackingId }, { status: 202 });

  } catch (err: any) {
    console.error(`[INGEST_CRITICAL_FAULT]: ${err.message}`);
    return NextResponse.json({ error: "Serverless data ingress failed." }, { status: 500 });
  }
}