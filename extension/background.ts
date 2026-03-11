export {}

chrome.action.onClicked.addListener((tab) => {
  if (tab.id && tab.url?.includes("amazon.com")) {
    chrome.tabs.sendMessage(tab.id, { action: "open_budgetlynx_overlay" }).catch(() => {
        // Ignore if content script isn't ready
    });
  }
});
