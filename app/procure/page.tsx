"use client";

import React, { useState } from "react";

// Explicit Domain Contract Types
interface VolumePayloadItem {
  sku: string;
  retailer: string;
  quantity: number;
}

interface ApiResponsePayload {
  status: string;
  trackingId?: string;
  mode?: string;
  itemsProcessed?: number;
  error?: string;
  details?: string;
  RISK_WARNING?: string;
}

export default function ProcurePage() {
  const [itemsText, setItemsText] = useState<string>(
    JSON.stringify([
      { sku: "BULK-MAT-01", retailer: "costco", quantity: 5000 },
      { sku: "BULK-MAT-02", retailer: "samsclub", quantity: 2500 }
    ], null, 2)
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<{ status: number | string; data: ApiResponsePayload } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleBatchExecution = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setValidationError(null);

    let parsedItems: VolumePayloadItem[];
    try {
      parsedItems = JSON.parse(itemsText);
      if (!Array.isArray(parsedItems)) {
        throw new Error("Payload matrix roots must be formatted as a valid JSON array.");
      }
    } catch (err: any) {
      setValidationError(`Syntactic Parsing Warning: ${err.message}`);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/procure/v1/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-route-strategy": "high-velocity-cluster",
          "x-org-id": "ui_enterprise_premium_client"
        },
        body: JSON.stringify({ items: parsedItems })
      });
      const data: ApiResponsePayload = await res.json();
      setResult({ status: res.status, data });
    } catch (err: any) {
      setResult({ status: "CLIENT_EXECUTION_ERROR", data: { error: err.message, status: "FAILED" } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* SEMANTIC HEADER CONFIGURATION */}
        <header className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="space-y-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              Enterprise B2B Tier
            </span>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Premium Procurement Hub
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              High-Velocity Batch Subscription Layer & Calculation Management Matrix
            </p>
          </div>
        </header>

        {/* INTERACTIVE FORM WORKSPACE */}
        <section className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <form onSubmit={handleBatchExecution} className="space-y-6">
            <div className="flex flex-col space-y-2">
              <label 
                htmlFor="batch-json" 
                className="text-sm font-semibold text-slate-700 dark:text-slate-300"
              >
                1. Inventory Batch Manifest (JSON Array Array Matrix)
              </label>
              <textarea
                id="batch-json"
                name="batch-json"
                value={itemsText}
                onChange={(e) => setItemsText(e.target.value)}
                rows={12}
                disabled={loading}
                className={`w-full font-mono text-sm p-4 rounded-lg border bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-100 ${
                  validationError 
                    ? "border-red-500 focus:ring-red-500" 
                    : "border-slate-300 dark:border-slate-600"
                }`}
                placeholder="[ { 'sku': 'ID', 'retailer': 'target', 'quantity': 100 } ]"
              />
              {validationError && (
                <div role="alert" className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 flex items-center space-x-1">
                  <span>⚠️</span>
                  <span>{validationError}</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150 ${
                  loading 
                    ? "bg-slate-400 dark:bg-slate-600 cursor-not-allowed" 
                    : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                }`}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Staging Batch Worker Dispatch...</span>
                  </div>
                ) : (
                  "Execute High-Velocity Batch"
                )}
              </button>
            </div>
          </form>
        </section>

        {/* TELEMETRY DIAGNOSTICS LAYER */}
        {result && (
          <section 
            aria-live="polite" 
            className={`rounded-xl p-6 shadow-sm border transition-all duration-300 ${
              result.data.error 
                ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50" 
                : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Execution Diagnostics Terminal
                </h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  result.status === 200 
                    ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200" 
                    : "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                }`}>
                  HTTP {result.status}
                </span>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Transaction Token Identity: <code className="font-mono text-xs bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">{result.data.trackingId || "N/A"}</code>
                </p>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Execution State Mode: <span className="font-semibold text-slate-800 dark:text-slate-200">{result.data.mode || "SYNC_DIRECT"}</span>
                </p>
              </div>

              <pre className="p-4 bg-slate-900 dark:bg-black rounded-lg text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-950 max-h-64 shadow-inner">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          </section>
        )}
        
      </div>
    </main>
  );
}