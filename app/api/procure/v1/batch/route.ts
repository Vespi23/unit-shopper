import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rateLimit";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";

const redis = Redis.fromEnv();
const DECODO_AUTH_TOKEN = process.env.DECODO_AUTH_TOKEN || ""; 

export async function POST(req: NextRequest) {
  const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";
  if (isRateLimited(clientIp, { maxTokens: 10, refillRate: 1 })) {
    return NextResponse.json({ error: "Too Many Requests." }, { status: 429 });
  }

  let body: any;
  try { body = await req.json(); } catch (e) {
    return NextResponse.json({ error: "Malformed JSON payload matrix." }, { status: 400 });
  }

  const { items, orgId } = body;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Invalid structural payload format." }, { status: 400 });
  }

  const trackingId = `bl_job_${Math.random().toString(36).substring(2, 15)}`;

  try {
    // Dispatch tasks to Decodo and collect background tracking IDs immediately
    const registeredTasks = await Promise.all(
      items.map(async (item: any) => {
        if (!item.sku || item.sku === "UNKNOWN_ASIN") return null;
        try {
          const res = await fetch("https://scraper-api.decodo.com/v3/task", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${DECODO_AUTH_TOKEN}`
            },
            body: JSON.stringify({ 
              url: `https://www.amazon.com/dp/${item.sku}`,
              // Provide an optional callback URL if Decodo supports webhooks natively
              callback_url: `${req.nextUrl.origin}/api/procure/v1/webhook?jobId=${trackingId}&sku=${item.sku}`
            })
          });
          if (!res.ok) return null;
          const data = await res.json();
          return { sku: item.sku, quantity: item.quantity, taskId: data.task_id || data.id };
        } catch (_) {
          return null;
        }
      })
    );

    const validTasks = registeredTasks.filter(Boolean);

    // Commit initial job blueprint records to Upstash cache instantly
    await redis.set(trackingId, JSON.stringify({
      status: "PROCESSING",
      progress: 10,
      orgId: orgId || "ui_corporate_procure_dashboard",
      totalItems: items.length,
      pendingTasks: validTasks,
      items: items.map(i => ({
        sku: i.sku,
        retailer: "Amazon.com",
        quantity: i.quantity,
        unitCostDelta: 0.0000,
        recommendedSource: "PENDING_LIVE_INGEST",
        status: "STABLE"
      })),
      metrics: { totalItemsProcessed: items.length, projectedSavings: 0.00, shrinkflationAlerts: 0, optimizedRoutesCount: 0 }
    }), { ex: 3600 });

    console.log(`[DECODO_GATEWAY_ASYNC_INIT]: Job ${trackingId} successfully registered and offloaded to Upstash.`);
    return NextResponse.json({ status: "ASYNC_CLUSTER_ACCEPTED", trackingId }, { status: 202 });

  } catch (err: any) {
    console.error(`[INGEST_CRITICAL_FAULT]: ${err.message}`);
    return NextResponse.json({ error: "Serverless data ingress failed." }, { status: 500 });
  }
}