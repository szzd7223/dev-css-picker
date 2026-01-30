if (!window.CSSPicker) window.CSSPicker = {};

/**
 * Sets up the main message listener for the content script
 * @param {ElementChangeTracker} tracker - The tracker instance
 * @param {object} handlers - specific handlers for other actions { onStartPicking, onStopPicking, onScanPage, onScanAssets, onSelectNode, onHighlightNode }
 */
window.CSSPicker.setupMessageListeners = function (tracker, handlers) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // 1. SCANNING (Overview / Assets)
        if (request.type === 'SCAN_PAGE') {
            if (handlers.onScanPage) handlers.onScanPage().then(sendResponse);
            return true; // async response
        }



        // 2. PICKING MODES
        if (request.type === 'START_PICKING') {
            if (handlers.onStartPicking) handlers.onStartPicking();
        } else if (request.type === 'STOP_PICKING') {
            if (handlers.onStopPicking) handlers.onStopPicking();
        }

        // 3. SELECTION / HIGHLIGHTING
        else if (request.type === 'SELECT_NODE') {
            if (handlers.onSelectNode) handlers.onSelectNode(request.payload.cpId, sendResponse);
            return true;
        }
        else if (request.type === 'HIGHLIGHT_NODE') {
            if (handlers.onHighlightNode) handlers.onHighlightNode(request.payload.cpId, request.payload.noScroll);
        }

        // 4. STYLE UPDATES
        else if (request.type === 'UPDATE_STYLE') {
            const { cpId, styles } = request.payload;
            const el = document.querySelector(`[data-cp-id="${cpId}"]`);

            if (el) {
                // Apply changes via tracker
                Object.entries(styles).forEach(([prop, val]) => {
                    // Handle Object Decomposition for Box Model properties


                    if (typeof val === 'object' && val !== null && (prop === 'padding' || prop === 'margin' || prop === 'borderRadius')) {
                        if (prop === 'borderRadius') {
                            if (val.topLeft !== undefined) tracker.applyChange(el, 'border-top-left-radius', val.topLeft);
                            if (val.topRight !== undefined) tracker.applyChange(el, 'border-top-right-radius', val.topRight);
                            if (val.bottomRight !== undefined) tracker.applyChange(el, 'border-bottom-right-radius', val.bottomRight);
                            if (val.bottomLeft !== undefined) tracker.applyChange(el, 'border-bottom-left-radius', val.bottomLeft);
                        } else {
                            if (val.top !== undefined) tracker.applyChange(el, `${prop}-top`, val.top);
                            if (val.right !== undefined) tracker.applyChange(el, `${prop}-right`, val.right);
                            if (val.bottom !== undefined) tracker.applyChange(el, `${prop}-bottom`, val.bottom);
                            if (val.left !== undefined) tracker.applyChange(el, `${prop}-left`, val.left);
                        }
                    } else {
                        // Standard property
                        // Convert camelCase to kebab-case just in case
                        const kebabProp = prop.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
                        tracker.applyChange(el, kebabProp, val);
                    }
                });

                // Trigger Highlight Update via callback (since messaging doesn't own highlighting logic)
                if (handlers.onUpdateHighlight) handlers.onUpdateHighlight(el);

                // Return new computed info
                if (handlers.getComputedInfo) sendResponse(handlers.getComputedInfo(el));
            }
        }

        // 5. GRID HIGHLIGHTING (Legacy)
        else if (request.type === 'HIGHLIGHT_GRID_AREA') {
            if (handlers.onHighlightGridArea) handlers.onHighlightGridArea(request.payload);
        } else if (request.type === 'CLEAR_GRID_AREA') {
            if (handlers.onClearGridArea) handlers.onClearGridArea();
        }
    });
}
