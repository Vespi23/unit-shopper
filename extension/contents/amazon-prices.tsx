import type { PlasmoCSConfig, PlasmoGetInlineAnchorList } from "plasmo"
import { useEffect, useState } from "react"

// Updated to use the virtual alias bridge
import { calculatePricePerUnit, parseUnit } from "~lib/unit-parser"

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
      const priceAnchor = result.querySelector('[data-cy="price-recipe"]') || 
                          result.querySelector('.a-spacing-top-small') || 
                          result.querySelector(".a-price:not(.a-text-price)")
      
      if (priceAnchor) {
        anchors.push(priceAnchor)
      }
    })
  }

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

  useEffect(() => {
    const extractDetails = () => {
      const container =
        anchor.element.closest('div[data-component-type="s-search-result"]') ||
        anchor.element.closest(".s-result-item") ||
        document.querySelector("#centerCol") ||
        anchor.element.parentElement

      let titleEl = container.querySelector(
        "[data-cy='title-recipe'] h2, h2 .a-text-normal, h2 a span, #productTitle"
      )

      if (!titleEl) {
        titleEl = container.querySelector("h2 span.a-text-normal")
      }

      const title = titleEl ? titleEl.textContent?.trim() || "" : ""
      let priceStr = ""

      if (anchor.element) {
        const offscreenPrice = anchor.element.querySelector(".a-offscreen")
        priceStr = offscreenPrice
          ? offscreenPrice.textContent?.trim() || ""
          : anchor.element.textContent?.trim() || ""
      }

      // Updated Debug Logs to FinFlow LLC Identity
      console.log("FinFlow LLC Debug [Item] -> Title:", title)
      console.log("FinFlow LLC Debug [Item] -> Price String:", priceStr)

      let unitPriceLabel = "N/A"
      if (priceStr) {
        const parsedPrice = parsePrice(priceStr)
        let unitInfo = parseUnit(title)

        if (!unitInfo && container) {
          unitInfo = parseUnit(container.textContent || "")
        }

        console.log("FinFlow LLC Debug [Item] -> Parsed Price:", parsedPrice)
        console.log("FinFlow LLC Debug [Item] -> Unit Info:", unitInfo)

        if (!isNaN(parsedPrice) && unitInfo) {
          unitPriceLabel = calculatePricePerUnit(
            parsedPrice,
            unitInfo.totalValue,
            unitInfo.unit
          )
        }
      }

      console.log("FinFlow LLC Debug [Item] -> Final Unit Price Label:", unitPriceLabel)
      setProductData({ title, price: priceStr, unitPrice: unitPriceLabel })
    }

    extractDetails()
  }, [anchor.element])

  if (!productData || productData.unitPrice === "N/A") return null;

  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      backgroundColor: "#ecfdf5",
      color: "#059669",
      padding: "4px 8px",
      borderRadius: "6px",
      fontSize: "14px",
      fontWeight: "bold",
      border: "1px solid #34d399",
      marginLeft: "8px",
      whiteSpace: "nowrap",
      boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
    }}>
      ⚡ {productData.unitPrice}
    </div>
  )
}

export default AmazonContentScript