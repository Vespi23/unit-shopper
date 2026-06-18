import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
const redis = Redis.fromEnv();

export async function GET(
  req: NextRequest, 
  context: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await context.params;
  const jobId = resolvedParams.id;
  
  if (!jobId) {
    return NextResponse.json({ error: "Missing job tracking ID." }, { status: 400 });
  }

  try {
    const cachedJob = await redis.get(jobId);
    if (!cachedJob) {
      return NextResponse.json({ error: "Job context expired or not found." }, { status: 404 });
    }

    // PURE EXECUTION READ: Return state records straight to the frontend dashboard
    const jobData = typeof cachedJob === "string" ? JSON.parse(cachedJob) : cachedJob;
    return NextResponse.json(jobData, { status: 200 });

  } catch (err: any) {
    console.error(`[STATUS_READ_FAULT]: ${err.message}`);
    return NextResponse.json({ error: "Failed to read runtime status." }, { status: 500 });
  }
}