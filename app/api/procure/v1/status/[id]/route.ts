import { NextRequest, NextResponse } from "next/server";
import { redisREST } from "@/lib/redis-client"; // FIXED: Zero-dependency conversion

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing tracking execution parameter." }, { status: 400 });
  }

  try {
    // FIXED: Use native REST engine lookups
    const cachedJob = await redisREST.get(id);
    
    if (!cachedJob) {
      return NextResponse.json({
        status: "NOT_FOUND",
        progress: 0,
        message: "The requested batch tracking array has expired or does not exist."
      }, { status: 404 });
    }

    const jobData = typeof cachedJob === "string" ? JSON.parse(cachedJob) : cachedJob;
    return NextResponse.json(jobData, { status: 200 });

  } catch (err: any) {
    console.error(`[STATUS_POLL_CRASH]: ${err.message}`);
    return NextResponse.json({ error: "Internal lookup breakdown." }, { status: 500 });
  }
}