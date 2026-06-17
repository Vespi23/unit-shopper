"use client";

import React, { useState } from "react";
import { useJobPolling } from "@/hooks/useJobPolling";

type DashboardState = "IDLE" | "UPLOADING" | "PROCESSING" | "SUCCESS" | "ERROR";

export default function ProcurementDashboard() {
  const [uiState, setUiState] = useState<DashboardState>("IDLE");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processedCount, setProcessedCount] = useState<number>(0);

  const { startPolling, progress, error: pollingError } = useJobPolling({
    onSuccess: (data) => {
      setUiState("SUCCESS");
      setProcessedCount(data.processedItems || 0);
    },
    onError: (err) => {
      setUiState("ERROR");
      setErrorMessage(err);
    }
  });

  const handleFileUploadMock = async () => {
    setUiState("UPLOADING");
    setErrorMessage(null);

    try {
      // FIXED SYNTAX: Using strict colons (:) for valid object property assignments
      const response = await fetch("/api/procure/v1/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            { sku: "COSTCO-9910", retailer: "costco", quantity: 10 },
            { sku: "AMZN-2214", retailer: "amazon", quantity: 5 }
          ]
        })
      });

      if (!response.ok) throw new Error("Gateway submission failed.");
      
      const data = await response.json();

      if (data.status === "ASYNC_CLUSTER_ACCEPTED") {
        setUiState("PROCESSING");
        startPolling(data.trackingId);
      } else if (data.status === "DEGRADED_COMPUTATION_SUCCESS") {
        setUiState("SUCCESS");
        setProcessedCount(data.itemsProcessed || 0);
      }
    } catch (err: any) {
      setUiState("ERROR");
      setErrorMessage(err.message || "An unexpected system error occurred.");
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: "600px", fontFamily: "sans-serif" }}>
      <h2 style={{ fontWeight: "bold", fontSize: "20px", marginBottom: "16px" }}>
        BudgetLynx Processing Center
      </h2>

      {uiState === "IDLE" && (
        <button
          onClick={handleFileUploadMock}
          style={{ padding: "10px 16px", backgroundColor: "#0070f3", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
        >
          Upload Procurement Matrix
        </button>
      )}

      {uiState === "UPLOADING" && <p style={{ color: "#666" }}>Ingesting matrix spreadsheet layers...</p>}

      {uiState === "PROCESSING" && (
        <div style={{ marginTop: "16px" }}>
          <p style={{ fontWeight: "500", color: "#333" }}>Scraping Retailer Asset Nodes...</p>
          <div style={{ width: "100%", backgroundColor: "#eaeaea", borderRadius: "8px", height: "12px", marginTop: "8px", overflow: "hidden" }}>
            <div 
              style={{ width: `${progress}%`, backgroundColor: "#0070f3", height: "100%", transition: "width 0.3s ease-in-out" }} 
            />
          </div>
          <p style={{ fontSize: "14px", color: "#666", marginTop: "4px" }}>{progress}% Compiled</p>
        </div>
      )}

      {uiState === "SUCCESS" && (
        <div style={{ padding: "16px", backgroundColor: "#e6f6ff", borderRadius: "4px", border: "1px solid #b3dbff" }}>
          <p style={{ color: "#0070f3", fontWeight: "bold" }}>✔ Matrix Execution Complete</p>
          <p style={{ fontSize: "14px", color: "#333", marginTop: "4px" }}>
            Successfully extracted data points for {processedCount} items.
          </p>
          <button 
            onClick={() => setUiState("IDLE")} 
            style={{ marginTop: "12px", fontSize: "14px", color: "#0070f3", background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline" }}
          >
            Process another file
          </button>
        </div>
      )}

      {uiState === "ERROR" && (
        <div style={{ padding: "16px", backgroundColor: "#fff5f5", borderRadius: "4px", border: "1px solid #ffe3e3" }}>
          <p style={{ color: "#ff0000", fontWeight: "bold" }}>✕ Pipeline Error Detected</p>
          <p style={{ fontSize: "14px", color: "#666", marginTop: "4px" }}>{errorMessage || pollingError}</p>
          <button
            onClick={handleFileUploadMock}
            style={{ marginTop: "12px", padding: "6px 12px", backgroundColor: "#ff0000", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
          >
            Retry Execution
          </button>
        </div>
      )}
    </div>
  );
}