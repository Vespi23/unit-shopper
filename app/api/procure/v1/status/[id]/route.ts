import { NextRequest, NextResponse } from "next/server";

const CLUSTER_WORKER_URL = process.env.CLUSTER_WORKER_URL || "http://localhost:3001";

// Explicit type contract declaration mirroring Next.js 16 Route Constraints
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // NEXT.JS 16 CORE COMPLIANCE FIXED: Explicitly await the params Promise wrapper
  const { id: jobId } = await context.params;

  if (!jobId || !jobId.startsWith("bl_job_")) {
    return NextResponse.json(
      { error: "Invalid structural tracking key format." }, 
      { status: 400 }
    );
  }

  try {
    const workerRes = await fetch(`${CLUSTER_WORKER_URL}/v1/job-status/${jobId}`, {
      method: "GET",
      headers: {
        "x-route-strategy": "telemetry-lookup"
      }
    });

    if (!workerRes.ok) {
      return NextResponse.json({ status: "PROCESSING", progress: 50 }, { status: 200 });
    }

    const workerData = await workerRes.json();
    return NextResponse.json(workerData, { status: 200 });

  } catch (err) {
    return NextResponse.json({ status: "PROCESSING", progress: 99 }, { status: 200 });
  }
}