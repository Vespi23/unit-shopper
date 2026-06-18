import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rateLimit";

const CLUSTER_WORKER_URL = process.env.CLUSTER_WORKER_URL || "http://127.0.0.1:3000/api/procure/v1/compute";
const INTERNAL_WORKER_SECRET = process.env.INTERNAL_WORKER_SECRET || "";
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

  const { items } = body;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Invalid structural payload format." }, { status: 400 });
  }

  let processingItems = [...items];

  // NETWORKING INSULATION RING: Wrap the external API in an independent try block
  try {
    const asinList = items.map((i: any) => i.sku).filter(Boolean);

    const decodoResponse = await fetch("https://api.decodo.io/v1/scrape/amazon", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DECODO_AUTH_TOKEN}`
      },
      body: JSON.stringify({ asins: asinList, country: "us", render_js: true }),
      // Add a clean 4-second network timeout window
      signal: AbortSignal.timeout(4000) 
    });

    if (decodoResponse.ok) {
      const liveScrapedData = await decodoResponse.json();
      const scrapedProducts = liveScrapedData.data || liveScrapedData.results || items;
      
      processingItems = scrapedProducts.map((scrapedItem: any, index: number) => ({
        ...scrapedItem,
        asin: scrapedItem.asin || items[index]?.sku,
        quantity: items[index]?.quantity || 1
      }));
      console.log("[DECODO_GATEWAY_SUCCESS]: Live scraper matrix data loaded.");
    } else {
      console.warn(`[DECODO_API_WARN]: Server returned status ${decodoResponse.status}. Utilizing core backup calculations.`);
    }

  } catch (netErr: any) {
    // Intercept "fetch failed" network network drops cleanly without crashing the pipeline
    console.warn(`[DECODO_NETWORK_REDIRECT]: Connection to scraper target failed (${netErr.message}). Deploying local fallback track.`);
  }

  // 3. SECURE PASS DOWNSTREAM (Always runs successfully)
  try {
    const clusterResponse = await fetch(CLUSTER_WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${INTERNAL_WORKER_SECRET}`
      },
      body: JSON.stringify({ items: processingItems, orgId: "ui_corporate_procure_dashboard" })
    });

    if (!clusterResponse.ok) throw new Error(`Compute node rejected payload: ${clusterResponse.status}`);

    const clusterData = await clusterResponse.json();
    return NextResponse.json({ status: "ASYNC_CLUSTER_ACCEPTED", trackingId: clusterData.trackingId }, { status: 202 });

  } catch (err: any) {
    console.error(`[COMPUTE_CRITICAL_ERROR]: ${err.message}`);
    return NextResponse.json({ error: "Serverless compute pipeline faulted processing rows." }, { status: 500 });
  }
}