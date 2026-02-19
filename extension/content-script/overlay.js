// extension/content-script/overlay.js

(function () {
    let overlayContainer = null;
    let shadowRoot = null;
    let highlightBox = null;


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
                border: 1px solid #2ECC71; 
                background: rgba(46, 204, 113, 0.08); 
                pointer-events: none; 
                z-index: 10000; 
                box-sizing: border-box; 
                transition: all 0.05s ease-out; 
                box-shadow: inset 0 0 0 1px rgba(46, 204, 113, 0.1);
            }
            .highlight-tag { 
                position: absolute; 
                bottom: 100%;
                left: 0;
                background: #2ECC71; 
                color: #050705; 
                padding: 1px 10px; 
                border-radius: 4px 4px 0 0; 
                font-size: 10px; 
                font-weight: 600; 
                font-family: 'JetBrains Mono', 'Fira Code', monospace;
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

        `;
        shadowRoot.appendChild(style);

        highlightBox = document.createElement('div');
        highlightBox.className = 'highlight-box';
        highlightBox.innerHTML = '<div class="highlight-tag"></div>';
        shadowRoot.appendChild(highlightBox);

    }

    function removeOverlay() {
        if (overlayContainer) {
            overlayContainer.remove();
            overlayContainer = null;
            shadowRoot = null;
            highlightBox = null;

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



    window.Picky_Editor.overlay = {
        createOverlay,
        removeOverlay,
        updateHighlight,
        // Helpers to check state if needed, though mostly internal
        hasOverlay: () => !!overlayContainer
    };
})();
