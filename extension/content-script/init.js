// extension/content-script/init.js

(function () {
    console.log('Picky.Editor: Content script modules loaded.');

    const { startPicking, stopPicking, setLastElement } = window.Picky_Editor.picking;
    const { extractOverviewData } = window.Picky_Editor.scanner;
    const { getElementInfo } = window.Picky_Editor.inspector;
    const { createOverlay, updateHighlight, updateCellHighlight, clearCellHighlight } = window.Picky_Editor.overlay;

    // Initialize Tracker
    // Ensure tracker.js is loaded before this file
    if (window.Picky_Editor.ElementChangeTracker) {
        window.Picky_Editor.tracker = new window.Picky_Editor.ElementChangeTracker();
    } else {
        console.error('Picky.Editor: ElementChangeTracker not found. Make sure tracker.js is loaded first.');
    }

    // Handlers Interface
    const handlers = {
        onScanPage: extractOverviewData,


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
    if (window.Picky_Editor.setupMessageListeners) {
        window.Picky_Editor.setupMessageListeners(window.Picky_Editor.tracker, handlers);
    } else {
        console.error('Picky.Editor: setupMessageListeners not found. Make sure messaging.js is loaded first.');
    }

})();
