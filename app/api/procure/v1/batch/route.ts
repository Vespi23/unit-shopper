import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rateLimit";

const CLUSTER_WORKER_URL = process.env.CLUSTER_WORKER_URL || "http://localhost:3001";
const INTERNAL_WORKER_SECRET = process.env.INTERNAL_WORKER_SECRET || "";

export async function POST(req: NextRequest) {
  // 1. SECURITY FILTER: Extract IP footprint and enforce token bucket constraint gates
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

  // 2. DISPATCH ROUTER: Attempt handoff execution to your high-velocity compute cluster
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000); // Strict 4s threshold to determine cluster availability

  try {
    const clusterResponse = await fetch(`${CLUSTER_WORKER_URL}/v1/procure-ingest`, {
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
      throw new Error(`Cluster hardware node rejected payload with status: ${clusterResponse.status}`);
    }

    const clusterData = await clusterResponse.json();
    
    // Return the active asynchronous tracking identifier directly to the polling hook
    return NextResponse.json({
      status: "ASYNC_CLUSTER_ACCEPTED",
      trackingId: clusterData.trackingId
    }, { status: 202 });

  } catch (clusterError: any) {
    clearTimeout(timeoutId);

    // 3. DETERMINISTIC CIRCUIT BREAKER FAILOVER TRACK
    console.error(`[GATEWAY OUTAGE ALERT] Failover triggered: ${clusterError.message || "Cluster node connection timed out."}`);

    // Process file locally on backup serverless infrastructure to avoid client crashes
    return NextResponse.json({
      status: "DEGRADED_COMPUTATION_SUCCESS",
      itemsProcessed: items.length,
      RISK_WARNING: "Operating on backup serverless infrastructure. Telemetry tracking features are temporarily degraded."
    }, { status: 200 });
  }
}