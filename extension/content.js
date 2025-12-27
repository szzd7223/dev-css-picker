// content.js
console.log('CSS Picker: Content script loaded.');

let isPicking = false;
let overlayContainer = null;
let shadowRoot = null;
let highlightBox = null;
let tooltip = null;
let lastElement = null;

// The list of CSS properties we want to extract for overview/general use
const EXCLUDED_PROPERTIES = [
    'width', 'height', 'color', 'background-color', 'font-family', 'font-size',
    'font-weight', 'line-height', 'text-align', 'padding', 'margin', 'border',
    'border-radius', 'display', 'position', 'top', 'left', 'right', 'bottom',
    'z-index', 'box-shadow', 'opacity', 'visibility', 'cursor', 'box-sizing',
    'flex', 'grid', 'vertical-align', 'white-space', 'word-break'
];

// Robust color normalization using Canvas
const ctx = document.createElement('canvas').getContext('2d');

function normalizeColor(color) {
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return 'transparent';

    // Force browser to resolve color by drawing to a 1x1 canvas
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);

    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;

    if (a === 0) return 'transparent';

    const toHex = (n) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// --- Overview Extraction ---

async function extractOverviewData() {
    console.log("CSS Picker: Extracting overview data...");
    const fonts = new Map();
    const bgColors = new Map();
    const textColors = new Map();

    const selectors = 'body, h1, h2, h3, h4, h5, h6, p, a, button, span, div, li, ul, input, section, footer, header';
    const elements = document.querySelectorAll(selectors);
    const sample = Array.from(elements).slice(0, 800);

    sample.forEach(el => {
        const style = window.getComputedStyle(el);

        // Fonts
        const fontFamily = style.fontFamily;
        if (fontFamily) {
            const primary = fontFamily.split(',')[0].replace(/['"]/g, '').trim();
            if (primary) fonts.set(primary, (fonts.get(primary) || 0) + 1);
        }

        // Colors
        const bg = normalizeColor(style.backgroundColor);
        const color = normalizeColor(style.color);

        if (bg && bg !== 'transparent' && bg !== '#FFFFFF') {
            bgColors.set(bg, (bgColors.get(bg) || 0) + 1);
        }
        if (color && color !== 'transparent') {
            textColors.set(color, (textColors.get(color) || 0) + 1);
        }
    });

    const toSortedArray = (map) => {
        return Array.from(map.entries())
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => b.count - a.count);
    };

    return {
        fonts: toSortedArray(fonts),
        bgColors: toSortedArray(bgColors),
        textColors: toSortedArray(textColors),
        meta: { title: document.title, description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '' }
    };
}

// --- Overlay & Inspection ---

function createOverlay() {
    if (overlayContainer) return;

    overlayContainer = document.createElement('div');
    overlayContainer.id = 'css-picker-overlay-root';
    overlayContainer.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:2147483647;';

    document.documentElement.appendChild(overlayContainer);
    shadowRoot = overlayContainer.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
        .highlight-box {
            position: fixed;
            border: 2px solid #8B5CF6;
            background-color: rgba(139, 92, 246, 0.1);
            pointer-events: none;
            z-index: 1000;
            transition: all 0.05s ease-out;
            box-sizing: border-box;
        }
        .highlight-tag {
            position: absolute;
            top: -28px;
            left: -2px;
            background-color: #8B5CF6;
            color: white;
            padding: 4px 8px;
            border-radius: 4px 4px 0 0;
            font-size: 12px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 4px;
            white-space: nowrap;
            font-family: 'Inter', system-ui, sans-serif;
        }
        .highlight-size { margin-left: 8px; color: rgba(255,255,255,0.8); font-size: 11px; font-weight: 400; }
        .tooltip-card {
            position: fixed;
            background: white;
            border: 1px solid #E5E7EB;
            border-radius: 12px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            padding: 16px;
            width: 280px;
            pointer-events: none;
            z-index: 1010;
            font-size: 13px;
            color: #1F2937;
            display: none;
            font-family: 'Inter', system-ui, sans-serif;
        }
        .tooltip-section { margin-bottom: 12px; }
        .tooltip-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #6B7280; font-weight: 600; margin-bottom: 6px; }
        .tooltip-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .tooltip-value { font-weight: 600; color: #111827; }
        .tooltip-label { color: #6B7280; }
        .color-circle { width: 12px; height: 12px; border-radius: 50%; border: 1px solid #E5E7EB; display: inline-block; margin-right: 6px; vertical-align: middle; }
        .tag-pill { display: inline-block; color: #8B5CF6; background: #F3F4F6; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 11px; }
    `;
    shadowRoot.appendChild(style);

    highlightBox = document.createElement('div');
    highlightBox.className = 'highlight-box';
    highlightBox.innerHTML = '<div class="highlight-tag"></div>';
    highlightBox.style.display = 'none';
    shadowRoot.appendChild(highlightBox);

    tooltip = document.createElement('div');
    tooltip.className = 'tooltip-card';
    shadowRoot.appendChild(tooltip);
}

function removeOverlay() {
    if (overlayContainer) {
        overlayContainer.remove();
        overlayContainer = null;
        shadowRoot = null;
        highlightBox = null;
        tooltip = null;
    }
}

function getElementInfo(el) {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);

    const tagName = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const classes = Array.from(el.classList).map(c => `.${c}`).join('');
    const fullSelector = `${tagName}${id}${classes}`;

    const textHex = normalizeColor(style.color);
    const bgHex = normalizeColor(style.backgroundColor);

    const font = style.fontFamily.split(',')[0].replace(/['"]/g, '');
    const size = style.fontSize;
    const weight = style.fontWeight;
    const lineHeight = style.lineHeight;

    const padding = style.padding;
    const margin = style.margin;

    // For CSS Tab/Selection
    let extractedStyles = '';
    const sortedProperties = [...EXCLUDED_PROPERTIES].sort();
    sortedProperties.forEach(prop => {
        const value = style.getPropertyValue(prop);
        if (value && value !== 'none' && value !== 'normal' && value !== 'auto' && value !== '0px') {
            extractedStyles += `  ${prop}: ${value};\n`;
        }
    });

    return {
        tagName,
        fullSelector,
        html: el.outerHTML,
        css: `/* Selector: ${fullSelector} */\n{\n${extractedStyles}}`,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: rect.top,
        left: rect.left,
        colors: {
            text: textHex,
            background: bgHex
        },
        typography: {
            font,
            size,
            weight,
            lineHeight
        },
        boxModel: {
            padding,
            margin,
            display: style.display
        }
    };
}

function updateHighlight(el) {
    if (!highlightBox || !tooltip) return;
    const info = getElementInfo(el);
    const rect = el.getBoundingClientRect();

    highlightBox.style.display = 'block';
    highlightBox.style.width = `${rect.width}px`;
    highlightBox.style.height = `${rect.height}px`;
    highlightBox.style.top = `${rect.top}px`;
    highlightBox.style.left = `${rect.left}px`;

    const tagEl = highlightBox.querySelector('.highlight-tag');
    if (tagEl) {
        tagEl.innerHTML = `<span>&lt;</span>${info.tagName}<span>&gt;</span> <span class="highlight-size">${info.width} × ${info.height}</span>`;
    }

    const tooltipWidth = 280;
    const spacing = 15;
    let left = rect.right + spacing;
    let top = rect.top;

    if (left + tooltipWidth > window.innerWidth) {
        left = rect.left - tooltipWidth - spacing;
    }
    if (left < 10) left = 10;
    if (top < 10) top = 10;
    if (top + 280 > window.innerHeight) top = window.innerHeight - 280;

    tooltip.style.display = 'block';
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;

    tooltip.innerHTML = `
        <div class="tooltip-section">
            <div class="tooltip-title">Element</div>
            <div class="tag-pill">${info.fullSelector.length > 25 ? info.tagName + '...' : info.fullSelector}</div>
            <div class="tooltip-row" style="margin-top:4px;">
                <span class="tooltip-label">Size</span>
                <span class="tooltip-value">${info.width}px × ${info.height}px</span>
            </div>
        </div>
        <div class="tooltip-section">
            <div class="tooltip-title">Colors</div>
            <div class="tooltip-row">
                <span class="tooltip-label">Text</span>
                <span class="tooltip-value"><span class="color-circle" style="background:${info.colors.text}"></span>${info.colors.text}</span>
            </div>
             <div class="tooltip-row">
                <span class="tooltip-label">Background</span>
                <span class="tooltip-value"><span class="color-circle" style="background:${info.colors.background === 'transparent' ?
            '#fff' : info.colors.background}"></span>${info.colors.background}</span>
            </div>
        </div>
        <div class="tooltip-section">
            <div class="tooltip-title">Typography</div>
            <div class="tooltip-row">
                <span class="tooltip-label">Font</span>
                <span class="tooltip-value" style="max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${info.typography.font}</span>
            </div>
            <div class="tooltip-row">
                <span class="tooltip-label">Size</span>
                <span class="tooltip-value">${info.typography.size} (${info.typography.weight})</span>
            </div>
        </div>
    `;
}

// --- Interaction Handlers ---

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
    e.preventDefault();
    e.stopPropagation();

    if (lastElement) {
        const info = getElementInfo(lastElement);
        chrome.runtime.sendMessage({ type: 'ELEMENT_SELECTED', payload: info });
    }
}

// --- Unified Message Listener ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'SCAN_PAGE') {
        extractOverviewData().then(data => sendResponse(data));
        return true;
    } else if (request.type === 'START_PICKING') {
        if (!isPicking) {
            isPicking = true;
            createOverlay();
            document.addEventListener('mousemove', handleMouseMove, { passive: true });
            document.addEventListener('click', handleClick, { capture: true });
            console.log('CSS Picker: Inspect Mode ON');
        }
    } else if (request.type === 'STOP_PICKING') {
        if (isPicking) {
            isPicking = false;
            removeOverlay();
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('click', handleClick, { capture: true });
            lastElement = null;
            console.log('CSS Picker: Inspect Mode OFF');
        }
    }
});
