// extension/content-script/init.js

(function () {
    console.log('CSS Picker: Content script modules loaded.');

    const { startPicking, stopPicking, setLastElement } = window.CSSPicker.picking;
    const { extractOverviewData, extractAssetsData } = window.CSSPicker.scanner;
    const { getElementInfo } = window.CSSPicker.inspector;
    const { createOverlay, updateHighlight, updateCellHighlight, clearCellHighlight } = window.CSSPicker.overlay;

    // Initialize Tracker
    // Ensure tracker.js is loaded before this file
    if (window.CSSPicker.ElementChangeTracker) {
        window.CSSPicker.tracker = new window.CSSPicker.ElementChangeTracker();
    } else {
        console.error('CSS Picker: ElementChangeTracker not found. Make sure tracker.js is loaded first.');
    }

    // Handlers Interface
    const handlers = {
        onScanPage: extractOverviewData,
        onScanAssets: extractAssetsData,

        onStartPicking: startPicking,

        onStopPicking: stopPicking,

        onSelectNode: (cpId, sendResponse) => {
            const el = document.querySelector(`[data-cp-id="${cpId}"]`);
            if (el) {
                setLastElement(el);
                sendResponse(getElementInfo(el));
            }
        },

        onHighlightNode: (cpId, noScroll) => {
            const el = document.querySelector(`[data-cp-id="${cpId}"]`);
            if (el) {
                setLastElement(el);
                createOverlay(); // Ensure overlay exists
                updateHighlight(el);
                if (!noScroll) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },

        onUpdateHighlight: (el) => {
            setLastElement(el);
            createOverlay();
            updateHighlight(el);
        },

        getComputedInfo: (el) => {
            return getElementInfo(el);
        },

        onHighlightGridArea: (payload) => {
            const el = document.querySelector(`[data-cp-id="${payload.cpId}"]`);
            if (el) {
                createOverlay();
                updateCellHighlight(el, payload);
            }
        },

        onClearGridArea: () => {
            clearCellHighlight();
        }
    };

    // Initialize Messaging
    if (window.CSSPicker.setupMessageListeners) {
        window.CSSPicker.setupMessageListeners(window.CSSPicker.tracker, handlers);
    } else {
        console.error('CSS Picker: setupMessageListeners not found. Make sure messaging.js is loaded first.');
    }

})();
