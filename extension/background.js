// Background service worker
console.log('Background service worker loaded.');

chrome.action.onClicked.addListener((tab) => {
    // Open the side panel when the extension icon is clicked
    if (tab.id) {
        chrome.sidePanel.open({ tabId: tab.id });
    }
});

// Detect side panel closure
let activeConnections = 0;
let disconnectTimeout = null;

chrome.runtime.onConnect.addListener((port) => {
    if (port.name === 'sidepanel-connection') {
        activeConnections++;
        if (disconnectTimeout) {
            clearTimeout(disconnectTimeout);
            disconnectTimeout = null;
        }
        console.log(`Connection established. Active connections: ${activeConnections}`);

        port.onDisconnect.addListener(() => {
            activeConnections--;
            console.log(`Connection closed. Active connections: ${activeConnections}`);

            if (activeConnections <= 0) {
                activeConnections = 0;
                // Add a small delay before stopping to allow for view switching (e.g. Side Panel -> Pop Out)
                disconnectTimeout = setTimeout(() => {
                    console.log('All views closed and timeout expired, stopping picker...');
                    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
                        if (tabs[0]?.id) {
                            chrome.tabs.sendMessage(tabs[0].id, { type: 'STOP_PICKING' }).catch(() => {
                                // Ignore if content script isn't there
                            });
                        }
                    });
                }, 1000);
            }
        });
    }
});
