// Background service worker
console.log('Background service worker loaded.');

chrome.action.onClicked.addListener((tab) => {
    // Open the side panel when the extension icon is clicked
    if (tab.id) {
        chrome.sidePanel.open({ tabId: tab.id });
    }
});

// Detect side panel closure
chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'sidepanel-connection') {
        port.onDisconnect.addListener(() => {
            console.log('Sidebar closed, stopping picker...');
            // Notify the active tab to stop picking
            chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
                if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(tabs[0].id, { type: 'STOP_PICKING' }).catch(() => {
                        // Ignore if content script isn't there
                    });
                }
            });
        });
    }
});
