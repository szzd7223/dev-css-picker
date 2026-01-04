// content.js
console.log('CSS Picker: Content script loaded.');

let isPicking = false;
let overlayContainer = null;
let shadowRoot = null;
let highlightBox = null;
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
function getElementInfo(el) {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return {
        cpId: getOrAssignId(el),
        tagName: el.tagName.toLowerCase(),
        fullSelector: `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${Array.from(el.classList).map(c => '.' + c).join('')}`,
        html: el.outerHTML.substring(0, 1000),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: rect.top,
        left: rect.left,
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
            gridTemplateRows: style.gridTemplateRows
        },
        hierarchy: getShallowHierarchy(el)
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
        // 1. Check for Images & Backgrounds
        const url = getImageUrl(el);
        if (url && !url.startsWith('data:')) {
            const rect = el.getBoundingClientRect();
            if (rect.width >= 10 && rect.height >= 10) {
                const style = window.getComputedStyle(el);
                const isBg = el.tagName !== 'IMG';
                assets.push({
                    cpId: getOrAssignId(el),
                    url: url,
                    tagName: el.tagName.toLowerCase(),
                    type: isBg ? 'Background' : 'Image',
                    renderedSize: {
                        width: Math.round(rect.width),
                        height: Math.round(rect.height)
                    },
                    intrinsicSize: el.tagName === 'IMG' ? {
                        width: el.naturalWidth,
                        height: el.naturalHeight
                    } : null,
                    styles: {
                        objectFit: style.objectFit,
                        objectPosition: style.objectPosition,
                        borderRadius: style.borderRadius,
                        opacity: style.opacity,
                        overflow: style.overflow,
                        backgroundSize: style.backgroundSize,
                        backgroundPosition: style.backgroundPosition,
                        backgroundRepeat: style.backgroundRepeat,
                        zIndex: style.zIndex // Phase 2 requirement
                    }
                });
            }
        }

        // 2. Check for Inline SVGs
        if (el.tagName === 'svg') {
            const rect = el.getBoundingClientRect();
            if (rect.width >= 10 && rect.height >= 10) {
                const style = window.getComputedStyle(el);
                assets.push({
                    cpId: getOrAssignId(el),
                    url: null, // Inline SVGs don't represent as a URL easily for this list, but we track them
                    tagName: 'svg',
                    type: 'SVG',
                    renderedSize: {
                        width: Math.round(rect.width),
                        height: Math.round(rect.height)
                    },
                    styles: {
                        opacity: style.opacity,
                        zIndex: style.zIndex,
                        pointerEvents: style.pointerEvents
                    },
                    svgInfo: {
                        viewBox: el.getAttribute('viewBox'),
                        fill: style.fill,
                        stroke: style.stroke
                    }
                });
            }
        }
    });

    // De-duplicate by URL for images ( SVGs are unique by ID usually, so we keep them all or dedup by content hash? 
    // For now, simpler to just list them all as "Page SVGs" since selection is by DOM node anyway).
    const seenUrls = new Set();
    return assets.filter(asset => {
        if (asset.type === 'SVG') return true; // Keep all SVGs
        if (seenUrls.has(asset.url)) return false;
        seenUrls.add(asset.url);
        return true;
    });
}

// Global Message Listener Update
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'SCAN_PAGE') {
        extractOverviewData().then(sendResponse);
        return true;
    }

    if (request.type === 'SCAN_ASSETS') {
        extractAssetsData().then(sendResponse);
        return true;
    }

    if (request.type === 'START_PICKING') {
        if (!isPicking) {
            isPicking = true;
            createOverlay();
            document.addEventListener('mousemove', handleMouseMove, { passive: true });
            document.addEventListener('click', handleClick, { capture: true });
        }
    } else if (request.type === 'STOP_PICKING') {
        if (isPicking) {
            isPicking = false;
            removeOverlay();
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('click', handleClick, { capture: true });
            lastElement = null;
        }
    } else if (request.type === 'UPDATE_CLASSES') {
        const { cpId, className } = request.payload;
        const el = document.querySelector(`[data-cp-id="${cpId}"]`);
        if (el) {
            el.className = className;
            lastElement = el;
            createOverlay();
            updateHighlight(el);
        }
    } else if (request.type === 'UPDATE_STYLE') {
        const { cpId, styles } = request.payload;
        const el = document.querySelector(`[data-cp-id="${cpId}"]`);
        if (el) {
            Object.entries(styles).forEach(([p, v]) => {
                if (typeof v === 'object' && v !== null && (p === 'padding' || p === 'margin' || p === 'borderRadius')) {
                    if (p === 'borderRadius') {
                        el.style.borderTopLeftRadius = v.topLeft;
                        el.style.borderTopRightRadius = v.topRight;
                        el.style.borderBottomRightRadius = v.bottomRight;
                        el.style.borderBottomLeftRadius = v.bottomLeft;
                    } else {
                        el.style[`${p}Top`] = v.top;
                        el.style[`${p}Right`] = v.right;
                        el.style[`${p}Bottom`] = v.bottom;
                        el.style[`${p}Left`] = v.left;
                    }
                } else {
                    el.style[p] = v;
                }
            });
            // Snap highlight to the element being manipulated
            lastElement = el;
            createOverlay();
            updateHighlight(el);
        }
    } else if (request.type === 'HIGHLIGHT_NODE') {
        const el = document.querySelector(`[data-cp-id="${request.payload.cpId}"]`);
        if (el) {
            lastElement = el;
            createOverlay(); // Ensure overlay exists
            updateHighlight(el);
            if (!request.payload.noScroll) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    } else if (request.type === 'SELECT_NODE') {
        const el = document.querySelector(`[data-cp-id="${request.payload.cpId}"]`);
        if (el) {
            const info = getElementInfo(el);
            // Add image specific info if it's an image or has background
            const url = getImageUrl(el);
            if (url) {
                const style = window.getComputedStyle(el);
                info.imageInfo = {
                    url,
                    intrinsicSize: el.tagName === 'IMG' ? { width: el.naturalWidth, height: el.naturalHeight } : null,
                    renderedSize: { width: Math.round(el.getBoundingClientRect().width), height: Math.round(el.getBoundingClientRect().height) },
                    type: el.tagName === 'IMG' ? 'Image' : 'Background',
                    styles: {
                        objectFit: style.objectFit,
                        objectPosition: style.objectPosition,
                        borderRadius: style.borderRadius,
                        opacity: style.opacity,
                        backgroundSize: style.backgroundSize,
                        backgroundPosition: style.backgroundPosition,
                        backgroundRepeat: style.backgroundRepeat
                    }
                };
            }
            lastElement = el;
            sendResponse(info);
        }
    }
});
