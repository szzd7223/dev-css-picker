
// Map of common CSS values to Tailwind classes
// This is a "best effort" mapping for the live editor

const SPACING_SCALE = {
    '0': '0px', 'px': '1px', '0.5': '0.125rem', '1': '0.25rem', '1.5': '0.375rem', '2': '0.5rem',
    '2.5': '0.625rem', '3': '0.75rem', '3.5': '0.875rem', '4': '1rem', '5': '1.25rem',
    '6': '1.5rem', '7': '1.75rem', '8': '2rem', '9': '2.25rem', '10': '2.5rem',
    '11': '2.75rem', '12': '3rem', '14': '3.5rem', '16': '4rem', '20': '5rem',
    '24': '6rem', '28': '7rem', '32': '8rem', '36': '9rem', '40': '10rem',
    '44': '11rem', '48': '12rem', '52': '13rem', '56': '14rem', '60': '15rem',
    '64': '16rem', '72': '18rem', '80': '20rem', '96': '24rem'
};

function getTwSpacing(value, prefix) {
    if (!value || value === '0px' || value === 'none') return '';
    let pxVal = 0;
    if (value.endsWith('px')) pxVal = parseFloat(value);
    else if (value.endsWith('rem')) pxVal = parseFloat(value) * 16;
    else return `${prefix}-[${value}]`;

    let closest = null;
    let minDiff = Infinity;
    for (const [key, valStr] of Object.entries(SPACING_SCALE)) {
        let pixelRef = valStr.endsWith('px') ? parseFloat(valStr) : parseFloat(valStr) * 16;
        const diff = Math.abs(pxVal - pixelRef);
        if (diff < minDiff) { minDiff = diff; closest = key; }
    }
    return minDiff < 2 ? `${prefix}-${closest}` : `${prefix}-[${value}]`;
}

function getTwColor(value, prefix) {
    if (!value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)') return '';
    return `${prefix}-[${value}]`;
}

export function generateTailwindClasses(styles) {
    const classes = [];

    // Layout (Display)
    if (styles.display) {
        const dMap = { 'block': 'block', 'flex': 'flex', 'grid': 'grid', 'inline-block': 'inline-block', 'none': 'hidden' };
        if (dMap[styles.display]) classes.push(dMap[styles.display]);
    }

    // Flex/Grid specific
    const fg = styles.flexGrid || {};
    if (styles.display === 'flex') {
        if (fg.flexDirection === 'column') classes.push('flex-col');
        if (fg.alignItems) classes.push(`items-${fg.alignItems}`);
        if (fg.justifyContent) classes.push(`justify-${fg.justifyContent.replace('flex-', '')}`);
        if (fg.gap) classes.push(getTwSpacing(fg.gap, 'gap'));
    }

    if (styles.display === 'grid') {
        if (fg.gridTemplateColumns) classes.push('grid-cols-[repeat(auto-fit,minmax(0,1fr))]');
        if (fg.gap) classes.push(getTwSpacing(fg.gap, 'gap'));
    }

    // Size
    if (styles.width) {
        if (styles.width === 'auto') classes.push('w-auto');
        else classes.push(getTwSpacing(styles.width, 'w'));
    }
    if (styles.height) {
        if (styles.height === 'auto') classes.push('h-auto');
        else classes.push(getTwSpacing(styles.height, 'h'));
    }

    // Typography
    if (styles.color) classes.push(getTwColor(styles.color, 'text'));
    if (styles.fontSize) classes.push(getTwSpacing(styles.fontSize, 'text').replace('text-', 'text-'));

    const weightMap = { '100': 'font-thin', '200': 'font-extralight', '300': 'font-light', '400': 'font-normal', '500': 'font-medium', '600': 'font-semibold', '700': 'font-bold', '800': 'font-extrabold', '900': 'font-black' };
    if (styles.fontWeight && weightMap[styles.fontWeight]) classes.push(weightMap[styles.fontWeight]);

    // Spacing
    const handleSpacing = (prop, prefix) => {
        const val = styles[prop];
        if (!val) return;

        if (typeof val === 'string') {
            classes.push(getTwSpacing(val, prefix));
        } else if (typeof val === 'object') {
            const { top, right, bottom, left } = val;
            // Check for equality (All sides same)
            if (top === right && top === bottom && top === left) {
                if (top) classes.push(getTwSpacing(top, prefix));
            }
            // Check for X/Y
            else if (top === bottom && right === left) {
                if (top) classes.push(getTwSpacing(top, `${prefix}y`));
                if (right) classes.push(getTwSpacing(right, `${prefix}x`));
            }
            // Individual
            else {
                if (top) classes.push(getTwSpacing(top, `${prefix}t`));
                if (right) classes.push(getTwSpacing(right, `${prefix}r`));
                if (bottom) classes.push(getTwSpacing(bottom, `${prefix}b`));
                if (left) classes.push(getTwSpacing(left, `${prefix}l`));
            }
        }
    };

    handleSpacing('padding', 'p');
    handleSpacing('margin', 'm');

    // Background
    if (styles.backgroundColor && styles.backgroundColor !== 'transparent') classes.push(getTwColor(styles.backgroundColor, 'bg'));

    // Border
    // Border
    if (styles.borderRadius) {
        const val = styles.borderRadius;
        if (typeof val === 'string') {
            classes.push(getTwSpacing(val, 'rounded').replace('rounded-', 'rounded-'));
        } else if (typeof val === 'object') {
            const { topLeft, topRight, bottomRight, bottomLeft } = val;
            // All same
            if (topLeft === topRight && topLeft === bottomRight && topLeft === bottomLeft) {
                if (topLeft && topLeft !== '0px') classes.push(getTwSpacing(topLeft, 'rounded').replace('rounded-', 'rounded-'));
            }
            // Top/Bottom (e.g. rounded-t-lg)
            else if (topLeft === topRight && bottomLeft === bottomRight && topLeft !== bottomLeft) {
                if (topLeft && topLeft !== '0px') classes.push(getTwSpacing(topLeft, 'rounded-t'));
                if (bottomLeft && bottomLeft !== '0px') classes.push(getTwSpacing(bottomLeft, 'rounded-b'));
            }
            // Left/Right
            else if (topLeft === bottomLeft && topRight === bottomRight && topLeft !== topRight) {
                if (topLeft && topLeft !== '0px') classes.push(getTwSpacing(topLeft, 'rounded-l'));
                if (topRight && topRight !== '0px') classes.push(getTwSpacing(topRight, 'rounded-r'));
            }
            // Individual
            else {
                if (topLeft && topLeft !== '0px') classes.push(getTwSpacing(topLeft, 'rounded-tl'));
                if (topRight && topRight !== '0px') classes.push(getTwSpacing(topRight, 'rounded-tr'));
                if (bottomRight && bottomRight !== '0px') classes.push(getTwSpacing(bottomRight, 'rounded-br'));
                if (bottomLeft && bottomLeft !== '0px') classes.push(getTwSpacing(bottomLeft, 'rounded-bl'));
            }
        }
    }
    if (styles.borderWidth && styles.borderWidth !== '0px') classes.push(`border-[${styles.borderWidth}]`);
    if (styles.borderColor) classes.push(getTwColor(styles.borderColor, 'border'));

    return classes.join(' ');
}
