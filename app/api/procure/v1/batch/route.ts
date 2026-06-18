import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rateLimit";

const CLUSTER_WORKER_URL = process.env.CLUSTER_WORKER_URL || "http://127.0.0.1:3000/api/procure/v1/compute";
const INTERNAL_WORKER_SECRET = process.env.INTERNAL_WORKER_SECRET || "";
// CORRECTED: Aligned directly to your exact .env.local token variable
const DECODO_AUTH_TOKEN = process.env.DECODO_AUTH_TOKEN || ""; 

export async function POST(req: NextRequest) {
  const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";
  if (isRateLimited(clientIp, { maxTokens: 10, refillRate: 1 })) {
    return NextResponse.json({ error: "Too Many Requests." }, { status: 429 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch (parseErr) {
    return NextResponse.json({ error: "Malformed JSON payload matrix." }, { status: 400 });
  }

  const { items } = body;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Invalid structural payload matrix format." }, { status: 400 });
  }

  try {
    // 1. EXTRACT ASIN ARRAY FOR DECODO STREAM INGESTION
    const asinList = items.map((i: any) => i.sku).filter(Boolean);

    // 2. LIVE FETCH FROM DECODO SCRAPING CORE WITH YOUR CORRECT AUTH KEY
    const decodoResponse = await fetch("https://api.decodo.io/v1/scrape/amazon", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DECODO_AUTH_TOKEN}`
      },
      body: JSON.stringify({
        asins: asinList,
        country: "us",
        render_js: true
      })
    });

    if (!decodoResponse.ok) {
      throw new Error(`Decodo API returned error status: ${decodoResponse.status}`);
    }

    const liveScrapedData = await decodoResponse.json();

    // 3. PASS LIVE SCALED DATA DIRECTLY TO COMPUTE ENGINE
    const clusterResponse = await fetch(CLUSTER_WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${INTERNAL_WORKER_SECRET}`
      },
      body: JSON.stringify({
        items: liveScrapedData.results || items,
        orgId: "ui_corporate_procure_dashboard"
      })
    });

    const clusterData = await clusterResponse.json();
    return NextResponse.json({ status: "ASYNC_CLUSTER_ACCEPTED", trackingId: clusterData.trackingId }, { status: 202 });

  } catch (err: any) {
    console.error(`[LIVE DECODO INTEGRATION CRASH]: ${err.message}`);
    return NextResponse.json({ error: "Failed to process live metrics through scraper.", details: err.message }, { status: 500 });
  }
}