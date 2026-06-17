import { useState, useEffect, useRef } from "react";

export type JobStatus = "PROCESSING" | "COMPLETED" | "FAILED";

interface UseJobPollingOptions {
  intervalMs?: number;
  maxDurationMs?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export function useJobPolling(options?: UseJobPollingOptions) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  
  const intervalMs = options?.intervalMs || 2000;
  const maxDurationMs = options?.maxDurationMs || 90000; // Hard kill loop at 90s boundary

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startRef = useRef<number>(0);

  const stopPolling = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startPolling = (trackingId: string) => {
    // Reset state machines for fresh operational pipeline runs
    stopPolling();
    setStatus("PROCESSING");
    setProgress(0);
    setError(null);
    startRef.current = Date.now();

    const executePoll = async () => {
      // Hard Boundary Guard: Halt execution if timeout is breached
      if (Date.now() - startRef.current > maxDurationMs) {
        stopPolling();
        setStatus("FAILED");
        setError("Operation terminated: Processing threshold duration exceeded limits.");
        options?.onError?.("Processing timeout exceeded.");
        return;
      }

      try {
        const response = await fetch(`/api/procure/v1/status/${trackingId}`);
        if (!response.ok) throw new Error("Telemetry endpoint communication failure.");
        
        const data = await response.json();

        // Hydrate metrics from background worker telemetry states
        if (data.status === "COMPLETED") {
          stopPolling();
          setStatus("COMPLETED");
          setProgress(100);
          options?.onSuccess?.(data);
        } else if (data.status === "FAILED") {
          stopPolling();
          setStatus("FAILED");
          setError(data.error || "Execution terminated inside cluster processing rings.");
          options?.onError?.(data.error || "Cluster execution failure.");
        } else {
          // Keep loop alive: Calculate mock step increments if worker hasn't provided absolute metrics
          setStatus("PROCESSING");
          setProgress(data.progress || Math.min(progress + 5, 95));
          timerRef.current = setTimeout(executePoll, intervalMs);
        }
      } catch (err: any) {
        // Soft Fault Tolerant Check: Log error but sustain polling chain to wait out transient network issues
        timerRef.current = setTimeout(executePoll, intervalMs);
      }
    };

    timerRef.current = setTimeout(executePoll, intervalMs);
  };

  // Enforce structural cleanup tracking to pre-emptively kill zombie processes
  useEffect(() => {
    return () => stopPolling();
  }, []);

  return { startPolling, stopPolling, status, progress, error };
}