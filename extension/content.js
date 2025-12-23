// Content script
console.log('CSS Picker: Content script loaded.');

let isPicking = false;
let highlighedElement = null;

// The list of CSS properties we want to extract
const EXCLUDED_PROPERTIES = [
    'width', 'height', 'color', 'background-color', 'font-family', 'font-size',
    'font-weight', 'line-height', 'text-align', 'padding', 'margin', 'border',
    'border-radius', 'display', 'position', 'top', 'left', 'right', 'bottom',
    'z-index', 'box-shadow', 'opacity', 'visibility', 'cursor', 'box-sizing',
    'flex', 'grid', 'vertical-align', 'white-space', 'word-break'
];

// Listen for messages from the popup/sidebar
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'START_PICKING') {
        isPicking = true;
        document.body.style.cursor = 'crosshair';
        console.log('CSS Picker: Picker mode activated');
    } else if (request.type === 'SCAN_PAGE') {
        extractOverviewData().then(data => sendResponse(data));
        return true; // Keep channel open for async response
    }
});

// Robust color normalization using Canvas
const ctx = document.createElement('canvas').getContext('2d');

function normalizeColor(color) {
    if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return null;
    ctx.fillStyle = color;
    // Canvas always returns hex #RRGGBB or rgba() for alpha
    let computed = ctx.fillStyle;

    // If it's still not hex (e.g. rgba), convert it
    if (computed.startsWith('#')) {
        return computed.toUpperCase();
    }
    // Handle rare cases where canvas might return rgb/rgba string
    if (computed.startsWith('rgb')) {
        const parts = computed.match(/[\d.]+/g);
        if (!parts || parts.length < 3) return null;

        const r = parseInt(parts[0]).toString(16).padStart(2, '0');
        const g = parseInt(parts[1]).toString(16).padStart(2, '0');
        const b = parseInt(parts[2]).toString(16).padStart(2, '0');

        // Ignore low alpha
        if (parts[3] && parseFloat(parts[3]) === 0) return null;

        return `#${r}${g}${b}`.toUpperCase();
    }
    return null;
}

async function extractOverviewData() {
    const fonts = new Map(); // font -> count
    const bgColors = new Map(); // hex -> count
    const textColors = new Map(); // hex -> count

    // Elements to sample for overview. We don't scan EVERYTHING to save perf.
    const selectors = 'body, h1, h2, h3, h4, h5, h6, p, a, button, span, div, li, ul, input, section, footer, header';
    const elements = document.querySelectorAll(selectors);

    // Limit processing to first 800 relevant elements
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
        // Colors
        const bg = normalizeColor(style.backgroundColor);
        const color = normalizeColor(style.color);

        if (bg && bg !== '#FFFFFF') {
            bgColors.set(bg, (bgColors.get(bg) || 0) + 1);
        }
        if (color) {
            textColors.set(color, (textColors.get(color) || 0) + 1);
        }
    });

    // Helper to format map to sorted array
    const toSortedArray = (map) => {
        return Array.from(map.entries())
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => b.count - a.count);
    };

    // Simple meta extraction
    const title = document.title;
    const descEl = document.querySelector('meta[name="description"]');
    const description = descEl ? descEl.getAttribute('content') : '';

    return {
        fonts: toSortedArray(fonts),
        bgColors: toSortedArray(bgColors),
        textColors: toSortedArray(textColors),
        meta: { title, description }
    };
}

// Highlight element on mouse over
document.addEventListener('mouseover', (event) => {
    if (!isPicking) return;

    const target = event.target;

    if (highlighedElement && highlighedElement !== target) {
        highlighedElement.style.outline = '';
    }

    highlighedElement = target;
    highlighedElement.style.outline = '2px solid #007bff'; // Use a nicer blue for the highlight
});

// Select element on click
document.addEventListener('click', (event) => {
    if (!isPicking) return;

    event.preventDefault();
    event.stopPropagation();

    const target = event.target;

    if (highlighedElement) {
        highlighedElement.style.outline = '';
        highlighedElement = null;
    }
    isPicking = false;
    document.body.style.cursor = 'default';

    const html = target.outerHTML;
    const computedStyle = window.getComputedStyle(target);

    // Build the CSS text
    let extractedStyles = '';

    // Sort properties for better readability
    const sortedProperties = [...EXCLUDED_PROPERTIES].sort();

    sortedProperties.forEach(prop => {
        const value = computedStyle.getPropertyValue(prop);
        if (value && value !== 'none' && value !== 'normal' && value !== 'auto' && value !== '0px') {
            extractedStyles += `  ${prop}: ${value};\n`;
        }
    });

    const tagName = target.tagName.toLowerCase();
    const className = target.className ? `.${target.className.split(' ').join('.')}` : '';
    const id = target.id ? `#${target.id}` : '';

    const selector = `${tagName}${id}${className}`;

    const cssContent = `/* Selected Element: ${selector} */\n{\n${extractedStyles}}`;

    // Send back to runtime (popup/sidebar)
    chrome.runtime.sendMessage({
        type: 'ELEMENT_SELECTED',
        html: html,
        css: cssContent
    });
});
