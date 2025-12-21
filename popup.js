// popup.js
document.addEventListener('DOMContentLoaded', () => {
    const pickBtn = document.getElementById('pick-btn');
    const outputArea = document.getElementById('css-output');

    if (pickBtn) {
        pickBtn.addEventListener('click', async () => {
            // Get the current active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (tab?.id) {
                // Send message to content script to start picking
                chrome.tabs.sendMessage(tab.id, { type: 'START_PICKING' });

                if (outputArea) {
                    outputArea.value = "Picker active! Click an element on the page...";
                }
            } else {
                console.error("No active tab found");
            }
        });
    }

    // Listen for the selection message from content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'ELEMENT_SELECTED' && outputArea) {
            const displayText = `--- CSS INFO ---\n${message.css}\n\n--- HTML ---\n${message.html}`;
            outputArea.value = displayText;
        }
    });
});
