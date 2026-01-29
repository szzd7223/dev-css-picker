import { create } from 'zustand';

// Helper to clean style values (ensure units, handle defaults)
const cleanStyleValue = (val) => {
    if (typeof val === 'object' && val !== null) {
        const out = {};
        for (const k in val) out[k] = cleanStyleValue(val[k]);
        return out;
    }
    return val === undefined || val === null ? undefined : val;
};

export const useDevToolsStore = create((set, get) => ({
    // --- State ---
    selectedElement: null,
    activeTab: 'overview',
    isInspectMode: false,

    // --- Actions ---

    // 1. Selection & Mode
    setSelectedElement: (element) => {
        // When a new element is selected, we replace the state
        // If element is null, it means we deselected
        set({ selectedElement: element });
    },

    setActiveTab: (tab) => {
        set({ activeTab: tab });
        // Auto-enable inspect mode when entering Inspector or Overview?
        // Logic from App.jsx:
        if (tab === 'inspector') {
            get().setInspectMode(true);
        }
    },

    setInspectMode: (isActive) => {
        set({ isInspectMode: isActive });
        // Side effect: Tell content script to start/stop picking
        // This is handled via the store subscription or App.jsx effect
        // for now we just update state, App.jsx handles the message dispatching
        // to keep side effects centralized or we can move it here later.
    },

    // 2. Property Updates
    // This action optimistically updates the local state AND sends the message to the content script
    updateProperty: (property, value) => {
        const { selectedElement } = get();
        if (!selectedElement) return;

        // 1. Optimistic Update
        // We need to find WHERE in the object structure this property lives
        const newElement = structuredClone(selectedElement);

        // Helper to update deeply nested paths based on our data structure
        // This mimics the structure in content.js > getElementInfo

        // Top-level / Inline
        if (property === 'width' || property === 'height') {
            newElement[property] = value; // update top level
            if (!newElement.inlineStyle) newElement.inlineStyle = {};
            newElement.inlineStyle[property] = value; // update inline mirror
        }

        // Typography
        else if (['fontSize', 'fontWeight', 'lineHeight', 'fontFamily'].includes(property)) {
            newElement.typography = { ...newElement.typography }; // ensure object exists
            if (property === 'fontSize') newElement.typography.size = value;
            if (property === 'fontWeight') newElement.typography.weight = value;
            if (property === 'lineHeight') newElement.typography.lineHeight = value;
            // fontFamily handling might need more logic if it's strictly splitting strings
        }

        // Colors
        else if (['color', 'backgroundColor', 'backgroundImage', 'borderColor'].includes(property)) {
            newElement.colors = { ...newElement.colors };
            if (property === 'color') newElement.colors.text = value;
            if (property === 'backgroundColor') newElement.colors.background = value;
            if (property === 'backgroundImage') newElement.colors.backgroundImage = value;
            if (property === 'borderColor') newElement.colors.border = value;
        }

        // Box Model
        else if (['padding', 'margin', 'borderRadius', 'borderWidth', 'borderStyle', 'display'].includes(property)) {
            newElement.boxModel = { ...newElement.boxModel };
            newElement.boxModel[property] = value;
        }

        // Positioning
        else if (['position', 'top', 'right', 'bottom', 'left', 'zIndex'].includes(property)) {
            newElement.positioning = { ...newElement.positioning };
            newElement.positioning[property] = value;
        }

        // Flex/Grid
        else if (['flexDirection', 'justifyContent', 'alignItems', 'alignContent', 'gap', 'rowGap', 'columnGap', 'gridTemplateColumns', 'gridTemplateRows', 'gridAutoFlow'].includes(property)) {
            newElement.flexGrid = { ...newElement.flexGrid };
            newElement.flexGrid[property] = value;
        }

        set({ selectedElement: newElement });

        // 2. Sync to DOM (Side Effect)
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
                if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        type: 'UPDATE_STYLE',
                        payload: {
                            cpId: selectedElement.cpId,
                            styles: { [property]: value }
                        }
                    })
                        .then((response) => {
                            if (response) {
                                // Sync the full element state (computed styles + originals) from the content script
                                set({ selectedElement: response });
                            }
                        })
                        .catch(err => console.warn("Failed to update style:", err));
                }
            });
        }
    },

    // Batch update (useful for resets or presets)
    updateProperties: (updates) => {
        const { selectedElement } = get();
        if (!selectedElement) return;

        // Optimistic State Update for Batch


        // Optimistic Batch Update
        const newElement = structuredClone(selectedElement);
        Object.entries(updates).forEach(([property, value]) => {
            // ... simplified logic from updateProperty ...
            // Copied logic to avoid dispatching N messages
            if (property === 'width' || property === 'height') {
                newElement[property] = value;
                if (!newElement.inlineStyle) newElement.inlineStyle = {};
                newElement.inlineStyle[property] = value;
            }
            else if (['fontSize', 'fontWeight', 'lineHeight', 'fontFamily'].includes(property)) {
                newElement.typography = { ...newElement.typography, [property === 'fontSize' ? 'size' : (property === 'fontWeight' ? 'weight' : property)]: value };
            }
            // ... covering main cases ...
            else if (['color', 'backgroundColor', 'backgroundImage', 'borderColor'].includes(property)) {
                newElement.colors = { ...newElement.colors };
                if (property === 'color') newElement.colors.text = value;
                if (property === 'backgroundColor') newElement.colors.background = value;
                if (property === 'borderColor') newElement.colors.border = value;
                // ...
            }
            // Manually merge nested objects for optimistic update

        });

        Object.entries(updates).forEach(([prop, val]) => {
            get().updateProperty(prop, val);
        });
    }
}));
