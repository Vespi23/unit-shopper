

function IndexPopup() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        padding: 16,
        width: 300,
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
      <div style={{ backgroundColor: "#f8f9fa", padding: "12px", borderRadius: "8px", fontSize: "13px" }}>
        <p style={{ margin: "0 0 8px 0" }}>
          <strong>How to use:</strong>
        </p>
        <ol style={{ margin: 0, paddingLeft: "20px", color: "#444" }}>
          <li>Navigate to any Amazon product page.</li>
          <li>Look for the green <strong>Lynx Vision</strong> badge under the product price.</li>
          <li>It automatically calculates the unit price for you!</li>
        </ol>
      </div>
    </div>
  )
}

export default IndexPopup
