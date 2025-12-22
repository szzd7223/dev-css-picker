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
    }
});

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
