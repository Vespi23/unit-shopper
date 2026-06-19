import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";

// FIXED: Explicitly define token configs and turn off telemetry in the constructor matrix
const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "";
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "";

const redis = redisUrl && redisToken 
  ? new Redis({ 
      url: redisUrl, 
      token: redisToken,
      telemetry: false // CRITICAL: Hard-kills internal telemetry requests to /pipeline
    }) 
  : null;

function cleanNumericPrice(value: any): number {
  if (value === null || value === undefined) return NaN;
  if (typeof value === "number") return value;
  const cleanString = String(value).replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleanString);
  return isNaN(parsed) ? NaN : parsed;
}

export async function POST(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const jobId = searchParams.get("jobId");
  const sku = searchParams.get("sku");

  if (!jobId || !sku) return NextResponse.json({ error: "Missing matrices." }, { status: 400 });
  if (!redis) return NextResponse.json({ error: "Database instance uninitialized." }, { status: 500 });

  const setKey = `bl_job:pending:${jobId}`;

  try {
    const rawData = await req.json();
    const payload = rawData.data || rawData.result || rawData;

    await redis.srem(setKey, sku);
    const remainingCount = await redis.scard(setKey);

    const cachedJob = await redis.get(jobId);
    if (!cachedJob) return NextResponse.json({ error: "Expired." }, { status: 404 });

    const jobData = typeof cachedJob === "string" ? JSON.parse(cachedJob) : cachedJob;

    const targetItemIndex = jobData.items.findIndex((i: any) => i.sku === sku);
    if (targetItemIndex !== -1) {
      const rawRetail = payload.price || payload.amazon_price || payload.buybox_price || payload.ecommerce_data?.price;
      const rawWholesale = payload.wholesale_price || payload.business_price || payload.ecommerce_data?.wholesale_price;

      const liveRetailPrice = cleanNumericPrice(rawRetail);
      const liveWholesalePrice = isNaN(cleanNumericPrice(rawWholesale)) ? liveRetailPrice * 0.85 : cleanNumericPrice(rawWholesale);

      let delta = 0.0000;
      let recommendedSource = "Amazon.com";
      let status: "Stable" | "Optimized" | "Alert" = "Stable";

      const qty = jobData.items[targetItemIndex].quantity || 1;

      if (!isNaN(liveRetailPrice) && liveRetailPrice > 0) {
        delta = (liveRetailPrice - liveWholesalePrice) / liveRetailPrice;
        if (delta > 0.05) {
          status = "Optimized";
          recommendedSource = "AMAZON_BUSINESS_BULK";
        }
      }

      jobData.items[targetItemIndex] = {
        sku: sku,
        retailer: "Amazon.com",
        quantity: qty,
        price: liveRetailPrice,
        wholesale_price: liveWholesalePrice,
        unitCostDelta: parseFloat(delta.toFixed(4)),
        recommendedSource: recommendedSource,
        status: status
      };
    }

    if (remainingCount === 0) {
      let finalProjectedSavings = 0;
      let optimizedCount = 0;

      jobData.items.forEach((item: any) => {
        if (item.status === "Optimized") {
          optimizedCount++;
          const itemCostDiff = (item.price - item.wholesale_price) * item.quantity;
          if (!isNaN(itemCostDiff) && itemCostDiff > 0) {
            finalProjectedSavings += itemCostDiff;
          }
        }
      });

      jobData.status = "COMPLETED";
      jobData.progress = 100;
      jobData.metrics = {
        totalItemsProcessed: jobData.items.length,
        projectedSavings: parseFloat(finalProjectedSavings.toFixed(2)),
        shrinkflationAlerts: 0,
        optimizedRoutesCount: optimizedCount
      };
    } else {
      const completedCount = jobData.totalItems - remainingCount;
      jobData.progress = Math.min(95, Math.floor((completedCount / jobData.totalItems) * 100));
    }

    await redis.set(jobId, JSON.stringify(jobData), { ex: 1800 });
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err: any) {
    console.error(`[WEBHOOK_ERROR]: ${err.message}`);
    return NextResponse.json({ error: "Internal crash." }, { status: 500 });
  }
}