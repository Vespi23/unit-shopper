import { NextRequest, NextResponse } from "next/server";
import { redisREST } from "@/lib/redis-client"; // FIXED: Zero-dependency conversion

export const runtime = "nodejs";
const SHARED_SECURITY_TOKEN = process.env.INTERNAL_WORKER_SECRET || process.env.DECODO_AUTH_TOKEN || "LOCAL_DEV_DEFAULT_SECURE_TOKEN_9981";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const cleanToken = authHeader.replace(/^bearer\s+/i, "").trim();

  if (cleanToken !== SHARED_SECURITY_TOKEN) {
    return NextResponse.json({ error: "Unauthorized pipeline computation attempt." }, { status: 401 });
  }

  try {
    const { trackingId, payloadModification } = await req.json();
    if (!trackingId) return NextResponse.json({ error: "Missing tracking asset target." }, { status: 400 });

    // FIXED: Convert data interactions to use native loop utilities
    const rawJob = await redisREST.get(trackingId);
    if (!rawJob) return NextResponse.json({ error: "Target job allocation space resolved empty." }, { status: 444 });

    const jobData = typeof rawJob === "string" ? JSON.parse(rawJob) : rawJob;
    
    if (payloadModification) {
      jobData.items = jobData.items.map((item: any) => ({
        ...item,
        score: item.price > 0 && item.totalAmount > 0 ? item.price / item.totalAmount : item.price
      }));
      
      await redisREST.set(trackingId, JSON.stringify(jobData), { ex: 3600 });
    }

    return NextResponse.json({ success: true, trackingId, progress: jobData.progress });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}