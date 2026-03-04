import type { PlasmoCSConfig, PlasmoGetInlineAnchorList } from "plasmo"
import { useEffect, useState } from "react"

import { calculatePricePerUnit, parseUnit } from "./unit-parser"

export const config: PlasmoCSConfig = {
  matches: [
    "*://*.amazon.com/*/dp/*",
    "*://*.amazon.com/dp/*",
    "*://*.amazon.com/gp/product/*",
    "*://*.amazon.com/s*"
  ]
}

export const getInlineAnchorList: PlasmoGetInlineAnchorList = async () => {
  const anchors: Element[] = []

  // 1. Single product page
  const singlePageAnchors = document.querySelectorAll(
    "#corePrice_feature_div, #corePriceDisplay_desktop_feature_div, #corePrice_desktop, #priceblock_ourprice"
  )
  if (singlePageAnchors.length > 0) {
    anchors.push(singlePageAnchors[0])
  } else {
    // 2. Search page and related items
    const searchResults = document.querySelectorAll(
      'div[data-component-type="s-search-result"], .s-result-item'
    )

    // We must deduplicate if a .s-result-item is inside a .s-search-result
    const seenPrices = new Set()

    searchResults.forEach((result) => {
      // Ensure we only select the primary price block (not list prices .a-text-price)
      const primaryPrice = result.querySelector(".a-price:not(.a-text-price)")
      if (primaryPrice && !seenPrices.has(primaryPrice)) {
        anchors.push(primaryPrice)
        seenPrices.add(primaryPrice)
      }
    })
  }

  // Map to the required ElementInsertOptionsList format
  return anchors.map((el) => ({ element: el }))
}

const parsePrice = (priceStr: string) => {
  return parseFloat(priceStr.replace(/[^0-9.]/g, ""))
}

const AmazonContentScript = ({ anchor }: { anchor: any }) => {
  const [productData, setProductData] = useState<{
    title: string
    price: string
    unitPrice: string
  } | null>(null)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    // Basic DOM extraction for title and price relative to this specific anchor
    const extractDetails = () => {
      // Find the closest product container first (handles both search grids and single product pages)
      const container =
        anchor.element.closest('div[data-component-type="s-search-result"]') ||
        anchor.element.closest(".s-result-item") ||
        document.querySelector("#centerCol") ||
        anchor.element.parentElement

      // Try finding title specifically within this container
      let titleEl = container.querySelector(
        "[data-cy='title-recipe'] h2, h2 .a-text-normal, h2 a span, #productTitle"
      )

      // Fallback: search page headers
      if (!titleEl) {
        titleEl = container.querySelector("h2 span.a-text-normal")
      }

      const title = titleEl ? titleEl.textContent?.trim() || "" : ""
      let priceStr = ""

      if (anchor.element) {
        // Find screen reader price if available, otherwise just text
        const offscreenPrice = anchor.element.querySelector(".a-offscreen")
        priceStr = offscreenPrice
          ? offscreenPrice.textContent?.trim() || ""
          : anchor.element.textContent?.trim() || ""
      }

      console.log("BudgetLynx Debug [Item] -> Title:", title)
      console.log("BudgetLynx Debug [Item] -> Price String:", priceStr)

      let unitPriceLabel = "N/A"
      if (priceStr) {
        const parsedPrice = parsePrice(priceStr)

        // Parse from title first
        let unitInfo = parseUnit(title)

        // If title failed, fallback to parsing the entire container text.
        // On search pages, Amazon often puts the count/size outside the h2 title (e.g. "300 Count (Pack of 1)")
        if (!unitInfo && container) {
          unitInfo = parseUnit(container.textContent || "")
        }

        console.log("BudgetLynx Debug [Item] -> Parsed Price:", parsedPrice)
        console.log("BudgetLynx Debug [Item] -> Unit Info:", unitInfo)

        if (!isNaN(parsedPrice) && unitInfo) {
          unitPriceLabel = calculatePricePerUnit(
            parsedPrice,
            unitInfo.totalValue,
            unitInfo.unit
          )
        }
      }

      console.log("BudgetLynx Debug [Item] -> Final Unit Price Label:", unitPriceLabel)
      setProductData({ title, price: priceStr, unitPrice: unitPriceLabel })
    }

    // Run extraction after a short delay since Plasmo passes the anchor directly
    extractDetails()
  }, [anchor.element])

  if (!productData) return null

  const isError = productData.unitPrice === "N/A"

  const baseBg = isError ? "#f1f3f4" : "#e6f4ea"
  const hoverBg = isError ? "#e4e5e7" : "#d3e8d9"
  const textColor = isError ? "#5f6368" : "#137333"

  return (
    <a
      href={`https://budgetlynx.com/?q=${encodeURIComponent(productData.title)}`}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: "3px 8px",
        marginTop: "4px",
        marginBottom: "4px",
        backgroundColor: isHovered ? hoverBg : baseBg,
        color: textColor,
        fontWeight: "bold",
        fontSize: "12px",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        borderRadius: "4px",
        whiteSpace: "nowrap",
        textDecoration: isHovered ? "underline" : "none",
        boxShadow: isHovered ? "0 1px 3px rgba(0,0,0,0.2)" : "none",
        transition: "all 0.2s ease-in-out",
        cursor: "pointer",
        zIndex: 9999
      }}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={isError ? "#5f6368" : "#137333"}
        width="16px"
        height="16px"
        style={{ flexShrink: 0 }}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
      </svg>
      <span>
        {isError
          ? "Lynx Vision: Could not parse unit."
          : `Lynx Vision: ${productData.unitPrice}`}
      </span>
    </a>
  )
}

export default AmazonContentScript
