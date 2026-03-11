import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import { useEffect, useState } from "react"

export const config: PlasmoCSConfig = {
  matches: ["https://*.amazon.com/s*"],
  all_frames: false,
  run_at: "document_idle"
}

// Force Plasmo to mount this component's shadow DOM directly to the body
export const getOverlayAnchor = async () => document.body

// Ensure the absolute Shadow DOM boundary has max z-index and doesn't block underlying page clicks
export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = `
    :host {
      z-index: 2147483647 !important;
      position: relative;
    }
    #plasmo-shadow-container {
      z-index: 2147483647 !important;
    }
  `
  return style
}

const BudgetLynxOverlay = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchUrl, setSearchUrl] = useState("")

  useEffect(() => {
    console.log("[BudgetLynx] Overlay content script mounted!", window.location.href)
    
    // Listen for extension icon click messages to reopen the overlay
    const messageListener = (request: any, sender: any, sendResponse: any) => {
      if (request.action === "open_budgetlynx_overlay") {
        setIsOpen(true)
        sendResponse({ status: "opened" })
      }
    }
    chrome.runtime.onMessage.addListener(messageListener)

    // Poll for URL changes to handle Amazon's Single Page App navigations
    let lastQuery = ""
    
    const checkUrl = () => {
      const url = new URL(window.location.href)
      const query = url.searchParams.get("k")
      
      if (query && query !== lastQuery) {
        lastQuery = query
        console.log("[BudgetLynx] Search Query found:", query)
        console.log("[BudgetLynx] Setting timer for overlay...")
        
        // Small delay before auto-opening so it feels deliberate
        setTimeout(() => {
          const blUrl = new URL("https://budgetlynx.com/")
          blUrl.searchParams.set("q", query)
          blUrl.searchParams.set("utm_source", "chrome_extension")
          setSearchUrl(blUrl.toString())
          setIsOpen(true)
          console.log("[BudgetLynx] Overlay opened with URL:", blUrl.toString())
        }, 800)
      }
    }

    checkUrl()
    const interval = setInterval(checkUrl, 1000)
    
    return () => {
      clearInterval(interval)
      chrome.runtime.onMessage.removeListener(messageListener)
    }
  }, [])

  if (!isOpen || !searchUrl) return null

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "90vw",
        maxWidth: "1350px",
        height: "85vh",
        backgroundColor: "#fff",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 9999px rgba(0,0,0,0.5)",
        borderRadius: "16px",
        overflow: "hidden",
        zIndex: 2147483647, // Max z-index
        display: "flex",
        flexDirection: "column",
        fontFamily: "system-ui, -apple-system, sans-serif",
        animation: "fadeInScale 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        opacity: 0 // Starting opacity for animation
      }}>
      
      {/* Header / Grab Bar */}
      <div 
        style={{
          backgroundColor: "#137333",
          padding: "12px 20px",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(0,0,0,0.15)"
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="22px" height="22px">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
          <span style={{ fontSize: "16px", fontWeight: "bold", letterSpacing: "0.2px" }}>Lynx Vision Deals</span>
        </div>
        
        {/* Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "50%",
            color: "white",
            cursor: "pointer",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.3)"; e.currentTarget.style.transform = "scale(1.05)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; e.currentTarget.style.transform = "scale(1)"; }}
          aria-label="Close BudgetLynx Overlay">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Iframe Content */}
      <div style={{ flex: 1, position: "relative", backgroundColor: "#f9fafb" }}>
        <iframe
          src={searchUrl}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            border: "none",
            backgroundColor: "transparent"
          }}
          title="BudgetLynx Deals"
        />
      </div>
      
      {/* Inject animation keyframes right into the component using a raw style block for simplicity */}
      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: translate(-50%, -46%) scale(0.97); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  )
}

export default BudgetLynxOverlay
