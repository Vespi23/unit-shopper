import { NextRequest, NextResponse } from "next/server";
import { ProcureOrgSchema } from "@/lib/procure/schema";

interface VolumePayloadItem {
  sku: string;
  retailer: string;
  quantity: number;
}

export async function POST(request: NextRequest) {
  // Read injection context headers provided by tracking middleware
  const strategy = request.headers.get("x-route-strategy");
  const orgId = request.headers.get("x-org-id");
  
  const body = await request.json().catch(() => ({}));
  const items: VolumePayloadItem[] = body.items || [];

  // STANDARD PATH: Safe fallback / Restriction implementation
  if (strategy !== "high-velocity-cluster") {
    if (items.length > 50) {
      return NextResponse.json({
        error: "Payload size limit exceeded for standard pipeline processing.",
        "RISK_WARNING": "Direct execution blocks above 50 items risk engine timeouts. Use an Enterprise Token."
      }, { status: 403 });
    }
    
    // Synchronous execution fallback processing loop for small operations
    return NextResponse.json({ status: "SUCCESS", processed: items.length, mode: "STANDARD_SYNC" });
  }

  // FORCE-THROUGH WORKAROUND: Direct-to-Worker execution block bypasses Next.js function constraints
  try {
    const queuePayload = {
      orgId,
      items,
      origin: "BudgetLynx_Procure_Engine",
      timestamp: Date.now()
    };

    // Shunt directly to internal processing queue clusters
    const queueResponse = await fetch("https://workers.budgetlynx.com/v1/procure-ingest", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.INTERNAL_WORKER_SECRET}`
      },
      body: JSON.stringify(queuePayload)
    }).then(res => res.json());

    // Record consumption tokens inside usage recorder asynchronously 
    fetch("https://api.budgetlynx.com/internal/v1/usage-track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId, operationalUnits: items.length })
    }).catch(err => console.error("[METRIC DROP WARNING]:", err));

    return NextResponse.json({
      status: "QUEUED",
      trackingId: queueResponse.trackingId,
      allocatedWorker: queueResponse.workerNode,
      etaMs: Math.ceil(items.length * 12)
    }, { status: 202 });

  } catch (err: any) {
    return NextResponse.json({
      error: "Internal Processing Bridge Inoperable",
      details: err.message,
      remediation: "Execute direct sharding to secondary cluster targets or trigger queue retries."
    }, { status: 500 });
  }
}