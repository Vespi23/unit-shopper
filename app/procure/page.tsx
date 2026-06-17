"use client";

import React, { useState, useRef } from "react";
import { useJobPolling } from "@/hooks/useJobPolling";

interface AuditMetricSummary {
  totalItemsProcessed: number;
  projectedSavings: number;
  shrinkflationAlerts: number;
  optimizedRoutesCount: number;
}

interface AnalyzedRow {
  sku: string;
  retailer: string;
  quantity: number;
  unitCostDelta: number;
  recommendedSource: string;
  status: "OPTIMIZED" | "ALERT" | "STABLE";
}

type UIState = "IDLE" | "UPLOADING" | "PROCESSING" | "SUCCESS" | "ERROR";

export default function ProcurePage() {
  const [uiState, setUiState] = useState<UIState>("IDLE");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<AuditMetricSummary | null>(null);
  const [auditLedger, setAuditLedger] = useState<AnalyzedRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // REAL DATA COMPLIANCE: Polling updates now pull directly from the server-side calculations
  const { startPolling, progress, error: pollingError } = useJobPolling({
    onSuccess: (clusterData) => {
      // Direct asset extraction without client-side mock interference
      setMetrics(clusterData.metrics || null);
      setAuditLedger(clusterData.items || []);
      setUiState("SUCCESS");
    },
    onError: (errMessage) => {
      setUploadError(errMessage || "Background worker cluster encountered an error processing the batch matrix.");
      setUiState("ERROR");
    }
  });

  // Client-Side CSV Parser Engine (Heuristic Binding)
  const processCSVData = (csvText: string) => {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) throw new Error("Spreadsheet contains insufficient row depth data.");

    const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
    
    const skuIdx = headers.findIndex(h => h.includes("sku") || h.includes("item") || h.includes("part"));
    const retailerIdx = headers.findIndex(h => h.includes("retailer") || h.includes("vendor") || h.includes("source"));
    const qtyIdx = headers.findIndex(h => h.includes("qty") || h.includes("quantity") || h.includes("count"));

    if (skuIdx === -1 || qtyIdx === -1) {
      throw new Error("Unable to map data fields. Ensure CSV contains columns for 'SKU' and 'Quantity'.");
    }

    const items: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const columns = lines[i].split(",");
      
      items.push({
        sku: columns[skuIdx]?.trim() || `UNKNOWN-${i}`,
        retailer: retailerIdx !== -1 ? columns[retailerIdx]?.trim() : "market_pool",
        quantity: parseInt(columns[qtyIdx]?.trim(), 10) || 1
      });
    }
    return items;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUiState("UPLOADING");
    setUploadError(null);
    setMetrics(null);
    setAuditLedger([]);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsedItems = processCSVData(text);

        const res = await fetch("/api/procure/v1/batch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-route-strategy": "high-velocity-cluster",
            "x-org-id": "ui_corporate_procure_dashboard"
          },
          body: JSON.stringify({ items: parsedItems })
        });

        if (!res.ok) throw new Error(`Gateway returned server tracking status: ${res.status}`);
        const responseData = await res.json();

        if (responseData.status === "ASYNC_CLUSTER_ACCEPTED") {
          setUiState("PROCESSING");
          startPolling(responseData.trackingId);
        } else if (responseData.status === "DEGRADED_COMPUTATION_SUCCESS") {
          // Fallback UI Notice: Warns that local simulation was triggered due to server offline state
          setUploadError("Notice: Distributed cluster is offline. Operating under local emergency failover routing constraints.");
          setUiState("ERROR");
        } else {
          throw new Error("Unknown gateway transmission fingerprint encountered.");
        }

      } catch (err: any) {
        setUploadError(err.message || "An unexpected error disrupted data ingestion mapping loops.");
        setUiState("ERROR");
      }
    };
    reader.readAsText(file);
  };

  const isLoading = uiState === "UPLOADING" || uiState === "PROCESSING";

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* DASHBOARD CONSOLE HEADER */}
        <header className="bg-slate-800 rounded-xl p-8 border border-slate-700 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
              Corporate Arbitrage Engine Live
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight">BudgetLynx Corporate Procurement Hub</h1>
            <p className="text-sm text-slate-400 mt-1">Audit multi-vendor inventory manifests down to unit-metrics automatically.</p>
          </div>
          <div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold shadow-md transition duration-150 disabled:bg-slate-700 disabled:cursor-not-allowed"
            >
              {uiState === "UPLOADING" && "Ingesting Spreadsheet..."}
              {uiState === "PROCESSING" && `Processing Cluster (${progress}%)`}
              {uiState !== "UPLOADING" && uiState !== "PROCESSING" && "Upload Inventory Sheet (.CSV)"}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".csv" 
              className="hidden" 
            />
          </div>
        </header>

        {/* REAL-TIME CLUSTER PROGRESS BAR TRACKER */}
        {uiState === "PROCESSING" && (
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm space-y-3">
            <div className="flex justify-between items-center text-sm font-semibold">
              <span className="text-blue-400 animate-pulse">Running Server Analytical Compute Pipeline...</span>
              <span className="text-slate-300">{progress}% Compiled</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-3 border border-slate-700 overflow-hidden">
              <div 
                className="bg-blue-500 h-full transition-all duration-300 ease-in-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {(uploadError || pollingError) && (
          <div role="alert" className="p-4 bg-red-950/40 border border-red-900/50 rounded-lg text-red-400 font-medium text-sm flex items-center space-x-2">
            <span>⚠️</span>
            <span>{uploadError || pollingError}</span>
          </div>
        )}

        {/* ENTERPRISE KPI READOUT BLOCKS */}
        {metrics && uiState === "SUCCESS" && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-label="KPI Performance Matrix">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Projected Cost Run Retained</p>
              <p className="text-3xl font-black text-emerald-400 mt-2">${metrics.projectedSavings.toLocaleString()}</p>
            </div>
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Shrinkflation Risks Intercepted</p>
              <p className="text-3xl font-black text-rose-400 mt-2">{metrics.shrinkflationAlerts}</p>
            </div>
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Optimized Logistics Routing</p>
              <p className="text-3xl font-black text-blue-400 mt-2">{metrics.optimizedRoutesCount} SKUs</p>
            </div>
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Line Items Monitored</p>
              <p className="text-3xl font-black text-white mt-2">{metrics.totalItemsProcessed}</p>
            </div>
          </section>
        )}

        {/* ARBITRAGE SYSTEM ANALYSIS LEDGER */}
        {auditLedger.length > 0 && uiState === "SUCCESS" && (
          <section className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-lg font-bold">Real-Time Ingest Audit Ledger</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-700">
                    <th className="p-4">SKU Identity Token</th>
                    <th className="p-4">Volume Requested</th>
                    <th className="p-4">Current Active Channel</th>
                    <th className="p-4">Unit Margin Variance</th>
                    <th className="p-4">Optimized Routing Vector</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {auditLedger.map((row, index) => (
                    <tr key={index} className="hover:bg-slate-700/30 transition duration-75">
                      <td className="p-4 font-mono font-medium text-slate-200">{row.sku}</td>
                      <td className="p-4 text-slate-300">{row.quantity.toLocaleString()} units</td>
                      <td className="p-4 text-slate-400">{row.retailer}</td>
                      <td className={`p-4 font-semibold ${
                        row.status === "ALERT" ? "text-rose-400" : row.status === "OPTIMIZED" ? "text-emerald-400" : "text-slate-300"
                      }`}>
                        {row.status === "ALERT" 
                          ? `Shrinkflation Flag (${(row.unitCostDelta * 100).toFixed(1)}%)` 
                          : row.status === "OPTIMIZED" 
                            ? `+ ${(row.unitCostDelta * 100).toFixed(1)}% Yield` 
                            : "Stable Cost Basis"}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-bold ${
                          row.status === "ALERT" 
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                            : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        }`}>
                          {row.status === "ALERT" ? "HALT PROCUREMENT" : `ROUTE TO ${row.recommendedSource.toUpperCase()}`}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}