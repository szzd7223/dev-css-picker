// extension/content-script/picking.js

(function () {
    const { createOverlay, removeOverlay, updateHighlight, hasOverlay } = window.CSSPicker.overlay;
    const { getElementInfo } = window.CSSPicker.inspector;

    let isPicking = false;
    let lastElement = null;

    function handleMouseMove(e) {
        if (!isPicking) return;
        const target = document.elementFromPoint(e.clientX, e.clientY);
        // Check if we are hovering over our own overlay
        // Note: modify this check as needed based on exact DOM structure of overlay
        // For now, if your overlay uses shadow DOM and pointer-events: none, it might pass through.
        // But the original code had a check `overlayContainer.contains(target)`.
        const overlayRoot = document.getElementById('css-picker-overlay-root');
        if (!target || (overlayRoot && overlayRoot.contains(target))) return;

        if (target !== lastElement) {
            lastElement = target;
            updateHighlight(target);
        }
    }

    function handleClick(e) {
        if (!isPicking) return;
        e.preventDefault();
        e.stopPropagation();

        if (lastElement) {
            chrome.runtime.sendMessage({
                type: 'ELEMENT_SELECTED',
                payload: getElementInfo(lastElement)
            });
        }
    }

    let cursorStyle = null;

    function startPicking() {
        if (!isPicking) {
            isPicking = true;
            createOverlay();

            // Force crosshair cursor on all elements
            cursorStyle = document.createElement('style');
            cursorStyle.id = 'css-picker-cursor-style';
            cursorStyle.textContent = `
                * {
                    cursor: crosshair !important;
                }
            `;
            document.head.appendChild(cursorStyle);

            document.addEventListener('mousemove', handleMouseMove, { passive: true });
            document.addEventListener('click', handleClick, { capture: true });
        }
    }

    function stopPicking() {
        if (isPicking) {
            isPicking = false;
            removeOverlay();

            if (cursorStyle) {
                cursorStyle.remove();
                cursorStyle = null;
            }

            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('click', handleClick, { capture: true });
            lastElement = null;
        }
    }

    function getLastElement() {
        return lastElement;
    }

    function setLastElement(el) {
        lastElement = el;
    }

    window.CSSPicker.picking = {
        startPicking,
        stopPicking,
        getLastElement,
        setLastElement
    };
})();
