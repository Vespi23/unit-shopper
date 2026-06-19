import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rateLimit";
import { redisREST } from "@/lib/redis-client"; // FIXED: Swapped for zero-dependency REST utility

export const runtime = "nodejs";

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

const pace = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    const skusToTrack: string[] = [];

    for (const item of items) {
      if (!item.sku || item.sku === "UNKNOWN_ASIN") continue;

      try {
        const targetCallback = `${secureOrigin}/api/procure/v1/webhook?jobId=${trackingId}&sku=${item.sku}`;
        
        const res = await fetch("https://scraper-api.decodo.com/v3/task", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${DECODO_AUTH_TOKEN}`
          },
          body: JSON.stringify({ 
            url: `https://www.amazon.com/dp/${item.sku}`, 
            callback_url: targetCallback 
          })
        });

        if (res.ok) {
          skusToTrack.push(item.sku);
        }

        await pace(40);
      } catch (innerErr: any) {
        console.error(`[DECODO_FETCH_FAIL]: ${innerErr.message}`);
      }
    }

    if (skusToTrack.length === 0) {
      return NextResponse.json({ error: "Failed to allocate parsing targets upstream." }, { status: 502 });
    }

    // FIXED: Shifted to native REST calls
    await redisREST.sadd(setKey, skusToTrack[0], ...skusToTrack.slice(1));
    await redisREST.expire(setKey, 1800); 

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
        status: "Processing"
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

    // FIXED: Shifted to native REST calls
    await redisREST.set(trackingId, JSON.stringify(runtimeCacheState), { ex: 3600 });

    return NextResponse.json({ status: "ASYNC_CLUSTER_ACCEPTED", trackingId }, { status: 202 });

  } catch (err: any) {
    return NextResponse.json({ error: "Serverless data ingress failed." }, { status: 500 });
  }
}