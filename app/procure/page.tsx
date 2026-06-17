"use client";

import React, { useState } from "react";

export default function ProcurePage() {
  const [itemsText, setItemsText] = useState(
    JSON.stringify([
      { sku: "BULK-MAT-01", retailer: "costco", quantity: 5000 },
      { sku: "BULK-MAT-02", retailer: "samsclub", quantity: 2500 }
    ], null, 2)
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const executeBulkCheck = async () => {
    setLoading(true);
    setResult(null);
    setValidationError(null);

    // CLIENT-SIDE VALIDATION SHIELD
    let parsedItems;
    try {
      parsedItems = JSON.parse(itemsText);
      if (!Array.isArray(parsedItems)) {
        throw new Error("Payload matrix must be formatted as a valid JSON array.");
      }
    } catch (err: any) {
      setValidationError(`Invalid JSON Payload: ${err.message}`);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/procure/v1/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-route-strategy": "high-velocity-cluster",
          "x-org-id": "ui_enterprise_test_client"
        },
        body: JSON.stringify({ items: parsedItems })
      });
      const data = await res.json();
      setResult({ status: res.status, data });
    } catch (err: any) {
      setResult({ status: "CLIENT_ERROR", data: { error: err.message } });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "800px", margin: "0 auto" }}>
      <h1 style={{ borderBottom: "2px solid #333", paddingBottom: "0.5rem" }}>BudgetLynx Premium Procurement Hub</h1>
      <p style={{ color: "#666" }}>High-Velocity Batch Subscription Layer for Corporate Procurement Agents</p>
      
      <div style={{ marginTop: "2rem" }}>
        <h3>1. Input Bulk Purchase Array JSON</h3>
        <textarea
          value={itemsText}
          onChange={(e) => setItemsText(e.target.value)}
          rows={10}
          style={{ 
            width: "100%", 
            fontFamily: "monospace", 
            padding: "1rem", 
            fontSize: "14px", 
            borderRadius: "4px", 
            border: validationError ? "2px solid #ff4d4f" : "1px solid #ccc" 
          }}
        />
        {validationError && (
          <p style={{ color: "#ff4d4f", marginTop: "0.5rem", fontWeight: "bold" }}>{validationError}</p>
        )}
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <button
          onClick={executeBulkCheck}
          disabled={loading}
          style={{
            backgroundColor: loading ? "#ccc" : "#0070f3",
            color: "white",
            border: "none",
            padding: "0.75rem 1.5rem",
            fontSize: "16px",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "bold"
          }}
        >
          {loading ? "Processing Calculation Batch..." : "Execute High-Velocity Batch"}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: "2rem", padding: "1rem", backgroundColor: "#f5f5f5", borderRadius: "4px", border: "1px solid #ddd" }}>
          <h3>Execution Engine Diagnostics Output</h3>
          <p><strong>HTTP Status Code:</strong> {result.status}</p>
          <pre style={{ backgroundColor: "#fff", padding: "1rem", borderRadius: "4px", overflowX: "auto", border: "1px solid #eee" }}>
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}