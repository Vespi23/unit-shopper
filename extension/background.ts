// Self-contained monetization engine

const ASIN_REGEX = /(?:dp|o|ASIN|gp\/product|gp\/offer-listing|gp\/product\/ajax|gp\/aw\/d)\/(B[A-Z0-9]{9}|[0-9]{9}(?:X|[0-9]))/i;
const ASIN_QUERY_REGEX = /(?:[?&]asin=)(B[A-Z0-9]{9}|[0-9]{9}(?:X|[0-9]))/i;

const AFFILIATE_TAGS: Record<string, string> = {
  "www.amazon.com": "budgetlynx-20",
  "amazon.com": "budgetlynx-20",
  "www.amazon.co.uk": "budgetlynx-21",
  "amazon.co.uk": "budgetlynx-21",
  "www.amazon.ca": "budgetlynx-20",
  "amazon.ca": "budgetlynx-20",
};

const DEFAULT_TAG = "budgetlynx-20";

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const currentUrl = changeInfo.url || tab.url;
  
  if (!currentUrl || !currentUrl.includes("amazon.")) return;

  try {
    const urlObj = new URL(currentUrl);
    const host = urlObj.hostname; // Do NOT strip www.

    let asin = null;
    const pathMatch = urlObj.pathname.match(ASIN_REGEX);
    if (pathMatch && pathMatch[1]) {
      asin = pathMatch[1].toUpperCase();
    } else {
      const queryMatch = urlObj.search.match(ASIN_QUERY_REGEX);
      if (queryMatch && queryMatch[1]) {
        asin = queryMatch[1].toUpperCase();
      }
    }

    if (!asin) return;

    const regionalTag = AFFILIATE_TAGS[host] || DEFAULT_TAG;

    // Prevent infinite redirect loops
    if (urlObj.searchParams.get("tag") === regionalTag) return;

    // Build the monetized URL on the exact same host
    const monetizedUrl = `https://${host}/dp/${asin}?tag=${regionalTag}`;
    
    if (currentUrl !== monetizedUrl) {
      console.log(`[Holm-Protocol] Redirecting to: ${monetizedUrl}`);
      chrome.tabs.update(tabId, { url: monetizedUrl });
    }
  } catch (error) {
    console.error("[Holm-Protocol] Extraction Error:", error);
  }
});

// CRITICAL PATCH: This empty export forces Plasmo/TypeScript to compile this as a module
export {};