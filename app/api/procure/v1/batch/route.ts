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

  try {
    const asinList = items.map((i: any) => i.sku).filter(Boolean);

    const decodoResponse = await fetch("https://api.decodo.io/v1/scrape/amazon", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DECODO_AUTH_TOKEN}`
      },
      body: JSON.stringify({ asins: asinList, country: "us", render_js: true })
    });

    if (!decodoResponse.ok) {
      throw new Error(`Decodo API responded with status: ${decodoResponse.status}`);
    }

    const liveScrapedData = await decodoResponse.json();

    // FIXED: Decodo returns the scraped object listings inside a 'data' array root
    const scrapedProducts = liveScrapedData.data || liveScrapedData.results || items;

    // Attach the original requested quantities to the scraped pricing data rows
    const enrichedItems = scrapedProducts.map((scrapedItem: any, index: number) => ({
      ...scrapedItem,
      asin: scrapedItem.asin || items[index]?.sku,
      quantity: items[index]?.quantity || 1
    }));

    const clusterResponse = await fetch(CLUSTER_WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${INTERNAL_WORKER_SECRET}`
      },
      body: JSON.stringify({ items: enrichedItems, orgId: "ui_corporate_procure_dashboard" })
    });

    const clusterData = await clusterResponse.json();
    return NextResponse.json({ status: "ASYNC_CLUSTER_ACCEPTED", trackingId: clusterData.trackingId }, { status: 202 });

  } catch (err: any) {
    console.error(`[DECODO_GATEWAY_ERROR]: ${err.message}`);
    return NextResponse.json({ error: "Failed to process live metrics through scraper.", details: err.message }, { status: 500 });
  }
}