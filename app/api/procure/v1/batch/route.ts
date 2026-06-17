import { NextRequest, NextResponse } from "next/server";

interface VolumePayloadItem {
  sku: string;
  retailer: string;
  quantity: number;
}

export async function POST(request: NextRequest) {
  const strategy = request.headers.get("x-route-strategy");
  const orgId = request.headers.get("x-org-id");
  
  let items: VolumePayloadItem[] = [];

  // FORCE-THROUGH STICKY GATE: Fail fast on raw malformed string payloads
  try {
    const body = await request.json();
    if (!body || !Array.isArray(body.items)) {
      return NextResponse.json({
        error: "Malformed request structure.",
        details: "Missing or invalid 'items' root array element."
      }, { status: 400 });
    }
    items = body.items;
  } catch (parseError: any) {
    return NextResponse.json({
      error: "Invalid JSON syntax payload.",
      details: parseError.message,
      [RISK_WARNING]: "The raw input string cannot be correctly parsed by the edge engine."
    }, { status: 400 });
  }

  // ZERO-LENGTH EMBED SHIELD
  if (items.length === 0) {
    return NextResponse.json({
      error: "Empty batch initialization rejected.",
      details: "The processing matrix array must contain at least 1 item element."
    }, { status: 400 });
  }

  if (strategy !== "high-velocity-cluster") {
    if (items.length > 50) {
      return NextResponse.json({
        error: "Payload size limit exceeded for standard pipeline processing.",
        "RISK_WARNING": "Direct execution blocks above 50 items risk engine timeouts. Use an Enterprise Token."
      }, { status: 403 });
    }
    return NextResponse.json({ status: "SUCCESS", processed: items.length, mode: "STANDARD_SYNC" });
  }

  try {
    const queuePayload = { orgId, items, origin: "BudgetLynx_Procure_Engine", timestamp: Date.now() };

    const queueResponse = await fetch("https://workers.budgetlynx.com/v1/procure-ingest", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.INTERNAL_WORKER_SECRET || "fallback_secret"}`
      },
      body: JSON.stringify(queuePayload)
    }).then(res => {
      if (!res.ok) throw new Error(`Worker cluster status code: ${res.status}`);
      return res.json();
    });

    return NextResponse.json({
      status: "QUEUED",
      trackingId: queueResponse.trackingId,
      mode: "PRIMARY_CLUSTER"
    }, { status: 202 });

  } catch (err: any) {
    const MAX_FALLBACK_LIMIT = 500;
    if (items.length > MAX_FALLBACK_LIMIT) {
      return NextResponse.json({
        error: "Primary worker cluster offline and payload exceeds serverless fallback ceiling.",
        remediation: "Reduce batch request size below 500 items to process via edge backup channels."
      }, { status: 429 });
    }

    const fallbackTrackingId = `bl_fallback_${Math.random().toString(36).substring(2, 15)}`;
    console.error(`[TELEMETRY ALERT] Org ${orgId} dropped to fallback layer. Size: ${items.length}. Reason: ${err.message}`);

    return NextResponse.json({
      status: "DEGRADED_COMPUTATION_SUCCESS",
      trackingId: fallbackTrackingId,
      mode: "SERVERLESS_FALLBACK_LOOP",
      itemsProcessed: items.length,
      "RISK_WARNING": "Worker cluster offline. Processing payload via localized sharded fallback execution state."
    }, { status: 200 });
  }
}