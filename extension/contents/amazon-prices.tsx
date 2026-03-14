import type { PlasmoCSConfig, PlasmoGetInlineAnchorList } from "plasmo"
import { useEffect, useState } from "react"

import { calculatePricePerUnit, parseUnit } from "../unit-parser"

export const config: PlasmoCSConfig = {
  matches: [
    "*://*.amazon.com/*/dp/*",
    "*://*.amazon.com/dp/*",
    "*://*.amazon.com/gp/product/*",
    "*://*.amazon.com/s*"
  ]
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = `
    :host {
      z-index: 10 !important;
      position: relative;
    }
  `
  return style
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
      'div[data-component-type="s-search-result"]'
    )

    searchResults.forEach((result) => {
      // Find a safe container that isn't clipped by the title's line-clamp CSS
      const priceAnchor = result.querySelector('[data-cy="price-recipe"]') || 
                          result.querySelector('.a-spacing-top-small') || 
                          result.querySelector(".a-price:not(.a-text-price)")
      
      if (priceAnchor) {
        anchors.push(priceAnchor)
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

  // Prevent rendering if the math failed or data is missing
  if (!productData || productData.unitPrice === "N/A") return null;

  // 3. The Visual Projection (Inline Badge)
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      backgroundColor: "#ecfdf5", // Tailwind Emerald 50
      color: "#059669", // Tailwind Emerald 600
      padding: "4px 8px",
      borderRadius: "6px",
      fontSize: "14px",
      fontWeight: "bold",
      border: "1px solid #34d399", // Tailwind Emerald 400
      marginLeft: "8px",
      whiteSpace: "nowrap",
      boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
    }}>
      ⚡ {productData.unitPrice}
    </div>
  )
}

export default AmazonContentScript
