import { NextResponse } from "next/server";

const CLUSTER_WORKER_URL = process.env.CLUSTER_WORKER_URL || "http://localhost:3001";

export async function GET() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000); // Strict 3-second network constraint SLA

  try {
    const healthRes = await fetch(`${CLUSTER_WORKER_URL}/v1/health`, {
      method: "GET",
      headers: { "Cache-Control": "no-store" },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!healthRes.ok) {
      throw new Error(`Cluster hardware returned critical status code: ${healthRes.status}`);
    }

    const healthData = await healthRes.json();

    // TRIGGER INFRASTRUCTURE ALERT MATRIX IF HEALTH DRAGS
    if (healthData.status === "DEGRADED_MEMORY_WARN") {
      console.warn(`[CIRCUIT BREAKER ALERT] Cluster memory threshold breached: ${healthData.resourceMetrics.heapUsedMB}MB used. System operating at capacity limits.`);
      return NextResponse.json({ status: "DEGRADED", actionRequired: "SCALE_UP_CONTAINERS" }, { status: 200 });
    }

    return NextResponse.json({
      status: "OPERATIONAL",
      clusterUptime: healthData.uptimeSeconds,
      activeJobs: healthData.activeRegistryJobs
    }, { status: 200 });

  } catch (err: any) {
    clearTimeout(timeoutId);
    
    // FATAL CIRCUIT BREAKER ALERTS
    console.error(`[CRITICAL SHUTDOWN] Cluster unreachable: ${err.message}. Routing emergency traffic exclusively to serverless failover zones.`);
    
    return NextResponse.json(
      { error: "Primary Compute Node Unreachable", failoverEngaged: true }, 
      { status: 502 }
    );
  }
}