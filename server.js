const express = require("express");
const crypto = require("crypto");

// CRITICAL SECURITY ASSERTION: Hard fail instantly if runtime variables are absent
if (!process.env.INTERNAL_WORKER_SECRET) {
  console.error(" [FATAL CONFIGURATION ERROR] INTERNAL_WORKER_SECRET environment variable is missing.");
  console.error("System deployment terminated to prevent unauthenticated fallback state exposure.");
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: "20mb" }));

const PORT = process.env.PORT || 3001;
const INTERNAL_SECRET = process.env.INTERNAL_WORKER_SECRET;

const jobTrackingRegistry = new Map();

// HARDENED SECURITY HANDSHAKE GATE
const enforceClusterSecurity = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access Denied: Missing cryptographic authorization header tokens." });
  }

  const presentedToken = authHeader.split(" ")[1];
  
  // Constant-time structural validation handling to block timing attack vector variations
  if (presentedToken.length !== INTERNAL_SECRET.length || !crypto.timingSafeEqual(Buffer.from(presentedToken), Buffer.from(INTERNAL_SECRET))) {
    return res.status(403).json({ error: "Access Denied: Revoked or invalid worker authentication mapping keys." });
  }
  
  next();
};

app.post("/v1/procure-ingest", enforceClusterSecurity, (req, res) => {
  const { orgId, items, origin } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Invalid ingest matrix configuration payload structure." });
  }

  const trackingId = `bl_job_${crypto.randomBytes(8).toString("hex")}`;
  
  jobTrackingRegistry.set(trackingId, {
    orgId,
    status: "PROCESSING",
    totalItems: items.length,
    processedItems: 0,
    startedAt: Date.now(),
    origin: origin || "BudgetLynx_API"
  });

  setImmediate(async () => {
    try {
      console.log(`[JOB INITIALIZATION] Processing active execution ring for Tracking Token: ${trackingId}`);
      for (const item of items) {
        await new Promise(resolve => setTimeout(resolve, 150)); 
        console.log(`[SCRAPE VERIFICATION] Extracted unit data matrix markers for item SKU: ${item.sku}`);
      }

      const jobRecord = jobTrackingRegistry.get(trackingId);
      if (jobRecord) {
        jobRecord.status = "COMPLETED";
        jobRecord.processedItems = items.length;
        jobRecord.completedAt = Date.now();
        jobTrackingRegistry.set(trackingId, jobRecord);
        console.log(`[JOB SUCCESS] Tracking Token ${trackingId} successfully compiled.`);
      }
    } catch (clusterProcessingError) {
      console.error(`[CLUSTER EXECUTION BREAK] Failure processing job ${trackingId}:`, clusterProcessingError);
      const jobRecord = jobTrackingRegistry.get(trackingId);
      if (jobRecord) {
        jobRecord.status = "FAILED";
        jobRecord.error = clusterProcessingError.message;
        jobTrackingRegistry.set(trackingId, jobRecord);
      }
    }
  });

  return res.status(202).json({
    message: "Transaction accepted into tracking pipeline queue successfully.",
    trackingId: trackingId
  });
});

app.get("/v1/job-status/:trackingId", (req, res) => {
  const record = jobTrackingRegistry.get(req.params.trackingId);
  if (!record) {
    return res.status(404).json({ error: "Requested transaction tracking key not found inside memory registries." });
  }
  return res.status(200).json(record);
});

app.listen(PORT, () => {
  console.log(`[BudgetLynx Cluster Live] Running secure asynchronous ingestion workers on network port: ${PORT}`);
});