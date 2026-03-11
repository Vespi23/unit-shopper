function IndexPopup() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 16,
        width: 320,
        fontFamily: "system-ui, sans-serif"
      }}>
      <h2 style={{ margin: "0 0 8px 0", color: "#137333", display: "flex", alignItems: "center", gap: "8px" }}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="#137333"
          width="20px"
          height="20px"
          style={{ flexShrink: 0 }}
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
        </svg>
        Lynx Vision
      </h2>
      <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#555" }}>
        The Lynx Vision extension is active!
      </p>
      <div style={{ backgroundColor: "#f8f9fa", border: "1px solid #e5e7eb", padding: "12px", borderRadius: "8px", fontSize: "13px" }}>
        <p style={{ margin: "0 0 8px 0", color: "#1f2937", fontWeight: 600 }}>
          How it works:
        </p>
        <ol style={{ margin: 0, paddingLeft: "20px", color: "#4b5563", display: "flex", flexDirection: "column", gap: "6px" }}>
          <li>Navigate to any Amazon search page.</li>
          <li>Look for the auto-opening <strong>BudgetLynx</strong> panel on the right side of the screen.</li>
          <li>See real alternatives and instantly compare unit prices!</li>
        </ol>
      </div>

      <button
        onClick={async () => {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
          if (tabs.length > 0 && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: "open_budgetlynx_overlay" }, () => {
              // Optionally close the popup after sending
              window.close()
            })
          }
        }}
        style={{
          marginTop: "16px",
          padding: "10px 16px",
          backgroundColor: "#137333",
          color: "white",
          border: "none",
          borderRadius: "6px",
          fontSize: "14px",
          fontWeight: "bold",
          cursor: "pointer",
          textAlign: "center",
          transition: "background-color 0.2s"
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#0d5224" }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#137333" }}
      >
        Reopen Deals Overlay
      </button>
    </div>
  )
}

export default IndexPopup
