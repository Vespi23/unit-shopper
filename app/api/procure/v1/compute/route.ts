import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const SHARED_SECURITY_TOKEN = process.env.INTERNAL_WORKER_SECRET || process.env.DECODO_AUTH_TOKEN || "LOCAL_DEV_DEFAULT_SECURE_TOKEN_9981";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader && authHeader.split(" ")[1];

  if (!token || token !== SHARED_SECURITY_TOKEN) {
    console.error(`[SECURITY_ALERT]: Compute route blocked unauthorized ingress attempt.`);
    return NextResponse.json({ error: "Access Denied: Invalid signature token." }, { status: 401 });
  }

  try {
    const { items, orgId } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Invalid structural payload." }, { status: 400 });
    }

    const trackingId = `bl_job_${Math.random().toString(36).substring(2, 15)}`;

    let calculatedSavings = 0;
    let alertTriggers = 0;

    const processedRows = items.map((item: any) => {
      const productIdentifier = item.asin || item.sku || "UNKNOWN_ASIN";
      const qty = item.quantity || 1;

      // EXTRACT PURE UNADULTERATED METRICS FROM INGEST CHANNEL
      const liveRetailPrice = parseFloat(item.price || item.buybox_price || item.retail_price);
      const liveWholesalePrice = parseFloat(item.wholesale_price || item.business_price);

      let delta = 0;
      let recommendedSource = "AMAZON_RETAIL";
      let status: "STABLE" | "OPTIMIZED" | "ALERT" = "STABLE";

      // CRITICAL HARDENING: Only process if both parameters are verified real numbers
      if (!isNaN(liveRetailPrice) && !isNaN(liveWholesalePrice) && liveRetailPrice > 0) {
        delta = (liveRetailPrice - liveWholesalePrice) / liveRetailPrice;
        
        if (delta > 0.05) {
          status = "OPTIMIZED";
          recommendedSource = "AMAZON_BUSINESS_BULK";
          calculatedSavings += (liveRetailPrice - liveWholesalePrice) * qty;
        } else if (item.is_volatile || item.buybox_hijacked) {
          status = "ALERT";
          recommendedSource = "AMAZON_RETAIL";
          alertTriggers++;
        }
      } else {
        // FIXED: Synthetic calculation matrix completely removed. 
        // Missing or asynchronous data maps natively to zero-state telemetry metrics.
        delta = 0.0000;
        recommendedSource = "PENDING_LIVE_INGEST";
        status = "STABLE";
      }

      return {
        sku: productIdentifier,
        retailer: "Amazon.com",
        quantity: qty,
        unitCostDelta: parseFloat(delta.toFixed(4)),
        recommendedSource: recommendedSource,
        status: status
      };
    });

    // Write accurate state data records straight to Upstash cache layers
    await redis.set(trackingId, JSON.stringify({
      status: "COMPLETED",
      progress: 100,
      orgId,
      totalItems: items.length,
      items: processedRows,
      metrics: {
        totalItemsProcessed: items.length,
        projectedSavings: parseFloat(calculatedSavings.toFixed(2)),
        shrinkflationAlerts: alertTriggers,
        optimizedRoutesCount: processedRows.filter((r: any) => r.status === "OPTIMIZED").length
      }
    }), { ex: 1800 });

    return NextResponse.json({ trackingId }, { status: 202 });

  } catch (err: any) {
    console.error(`[COMPUTE_CRITICAL_ERROR]: ${err.message}`);
    return NextResponse.json({ error: "Serverless compute logic crashed." }, { status: 500 });
  }
}