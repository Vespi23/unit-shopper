import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // 1. DYNAMIC PARAM PROTECTION GATE: Safely handle both sync and async runtime frameworks
    const resolvedParams = "then" in context.params ? await context.params : context.params;
    const jobId = resolvedParams.id;

    if (!jobId) {
      return NextResponse.json({ error: "Missing tracking identifier resource parameter." }, { status: 400 });
    }

    // 2. FETCH FROM SERVERLESS CACHE NODE
    const cachedJob = await redis.get(jobId);

    if (!cachedJob) {
      return NextResponse.json({ 
        error: "Job signature record has expired or was not initialized.",
        status: "NOT_FOUND" 
      }, { status: 404 });
    }

    // 3. SAFE PARSE GUARD: Handle both raw strings and pre-parsed objects from Upstash
    const jobData = typeof cachedJob === "string" ? JSON.parse(cachedJob) : cachedJob;

    // Enforce that a baseline status key is explicitly guaranteed in the payload
    return NextResponse.json({
      status: jobData.status || "PROCESSING",
      progress: jobData.progress ?? 0,
      orgId: jobData.orgId || "unknown",
      totalItems: jobData.totalItems ?? 0,
      items: jobData.items || [],
      metrics: jobData.metrics || null
    }, { status: 200 });

  } catch (err: any) {
    console.error(`[TELEMETRY PROXY CRASH]: ${err.message}`);
    return NextResponse.json({ 
      error: "Failed to read data matrix from serverless cache cluster.",
      details: err.message
    }, { status: 500 });
  }
}