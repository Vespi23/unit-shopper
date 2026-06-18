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
  status: "PROCESSING" | "STABLE" | "OPTIMIZED" | "ALERT";
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
  const setKey = `bl_job:pending:${trackingId}`;

  try {
    const secureOrigin = req.nextUrl.origin.replace(/^http:/, "https:");

    const registeredTasks = await Promise.all(
      items.map(async (item: any) => {
        if (!item.sku || item.sku === "UNKNOWN_ASIN") return null;
        try {
          const targetCallback = `${secureOrigin}/api/procure/v1/webhook?jobId=${trackingId}&sku=${item.sku}`;
          
          const res = await fetch("https://scraper-api.decodo.com/v3/task", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${DECODO_AUTH_TOKEN}`
            },
            body: JSON.stringify({ url: `https://www.amazon.com/dp/${item.sku}`, callback_url: targetCallback })
          });

          if (!res.ok) return null;
          const data = await res.json();
          return { sku: item.sku, taskId: data.task_id || data.id };
        } catch (_) { return null; }
      })
    );

    const validTasks = registeredTasks.filter(
      (t): t is { sku: string; taskId: string } => t !== null
    );
    
    if (validTasks.length === 0) {
      console.error("[INGEST_FAIL]: 0 tasks successfully registered with external api.");
      return NextResponse.json({ error: "Failed to allocate parsing targets upstream." }, { status: 502 });
    }

    const skusToTrack = validTasks.map(t => t.sku);
    await redis.sadd(setKey, skusToTrack[0], ...skusToTrack.slice(1));
    await redis.expire(setKey, 1800); 

    const validatedItemPayloads: TaskPayloadRow[] = items.map((i: any) => {
      const isRegistered = skusToTrack.includes(i.sku);
      return {
        sku: i.sku,
        retailer: "Amazon.com",
        quantity: i.quantity || 1,
        price: 0,
        wholesale_price: 0,
        unitCostDelta: 0.0000,
        recommendedSource: isRegistered ? "PENDING_LIVE_INGEST" : "SKIPPED_REGISTRATION_FAILED",
        status: "PROCESSING"
      };
    });

    const runtimeCacheState = {
      status: "PROCESSING",
      progress: 10,
      orgId,
      totalItems: validatedItemPayloads.length,
      items: validatedItemPayloads,
      metrics: { totalItemsProcessed: validatedItemPayloads.length, projectedSavings: 0.00, shrinkflationAlerts: 0, optimizedRoutesCount: 0 }
    };

    await redis.set(trackingId, JSON.stringify(runtimeCacheState), { ex: 3600 });

    console.log(`[DECODO_GATEWAY_ASYNC_INIT]: Set key ${setKey} seeded. Awaiting webhook completion.`);
    return NextResponse.json({ status: "ASYNC_CLUSTER_ACCEPTED", trackingId }, { status: 202 });

  } catch (err: any) {
    console.error(`[INGEST_CRITICAL_FAULT]: ${err.message}`);
    return NextResponse.json({ error: "Serverless data ingress failed." }, { status: 500 });
  }
}