"use client";

import React, { useState, useEffect } from "react";

interface AuditRow {
  sku: string;
  retailer: string;
  quantity: number;
  unitCostDelta: number;
  recommendedSource: string;
  status: "STABLE" | "OPTIMIZED" | "ALERT";
}

interface JobMetrics {
  totalItemsProcessed: number;
  projectedSavings: number;
  shrinkflationAlerts: number;
  optimizedRoutesCount: number;
}

export default function ProcurementDashboard() {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  
  // Dashboard Metrics Core State
  const [metrics, setMetrics] = useState<JobMetrics>({
    totalItemsProcessed: 0,
    projectedSavings: 0,
    shrinkflationAlerts: 0,
    optimizedRoutesCount: 0
  });
  const [auditLedger, setAuditLedger] = useState<AuditRow[]>([]);

  // Telemetry Polling Loop
  useEffect(() => {
    if (!trackingId || jobStatus === "COMPLETED") return;

    let isSubscribed = true;
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/procure/v1/status/${trackingId}`);
        if (!response.ok) throw new Error("Status endpoint drop out.");
        
        const data = await response.json();
        
        if (isSubscribed) {
          setProgress(data.progress || 0);
          setJobStatus(data.status);
          
          if (data.status === "COMPLETED") {
            setAuditLedger(data.items || []);
            if (data.metrics) {
              setMetrics(data.metrics);
            }
            clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.error("[POLLING_ERROR]:", err);
      }
    }, 2000); // Poll tracking data matrix every 2000ms

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
    };
  }, [trackingId, jobStatus]);

  // Clean Resilient Client-Side Parsing Engine
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l !== "");
        
        if (lines.length < 2) {
          throw new Error("Empty manifest data matrix file payload.");
        }

        // Normalize header text directly to lowercase
        const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
        const skuIndex = headers.findIndex(h => h === "sku" || h === "asin");
        const qtyIndex = headers.findIndex(h => h === "quantity" || h === "qty");

        if (skuIndex === -1 || qtyIndex === -1) {
          throw new Error("Unable to map data fields. Ensure CSV contains columns for 'SKU' (or 'asin') and 'Quantity'.");
        }

        const standardizedItems = lines.slice(1).map((line) => {
          const columns = line.split(",").map(c => c.trim());
          if (columns.length <= Math.max(skuIndex, qtyIndex)) return null;
          
          return {
            sku: columns[skuIndex],
            quantity: parseInt(columns[qtyIndex], 10) || 1,
            retailer: "Amazon.com"
          };
        }).filter(Boolean);

        // Submit Clean Matrix Array to Gateway Ingress
        const gatewayResponse = await fetch("/api/procure/v1/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: standardizedItems })
        });

        if (!gatewayResponse.ok) {
          const errorPayload = await gatewayResponse.json();
          throw new Error(errorPayload.error || "Gateway gateway ingress rejected matrix data.");
        }

        const initialTrackingData = await gatewayResponse.json();
        setTrackingId(initialTrackingData.trackingId);
        setJobStatus("PROCESSING");
        setProgress(30);

      } catch (err: any) {
        setErrorMessage(err.message);
      } finally {
        setIsUploading(false);
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-slate-900 text-slate-100 min-h-screen font-mono">
      {/* Header Layer */}
      <header className="mb-8 border-b border-slate-800 pb-6">
        <h1 className="text-2xl font-bold tracking-tight uppercase text-emerald-400">Corporate Arbitrage Engine Live</h1>
        <p className="text-sm text-slate-400 mt-1">BudgetLynx Corporate Procurement Hub</p>
        <p className="text-xs text-slate-500">Audit multi-vendor inventory manifests down to unit-metrics automatically.</p>
      </header>

      {/* Control Interface Panel */}
      <div className="mb-8 p-6 bg-slate-950 border border-slate-800 rounded-sm">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Upload Inventory Sheet (.CSV)</label>
        <input 
          type="file" 
          accept=".csv" 
          onChange={handleFileUpload}
          disabled={isUploading || (jobStatus === "PROCESSING" && progress < 100)}
          className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-xs file:font-bold file:uppercase file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 cursor-pointer disabled:opacity-50"
        />
        {isUploading && <p className="text-xs text-amber-400 mt-2 animate-pulse">Analyzing matrix parameters...</p>}
        {errorMessage && <p className="text-xs text-rose-500 mt-2 font-bold">Error: {errorMessage}</p>}
        
        {jobStatus === "PROCESSING" && (
          <div className="mt-4 w-full bg-slate-800 h-2 rounded-sm overflow-hidden">
            <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>
        )}
      </div>

      {/* Upper Data Metrics Panel Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-sm">
          <div className="text-xs text-slate-400 uppercase font-bold">Projected Cost Run Retained</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">${metrics.projectedSavings.toFixed(2)}</div>
        </div>
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-sm">
          <div className="text-xs text-slate-400 uppercase font-bold">Shrinkflation Risks Intercepted</div>
          <div className="text-xl font-bold text-rose-400 mt-1">{metrics.shrinkflationAlerts}</div>
        </div>
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-sm">
          <div className="text-xs text-slate-400 uppercase font-bold">Optimized Logistics Routing</div>
          <div className="text-xl font-bold text-sky-400 mt-1">{metrics.optimizedRoutesCount} SKUs</div>
        </div>
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-sm">
          <div className="text-xs text-slate-400 uppercase font-bold">Total Line Items Monitored</div>
          <div className="text-xl font-bold text-slate-200 mt-1">{metrics.totalItemsProcessed}</div>
        </div>
      </div>

      {/* Lower Data Audit Table Layer */}
      <div className="bg-slate-950 border border-slate-800 rounded-sm overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-900">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Real-Time Ingest Audit Ledger</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
                <th className="p-3 uppercase tracking-wider font-bold">SKU Identity Token</th>
                <th className="p-3 uppercase tracking-wider font-bold">Volume Requested</th>
                <th className="p-3 uppercase tracking-wider font-bold">Current Active Channel</th>
                <th className="p-3 uppercase tracking-wider font-bold">Unit Margin Variance</th>
                <th className="p-3 uppercase tracking-wider font-bold">Optimized Routing Vector</th>
              </tr>
            </thead>
            <tbody>
              {auditLedger.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-600 uppercase tracking-wide">No active data parsed. Run CSV file upload loop.</td>
                </tr>
              ) : (
                auditLedger.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-850 hover:bg-slate-900/30 transition-colors">
                    <td className="p-3 font-bold text-slate-300">{row.sku}</td>
                    <td className="p-3 text-slate-400">{row.quantity} units</td>
                    <td className="p-3 text-slate-500 uppercase">{row.retailer}</td>
                    <td className={`p-3 font-bold ${
                      row.status === "ALERT" ? "text-rose-400" : row.status === "OPTIMIZED" ? "text-emerald-400" : "text-slate-400"
                    }`}>
                      {row.status === "ALERT" ? `Volatility Detected` : row.status === "OPTIMIZED" ? `+ ${(row.unitCostDelta * 100).toFixed(1)}% Yield` : "Stable Cost Basis"}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-xs font-bold tracking-wider text-[10px] uppercase ${
                        row.status === "ALERT" ? "bg-rose-950 text-rose-300 border border-rose-800" : row.status === "OPTIMIZED" ? "bg-sky-950 text-sky-300 border border-sky-800" : "bg-slate-800 text-slate-400"
                      }`}>
                        ROUTE TO {row.recommendedSource.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}