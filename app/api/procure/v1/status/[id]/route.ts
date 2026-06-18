import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const runtime = "nodejs";
const redis = Redis.fromEnv();
const DECODO_AUTH_TOKEN = process.env.DECODO_AUTH_TOKEN || "";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const jobId = params.id;
  if (!jobId) return NextResponse.json({ error: "Missing job tracking ID." }, { status: 400 });

  try {
    const cachedJob = await redis.get(jobId);
    if (!cachedJob) return NextResponse.json({ error: "Job context expired or not found." }, { status: 404 });

    const jobData = typeof cachedJob === "string" ? JSON.parse(cachedJob) : cachedJob;

    // IF JOB IS ALREADY DONE, RETURN DATA IMMEDIATELY TO FREE UP THREADS
    if (jobData.status === "COMPLETED") {
      return NextResponse.json(jobData, { status: 200 });
    }

    // JUST-IN-TIME EXTRACTION POOL
    if (jobData.status === "PROCESSING" && Array.isArray(jobData.pendingTasks)) {
      console.log(`[JIT_POLL_TICK]: Checking Decodo worker queue status for job ${jobId}`);
      
      let calculatedSavings = 0;
      let alertTriggers = 0;
      let updatedItems = [...jobData.items];

      // Poll Decodo for every pending SKU concurrently during this user request tick
      const trackingResolutions = await Promise.all(
        jobData.pendingTasks.map(async (task: any) => {
          try {
            const res = await fetch(`https://scraper-api.decodo.com/v3/task/${task.taskId}`, {
              method: "GET",
              headers: { "Authorization": `Bearer ${DECODO_AUTH_TOKEN}` }
            });
            if (!res.ok) return task; // Keep in queue if request fails
            
            const taskState = await res.json();
            const currentStatus = String(taskState.status).toLowerCase();

            if (currentStatus === "completed" || currentStatus === "success") {
              const payload = taskState.data || taskState.result || taskState;
              
              const liveRetailPrice = parseFloat(payload.price || payload.amazon_price || payload.ecommerce_data?.price);
              const liveWholesalePrice = parseFloat(payload.wholesale_price || payload.business_price || payload.ecommerce_data?.wholesale_price);

              let delta = 0.0000;
              let recommendedSource = "AMAZON_RETAIL";
              let itemStatus: "STABLE" | "OPTIMIZED" | "ALERT" = "STABLE";

              if (!isNaN(liveRetailPrice) && !isNaN(liveWholesalePrice) && liveRetailPrice > 0) {
                delta = (liveRetailPrice - liveWholesalePrice) / liveRetailPrice;
                if (delta > 0.05) {
                  itemStatus = "OPTIMIZED";
                  recommendedSource = "AMAZON_BUSINESS_BULK";
                  calculatedSavings += (liveRetailPrice - liveWholesalePrice) * task.quantity;
                }
              }

              // Update item data
              const index = updatedItems.findIndex((i: any) => i.sku === task.sku);
              if (index !== -1) {
                updatedItems[index] = {
                  sku: task.sku,
                  retailer: "Amazon.com",
                  quantity: task.quantity,
                  unitCostDelta: parseFloat(delta.toFixed(4)),
                  recommendedSource: recommendedSource,
                  status: itemStatus
                };
              }
              return null; // Successfully processed, remove from pending
            }
            return task; // Still processing inside Decodo
          } catch (_) {
            return task;
          }
        })
      );

      const remainingTasks = trackingResolutions.filter(Boolean);
      
      // Update overall metrics context
      jobData.items = updatedItems;
      jobData.pendingTasks = remainingTasks;
      jobData.metrics.projectedSavings += calculatedSavings;

      if (remainingTasks.length === 0) {
        jobData.status = "COMPLETED";
        jobData.progress = 100;
        jobData.metrics.optimizedRoutesCount = updatedItems.filter((r: any) => r.status === "OPTIMIZED").length;
        console.log(`[JOB_SUCCESS]: All Decodo task items resolved for ${jobId}. State set to COMPLETED.`);
      } else {
        const completedCount = jobData.totalItems - remainingTasks.length;
        jobData.progress = Math.min(95, Math.floor((completedCount / jobData.totalItems) * 100));
      }

      // Commit changes back to Upstash
      await redis.set(jobId, JSON.stringify(jobData), { ex: 1800 });
    }

    return NextResponse.json(jobData, { status: 200 });

  } catch (err: any) {
    console.error(`[STATUS_CRITICAL_FAULT]: ${err.message}`);
    return NextResponse.json({ error: "Failed to poll runtime status." }, { status: 500 });
  }
}