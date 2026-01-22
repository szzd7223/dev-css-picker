// extension/content-script/utils.js

// Ensure namespace exists
window.CSSPicker = window.CSSPicker || {};

(function () {
    // Utility for picking elements
    function getOrAssignId(el) {
        if (!el.dataset.cpId) el.dataset.cpId = Math.random().toString(36).substr(2, 9);
        return el.dataset.cpId;
    }

    // Canvas-based color normalization
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    function normalizeColor(color) {
        if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return 'transparent';
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        if (a === 0) return 'transparent';
        const toHex = (n) => n.toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
    }

    window.CSSPicker.utils = {
        getOrAssignId,
        normalizeColor
    };
})();
