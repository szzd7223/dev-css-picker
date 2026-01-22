// content.js
console.log('CSS Picker: Content script loaded.');

let isPicking = false;
let overlayContainer = null;
let shadowRoot = null;
let highlightBox = null;
let cellHighlightBox = null;
let lastElement = null;

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

// Hierarchy extraction
function getNodeData(el, isTarget = false, isChild = false) {
    const tagName = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const classes = Array.from(el.classList).map(c => `.${c}`).join(' ');
    return {
        tagName,
        id,
        classes,
        cpId: getOrAssignId(el),
        isTarget,
        isChild
    };
}

function getShallowHierarchy(el) {
    const hierarchy = [];
    let current = el;
    while (current && current.tagName !== 'HTML') {
        hierarchy.unshift(getNodeData(current, current === el));
        if (current.tagName === 'BODY' || hierarchy.length > 5) break;
        current = current.parentElement;
    }
    if (el.children.length > 0) {
        Array.from(el.children).slice(0, 5).forEach(child => {
            hierarchy.push(getNodeData(child, false, true));
        });
    }
    return hierarchy;
}

// Element Info extraction
// Helper to get Asset Info (Image/SVG/Background)
function getAssetInfo(el) {
    const url = getImageUrl(el);
    const style = window.getComputedStyle(el);
    const tagName = el.tagName.toLowerCase();

    // 1. Image or Background Image
    if (url) {
        return {
            url,
            intrinsicSize: tagName === 'img' ? { width: el.naturalWidth, height: el.naturalHeight } : null,
            renderedSize: { width: Math.round(el.getBoundingClientRect().width), height: Math.round(el.getBoundingClientRect().height) },
            type: tagName === 'img' ? 'Image' : 'Background',
            styles: {
                objectFit: style.objectFit,
                objectPosition: style.objectPosition,
                borderRadius: style.borderRadius,
                opacity: style.opacity,
                backgroundSize: style.backgroundSize,
                backgroundPosition: style.backgroundPosition,
                backgroundRepeat: style.backgroundRepeat,
                overflow: style.overflow,
                zIndex: style.zIndex,
                position: style.position
            }
        };
    }

    // 2. Inline SVG
    if (tagName === 'svg') {
        return {
            url: null,
            type: 'SVG',
            renderedSize: { width: Math.round(el.getBoundingClientRect().width), height: Math.round(el.getBoundingClientRect().height) },
            styles: {
                opacity: style.opacity,
                zIndex: style.zIndex,
                overflow: style.overflow,
                position: style.position
            },
            svgInfo: {
                viewBox: el.getAttribute('viewBox'),
                fill: style.fill,
                stroke: style.stroke
            }
        };
    }

    return null;
}

// Element Info extraction
function getElementInfo(el) {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    const assetInfo = getAssetInfo(el);

    return {
        cpId: getOrAssignId(el),
        tagName: el.tagName.toLowerCase(),
        fullSelector: `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${Array.from(el.classList).map(c => '.' + c).join('')}`,
        html: el.outerHTML.substring(0, 1000),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: rect.top,
        left: rect.left,
        imageInfo: assetInfo,
        colors: {
            text: normalizeColor(style.color),
            background: normalizeColor(style.backgroundColor),
            backgroundImage: style.backgroundImage !== 'none' ? style.backgroundImage : null,
            border: normalizeColor(style.borderColor)
        },
        typography: {
            font: style.fontFamily.split(',')[0].replace(/['"]/g, ''),
            size: style.fontSize,
            weight: style.fontWeight,
            lineHeight: style.lineHeight
        },
        boxModel: {
            padding: {
                top: style.paddingTop,
                right: style.paddingRight,
                bottom: style.paddingBottom,
                left: style.paddingLeft
            },
            margin: {
                top: style.marginTop,
                right: style.marginRight,
                bottom: style.marginBottom,
                left: style.marginLeft
            },
            borderRadius: {
                topLeft: style.borderTopLeftRadius,
                topRight: style.borderTopRightRadius,
                bottomRight: style.borderBottomRightRadius,
                bottomLeft: style.borderBottomLeftRadius
            },
            borderWidth: style.borderTopWidth,
            borderStyle: style.borderTopStyle,
            display: style.display
        },
        positioning: {
            position: style.position,
            top: style.top,
            right: style.right,
            bottom: style.bottom,
            left: style.left,
            zIndex: style.zIndex
        },
        flexGrid: {
            display: style.display,
            flexDirection: style.flexDirection,
            flexWrap: style.flexWrap,
            justifyContent: style.justifyContent,
            alignItems: style.alignItems,
            alignContent: style.alignContent,
            gap: style.gap,
            rowGap: style.rowGap,
            columnGap: style.columnGap,
            gridTemplateColumns: style.gridTemplateColumns,
            gridTemplateRows: style.gridTemplateRows,
            gridAutoFlow: style.gridAutoFlow,
            gridItems: style.display === 'grid' || style.display === 'inline-grid' ? Array.from(el.children).map(child => {
                const s = window.getComputedStyle(child);
                return {
                    gridColumn: s.gridColumn,
                    gridRow: s.gridRow,
                    gridArea: s.gridArea
                };
            }) : []
        },
        inlineStyle: {
            width: el.style.width,
            height: el.style.height,
            paddingTop: el.style.paddingTop,
            paddingRight: el.style.paddingRight,
            paddingBottom: el.style.paddingBottom,
            paddingLeft: el.style.paddingLeft,
            marginTop: el.style.marginTop,
            marginRight: el.style.marginRight,
            marginBottom: el.style.marginBottom,
            marginLeft: el.style.marginLeft,
            gap: el.style.gap
        },
        hierarchy: getShallowHierarchy(el),
        originalStyles: tracker.getAllOriginals(el)
    };
}

// Simplified Highlight UI
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

function handleMouseMove(e) {
    if (!isPicking) return;
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target || (overlayContainer && overlayContainer.contains(target))) return;
    if (target !== lastElement) {
        lastElement = target;
        updateHighlight(target);
    }
}

function handleClick(e) {
    if (!isPicking) return;
    e.preventDefault(); e.stopPropagation();
    if (lastElement) {
        chrome.runtime.sendMessage({
            type: 'ELEMENT_SELECTED',
            payload: getElementInfo(lastElement)
        });
    }
}

// Scan page logic for Overview Tab
async function extractOverviewData() {
    const fonts = new Map();
    const bgColors = new Map();
    const textColors = new Map();
    const sample = Array.from(document.querySelectorAll('*')).slice(0, 800);
    sample.forEach(el => {
        const style = window.getComputedStyle(el);
        const fontFamily = style.fontFamily;
        if (fontFamily) {
            const primary = fontFamily.split(',')[0].replace(/['"]/g, '').trim();
            if (primary) fonts.set(primary, (fonts.get(primary) || 0) + 1);
        }
        const bg = normalizeColor(style.backgroundColor);
        const color = normalizeColor(style.color);
        if (bg && bg !== 'transparent') bgColors.set(bg, (bgColors.get(bg) || 0) + 1);
        if (color && color !== 'transparent') textColors.set(color, (textColors.get(color) || 0) + 1);
    });
    const sort = (m) => Array.from(m.entries()).map(([v, c]) => ({ value: v, count: c })).sort((a, b) => b.count - a.count);
    return {
        fonts: sort(fonts),
        bgColors: sort(bgColors),
        textColors: sort(textColors),
        meta: { title: document.title, url: window.location.href }
    };
}

// Image Discovery Logic
function getImageUrl(el) {
    if (el.tagName === 'IMG') return el.src;
    const style = window.getComputedStyle(el);
    const bgImage = style.backgroundImage;
    if (bgImage && bgImage !== 'none') {
        const match = bgImage.match(/url\(['"]?(.*?)['"]?\)/);
        return match ? match[1] : null;
    }
    return null;
}

async function extractAssetsData() {
    const assets = [];
    const elements = document.querySelectorAll('*');

    elements.forEach(el => {
        const info = getAssetInfo(el);
        if (info) {
            const rect = el.getBoundingClientRect();
            if (rect.width >= 10 && rect.height >= 10) {
                assets.push({
                    cpId: getOrAssignId(el),
                    ...info
                });
            }
        }
    });

    const seenUrls = new Set();
    return assets.filter(asset => {
        if (asset.type === 'SVG') return true;
        if (seenUrls.has(asset.url)) return false;
        seenUrls.add(asset.url);
        return true;
    });
}

// Initialize Tracker
const tracker = new window.CSSPicker.ElementChangeTracker();

// Handlers Interface
const handlers = {
    onScanPage: extractOverviewData,
    onScanAssets: extractAssetsData,

    onStartPicking: () => {
        if (!isPicking) {
            isPicking = true;
            createOverlay();
            document.addEventListener('mousemove', handleMouseMove, { passive: true });
            document.addEventListener('click', handleClick, { capture: true });
        }
    },

    onStopPicking: () => {
        if (isPicking) {
            isPicking = false;
            removeOverlay();
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('click', handleClick, { capture: true });
            lastElement = null;
        }
    },

    onSelectNode: (cpId, sendResponse) => {
        const el = document.querySelector(`[data-cp-id="${cpId}"]`);
        if (el) {
            lastElement = el;
            sendResponse(getElementInfo(el));
        }
    },

    onHighlightNode: (cpId, noScroll) => {
        const el = document.querySelector(`[data-cp-id="${cpId}"]`);
        if (el) {
            lastElement = el;
            createOverlay(); // Ensure overlay exists
            updateHighlight(el);
            if (!noScroll) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    },

    onUpdateHighlight: (el) => {
        lastElement = el;
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
        if (cellHighlightBox) cellHighlightBox.style.display = 'none';
    }
};

// Initialize Messaging
window.CSSPicker.setupMessageListeners(tracker, handlers);
