import type { PlasmoCSConfig, PlasmoGetStyle } from "plasmo"
import { useEffect, useState } from "react"

import logoUrl from "data-base64:~assets/icon.png"

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
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255, 255, 255, 0.5)",
        boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 0.4), 0 0 0 9999px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.2) inset",
        borderRadius: "24px",
        overflow: "hidden",
        zIndex: 2147483647, // Max z-index
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        animation: "springScale 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards",
        opacity: 0 // Starting opacity for animation
      }}>
      
      {/* Header / Grab Bar */}
      <div 
        style={{
          background: "linear-gradient(135deg, #0d1117 0%, #161b22 100%)",
          padding: "16px 24px",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          position: "relative",
          zIndex: 10
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 10px rgba(0, 0, 0, 0.2)",
            borderRadius: "8px",
            overflow: "hidden",
            width: "32px",
            height: "32px",
            backgroundColor: "white"
          }}>
            <img src={logoUrl} alt="Lynx Vision Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <span style={{ 
            fontSize: "18px", 
            fontWeight: "700", 
            letterSpacing: "0.3px",
            background: "linear-gradient(to right, #ffffff, #a7f3d0)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>Lynx Vision</span>
        </div>
        
        {/* Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "50%",
            color: "rgba(255,255,255,0.8)",
            cursor: "pointer",
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            backdropFilter: "blur(4px)"
          }}
          onMouseEnter={(e) => { 
            e.currentTarget.style.background = "rgba(255,59,48,0.9)"; 
            e.currentTarget.style.border = "1px solid rgba(255,59,48,1)"; 
            e.currentTarget.style.color = "white"; 
            e.currentTarget.style.transform = "scale(1.1) rotate(90deg)"; 
            e.currentTarget.style.boxShadow = "0 0 15px rgba(255,59,48,0.4)";
          }}
          onMouseLeave={(e) => { 
            e.currentTarget.style.background = "rgba(255,255,255,0.08)"; 
            e.currentTarget.style.border = "1px solid rgba(255,255,255,0.1)"; 
            e.currentTarget.style.color = "rgba(255,255,255,0.8)"; 
            e.currentTarget.style.transform = "scale(1) rotate(0deg)"; 
            e.currentTarget.style.boxShadow = "none";
          }}
          aria-label="Close Lynx Vision">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {/* Iframe Content */}
      <div style={{ flex: 1, position: "relative", backgroundColor: "rgba(249, 250, 251, 0.95)" }}>
        <iframe
          src={searchUrl}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            border: "none",
            backgroundColor: "transparent",
            borderRadius: "0 0 24px 24px"
          }}
          title="Lynx Vision Deals"
        />
      </div>
      
      {/* Inject animation keyframes right into the component using a raw style block for simplicity */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes springScale {
          0% { opacity: 0; transform: translate(-50%, -46%) scale(0.95); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.02); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  )
}

export default BudgetLynxOverlay
