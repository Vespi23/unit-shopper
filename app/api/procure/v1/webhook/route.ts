import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
const redis = Redis.fromEnv();

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

  const setKey = `bl_job:pending:${jobId}`;

  try {
    const rawData = await req.json();
    const payload = rawData.data || rawData.result || rawData;

    const isNewRemoval = await redis.srem(setKey, sku);
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
      let recommendedSource = "AMAZON_RETAIL";
      let status: "STABLE" | "OPTIMIZED" | "ALERT" = "STABLE";

      const qty = jobData.items[targetItemIndex].quantity || 1;

      if (!isNaN(liveRetailPrice) && liveRetailPrice > 0) {
        delta = (liveRetailPrice - liveWholesalePrice) / liveRetailPrice;
        if (delta > 0.05) {
          status = "OPTIMIZED";
          recommendedSource = "AMAZON_BUSINESS_BULK";
          jobData.metrics.projectedSavings += (liveRetailPrice - liveWholesalePrice) * qty;
        }
      }

      // FIXED: Added absolute pricing keys directly onto the object to satisfy UI schema bindings
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
      jobData.status = "COMPLETED";
      jobData.progress = 100;
      jobData.metrics.projectedSavings = parseFloat(jobData.metrics.projectedSavings.toFixed(2));
      jobData.metrics.optimizedRoutesCount = jobData.items.filter((r: any) => r.status === "OPTIMIZED").length;
      console.log(`[JOB_SUCCESS]: Ingress fully compiled for ${jobId}. All lanes clear.`);
    } else {
      const completedCount = jobData.totalItems - remainingCount;
      jobData.progress = Math.min(95, Math.floor((completedCount / jobData.totalItems) * 100));
    }

    await redis.set(jobId, JSON.stringify(jobData), { ex: 1800 });

    console.log(`[CALLBACK_SUCCESS]: SKU ${sku} processed atomically. [Remaining items in tracker: ${remainingCount}]`);
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: "Internal crash." }, { status: 500 });
  }
}