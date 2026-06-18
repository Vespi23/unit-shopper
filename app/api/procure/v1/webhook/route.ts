import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || process.env.REDIS_URL || "";
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || process.env.REDIS_TOKEN || "";
const redis = new Redis({ url: redisUrl, token: redisToken });

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

  if (!jobId) return NextResponse.json({ error: "Missing tracking identification." }, { status: 400 });
  if (!redisToken) return NextResponse.json({ error: "Database configuration desynchronized." }, { status: 500 });

  try {
    const rawPayload = await req.json();
    
    // Decodo batches return results inside a 'results' or 'tasks' array block
    const scrapedTasks = rawPayload.results || rawPayload.tasks || [];
    
    const cachedJob = await redis.get(jobId);
    if (!cachedJob) return NextResponse.json({ error: "Job instance expired." }, { status: 404 });

    const jobData = typeof cachedJob === "string" ? JSON.parse(cachedJob) : cachedJob;

    let finalProjectedSavings = 0;
    let optimizedCount = 0;

    // Process every single batch item in a clean, isolated loop execution context
    jobData.items = jobData.items.map((existingItem: any) => {
      const match = scrapedTasks.find((t: any) => t.metadata?.sku === existingItem.sku || t.sku === existingItem.sku);
      
      if (!match) return existingItem;

      const resultData = match.result || match.data || match;
      const rawRetail = resultData.price || resultData.amazon_price || resultData.buybox_price || resultData.ecommerce_data?.price;
      const rawWholesale = resultData.wholesale_price || resultData.business_price || resultData.ecommerce_data?.wholesale_price;

      const liveRetailPrice = cleanNumericPrice(rawRetail);
      const liveWholesalePrice = isNaN(cleanNumericPrice(rawWholesale)) ? liveRetailPrice * 0.85 : cleanNumericPrice(rawWholesale);

      let delta = 0.0000;
      let recommendedSource = "Amazon.com";
      let status: "Stable" | "Optimized" | "Alert" = "Stable";

      if (!isNaN(liveRetailPrice) && liveRetailPrice > 0) {
        delta = (liveRetailPrice - liveWholesalePrice) / liveRetailPrice;
        if (delta > 0.05) {
          status = "Optimized";
          recommendedSource = "AMAZON_BUSINESS_BULK";
          optimizedCount++;
          finalProjectedSavings += (liveRetailPrice - liveWholesalePrice) * existingItem.quantity;
        }
      }

      return {
        sku: existingItem.sku,
        retailer: "Amazon.com",
        quantity: existingItem.quantity,
        price: liveRetailPrice,
        wholesale_price: liveWholesalePrice,
        unitCostDelta: parseFloat(delta.toFixed(4)),
        recommendedSource,
        status
      };
    });

    // Update global properties
    jobData.status = "COMPLETED";
    jobData.progress = 100;
    jobData.metrics = {
      totalItemsProcessed: jobData.items.length,
      projectedSavings: parseFloat(finalProjectedSavings.toFixed(2)),
      shrinkflationAlerts: 0,
      optimizedRoutesCount: optimizedCount
    };

    await redis.set(jobId, JSON.stringify(jobData), { ex: 1800 });
    
    console.log(`[BATCH_SUCCESS]: Unified webhook completed for ${jobId}. Savings mapped: $${finalProjectedSavings}`);
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (err: any) {
    console.error(`[BATCH_WEBHOOK_CRITICAL_ERROR]: ${err.message}`);
    return NextResponse.json({ error: "Internal processing crash." }, { status: 500 });
  }
}