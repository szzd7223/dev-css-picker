// Background service worker
console.log('Background service worker loaded.');

chrome.action.onClicked.addListener((tab) => {
    // Open the side panel when the extension icon is clicked
    if (tab.id) {
        chrome.sidePanel.open({ tabId: tab.id });
    }
});
