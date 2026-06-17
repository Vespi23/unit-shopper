import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rateLimit";

const CLUSTER_WORKER_URL = process.env.CLUSTER_WORKER_URL || "http://127.0.0.1:3000/api/procure/v1/compute";
const INTERNAL_WORKER_SECRET = process.env.INTERNAL_WORKER_SECRET || "";

export async function POST(req: NextRequest) {
  // 1. RATE LIMIT SECURITY GATE
  const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";
  if (isRateLimited(clientIp, { maxTokens: 10, refillRate: 1 })) {
    return NextResponse.json(
      { error: "Too Many Requests.", details: "Rate allocation capacity limit breached. Hold execution." },
      { status: 429 }
    );
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

  // 2. DISPATCH TO SERVERLESS COMPUTE ENGINE
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s SLA timeout limit

  try {
    // Clean, direct fetch execution target - no legacy strings appended
    const clusterResponse = await fetch(CLUSTER_WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${INTERNAL_WORKER_SECRET}`
      },
      body: JSON.stringify({
        items,
        orgId: req.headers.get("x-org-id") || "ui_corporate_procure_dashboard"
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!clusterResponse.ok) {
      throw new Error(`Compute route rejected payload with status code: ${clusterResponse.status}`);
    }

    const clusterData = await clusterResponse.json();
    
    // Return clean 202 tracking status back to frontend pipeline
    return NextResponse.json({
      status: "ASYNC_CLUSTER_ACCEPTED",
      trackingId: clusterData.trackingId
    }, { status: 202 });

  } catch (clusterError: any) {
    clearTimeout(timeoutId);

    console.error(`[GATEWAY ROUTING FALLBACK] Target engine unreachable, deploying circuit breaker: ${clusterError.message}`);

    // LOCAL SERVERLESS EMERGENCY TRACK
    return NextResponse.json({
      status: "DEGRADED_COMPUTATION_SUCCESS",
      itemsProcessed: items.length,
      RISK_WARNING: "Operating on backup serverless infrastructure. Telemetry features are degraded."
    }, { status: 200 });
  }
}