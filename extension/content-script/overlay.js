// extension/content-script/overlay.js

(function () {
    let overlayContainer = null;
    let shadowRoot = null;
    let highlightBox = null;
    let cellHighlightBox = null;

    function createOverlay() {
        if (overlayContainer) return;
        overlayContainer = document.createElement('div');
        overlayContainer.id = 'css-picker-overlay-root';
        overlayContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2147483647;';
        document.body.appendChild(overlayContainer);
        shadowRoot = overlayContainer.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
            .highlight-box { 
                position: fixed; 
                border: 1px solid #3b82f6; 
                background: rgba(59, 130, 246, 0.08); 
                pointer-events: none; 
                z-index: 10000; 
                box-sizing: border-box; 
                transition: all 0.05s ease-out; 
                box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.1);
            }
            .highlight-tag { 
                position: absolute; 
                bottom: 100%;
                left: 0;
                background: #3b82f6; 
                color: white; 
                padding: 1px 10px; 
                border-radius: 4px 4px 0 0; 
                font-size: 10px; 
                font-weight: 600; 
                font-family: ui-sans-serif, system-ui, sans-serif;
                white-space: nowrap;
                display: flex;
                align-items: center;
                gap: 6px;
                margin-bottom: -1px;
                height: 18px;
            }
            .layout-badge {
                background: rgba(255, 255, 255, 0.2);
                padding: 0px 3px;
                border-radius: 2px;
                font-size: 9px;
                text-transform: uppercase;
            }
            .size-text {
                color: rgba(255, 255, 255, 0.8);
                font-weight: 400;
            }
            .cell-highlight {
                position: fixed;
                border: 2px solid #22c55e;
                background: rgba(34, 197, 94, 0.2);
                pointer-events: none;
                z-index: 10001;
                box-sizing: border-box;
                border-radius: 2px;
                display: none;
            }
        `;
        shadowRoot.appendChild(style);

        highlightBox = document.createElement('div');
        highlightBox.className = 'highlight-box';
        highlightBox.innerHTML = '<div class="highlight-tag"></div>';
        shadowRoot.appendChild(highlightBox);

        cellHighlightBox = document.createElement('div');
        cellHighlightBox.className = 'cell-highlight';
        shadowRoot.appendChild(cellHighlightBox);
    }

    function removeOverlay() {
        if (overlayContainer) {
            overlayContainer.remove();
            overlayContainer = null;
            shadowRoot = null;
            highlightBox = null;
            cellHighlightBox = null;
        }
    }

    function updateHighlight(el) {
        if (!highlightBox) return;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const display = style.display;

        highlightBox.style.display = 'block';
        highlightBox.style.width = `${rect.width}px`;
        highlightBox.style.height = `${rect.height}px`;
        highlightBox.style.top = `${rect.top}px`;
        highlightBox.style.left = `${rect.left}px`;

        let layoutBadge = '';
        if (display.includes('flex')) layoutBadge = '<span class="layout-badge">Flex</span>';
        else if (display.includes('grid')) layoutBadge = '<span class="layout-badge">Grid</span>';

        const tagName = el.tagName.toLowerCase();
        const dimensions = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;

        highlightBox.querySelector('.highlight-tag').innerHTML = `
            <span>${tagName}</span>
            <span class="size-text">${dimensions}</span>
            ${layoutBadge}
        `;

        // Position tag at bottom if top is out of view
        if (rect.top < 30) {
            highlightBox.querySelector('.highlight-tag').style.top = '100%';
            highlightBox.querySelector('.highlight-tag').style.bottom = 'auto';
            highlightBox.querySelector('.highlight-tag').style.borderRadius = '0 0 4px 4px';
            highlightBox.querySelector('.highlight-tag').style.marginTop = '-1px';
        } else {
            highlightBox.querySelector('.highlight-tag').style.top = 'auto';
            highlightBox.querySelector('.highlight-tag').style.bottom = '100%';
            highlightBox.querySelector('.highlight-tag').style.borderRadius = '4px 4px 0 0';
            highlightBox.querySelector('.highlight-tag').style.marginTop = '0';
        }
    }

    function updateCellHighlight(el, info) {
        if (!cellHighlightBox) return;

        if (!info) {
            cellHighlightBox.style.display = 'none';
            return;
        }

        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);

        if (info.type === 'item') {
            const children = Array.from(el.children);
            const child = children[info.index];
            if (child) {
                const crect = child.getBoundingClientRect();
                cellHighlightBox.style.display = 'block';
                cellHighlightBox.style.width = `${crect.width}px`;
                cellHighlightBox.style.height = `${crect.height}px`;
                cellHighlightBox.style.top = `${crect.top}px`;
                cellHighlightBox.style.left = `${crect.left}px`;
            }
        } else if (info.type === 'cell') {
            // Advanced cell coordinate calculation
            const colTracks = style.gridTemplateColumns.split(' ').map(s => parseFloat(s));
            const rowTracks = style.gridTemplateRows.split(' ').map(s => parseFloat(s));
            const colGap = parseFloat(style.columnGap || style.gap) || 0;
            const rowGap = parseFloat(style.rowGap || style.gap) || 0;
            const paddingLeft = parseFloat(style.paddingLeft);
            const paddingTop = parseFloat(style.paddingTop);

            let x = rect.left + paddingLeft;
            for (let i = 0; i < info.col - 1; i++) {
                x += (colTracks[i] || 0) + colGap;
            }

            let y = rect.top + paddingTop;
            for (let i = 0; i < info.row - 1; i++) {
                y += (rowTracks[i] || 0) + rowGap;
            }

            cellHighlightBox.style.display = 'block';
            cellHighlightBox.style.width = `${colTracks[info.col - 1]}px`;
            cellHighlightBox.style.height = `${rowTracks[info.row - 1]}px`;
            cellHighlightBox.style.top = `${y}px`;
            cellHighlightBox.style.left = `${x}px`;
        }
    }

    window.CSSPicker.overlay = {
        createOverlay,
        removeOverlay,
        updateHighlight,
        updateCellHighlight,
        // Expose helper to clear specifically
        clearCellHighlight: () => {
            if (cellHighlightBox) cellHighlightBox.style.display = 'none';
        },
        // Helpers to check state if needed, though mostly internal
        hasOverlay: () => !!overlayContainer
    };
})();
