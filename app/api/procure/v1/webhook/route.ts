import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
const redis = Redis.fromEnv();

export async function POST(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const jobId = searchParams.get("jobId");
  const sku = searchParams.get("sku");

  if (!jobId || !sku) {
    return NextResponse.json({ error: "Missing tracking query matrices." }, { status: 400 });
  }

  try {
    const rawData = await req.json();
    const payload = rawData.data || rawData.result || rawData;

    // 1. EXTRACT QUANTITATIVE PRICING NODES
    const liveRetailPrice = parseFloat(payload.price || payload.amazon_price || payload.ecommerce_data?.price);
    const liveWholesalePrice = parseFloat(payload.wholesale_price || payload.business_price || payload.ecommerce_data?.wholesale_price);

    // 2. RETRIEVE CURRENT UPSTASH JOB METRICS
    const cachedJob = await redis.get(jobId);
    if (!cachedJob) return NextResponse.json({ error: "Job instance expired." }, { status: 404 });

    const jobData = typeof cachedJob === "string" ? JSON.parse(cachedJob) : cachedJob;

    // 3. EXECUTE RE-CALCULATION BLOCK FOR THE SCRAPED ITEM
    let delta = 0.0000;
    let recommendedSource = "AMAZON_RETAIL";
    let status: "STABLE" | "OPTIMIZED" | "ALERT" = "STABLE";

    const targetItemIndex = jobData.items.findIndex((i: any) => i.sku === sku);
    if (targetItemIndex === -1) return NextResponse.json({ error: "SKU not found in manifest." }, { status: 404 });

    const qty = jobData.items[targetItemIndex].quantity || 1;

    if (!isNaN(liveRetailPrice) && !isNaN(liveWholesalePrice) && liveRetailPrice > 0) {
      delta = (liveRetailPrice - liveWholesalePrice) / liveRetailPrice;
      if (delta > 0.05) {
        status = "OPTIMIZED";
        recommendedSource = "AMAZON_BUSINESS_BULK";
        jobData.metrics.projectedSavings += (liveRetailPrice - liveWholesalePrice) * qty;
      }
    }

    // 4. MUTATE ITEM PROPERTY TILES INSIDE ACTIVE MEMORY
    jobData.items[targetItemIndex] = {
      sku: sku,
      retailer: "Amazon.com",
      quantity: qty,
      unitCostDelta: parseFloat(delta.toFixed(4)),
      recommendedSource: recommendedSource,
      status: status
    };

    // Remove item trace from pending check queues
    jobData.pendingTasks = jobData.pendingTasks.filter((t: any) => t.sku !== sku);

    // 5. UPDATE PROGRESS TRACKING AND EVALUATE JOB COMPLETION STATE
    if (jobData.pendingTasks.length === 0) {
      jobData.status = "COMPLETED";
      jobData.progress = 100;
      jobData.metrics.optimizedRoutesCount = jobData.items.filter((r: any) => r.status === "OPTIMIZED").length;
    } else {
      const completedCount = jobData.totalItems - jobData.pendingTasks.length;
      jobData.progress = Math.min(95, Math.floor((completedCount / jobData.totalItems) * 100));
    }

    // 6. COMMIT RE-COMPILED RECORDS BACK TO ACTIVE RUNTIME CACHE
    await redis.set(jobId, JSON.stringify(jobData), { ex: 1800 });

    console.log(`[CALLBACK_SUCCESS]: Webhook updated SKU ${sku} inside job context [Remaining: ${jobData.pendingTasks.length}]`);
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err: any) {
    console.error(`[WEBHOOK_CRITICAL_FAULT]: ${err.message}`);
    return NextResponse.json({ error: "Internal parsing engine crash." }, { status: 500 });
  }
}