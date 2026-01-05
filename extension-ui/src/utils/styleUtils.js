
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

const RADIUS_SCALE = {
    'none': '0px', 'sm': '0.125rem', '': '0.25rem', 'md': '0.375rem', 'lg': '0.5rem',
    'xl': '0.75rem', '2xl': '1rem', '3xl': '1.5rem', 'full': '9999px'
};

const FONT_SIZE_SCALE = {
    'xs': '0.75rem', 'sm': '0.875rem', 'base': '1rem', 'lg': '1.125rem', 'xl': '1.25rem',
    '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem', '6xl': '3.75rem',
    '7xl': '4.5rem', '8xl': '6rem', '9xl': '8rem'
};

function getTwClassFromScale(value, prefix, scale) {
    if (!value || value === '0px' || value === 'none') return '';
    if (value === 'transparent' || value === 'rgba(0, 0, 0, 0)') return '';

    let pxVal = 0;
    if (value.endsWith('px')) pxVal = parseFloat(value);
    else if (value.endsWith('rem')) pxVal = parseFloat(value) * 16;
    else return `${prefix}-[${value}]`;

    let closest = null;
    let minDiff = Infinity;
    for (const [key, valStr] of Object.entries(scale)) {
        let pixelRef = valStr.endsWith('px') ? parseFloat(valStr) : parseFloat(valStr) * 16;
        const diff = Math.abs(pxVal - pixelRef);
        if (diff < minDiff) { minDiff = diff; closest = key; }
    }

    if (minDiff < 2) {
        if (prefix === 'rounded' && closest === '') return 'rounded';
        return `${prefix}${closest ? '-' + closest : ''}`;
    }
    return `${prefix}-[${value}]`;
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
        if (fg.alignItems && fg.alignItems !== 'normal') classes.push(`items-${fg.alignItems.replace('flex-', '')}`);
        if (fg.justifyContent && fg.justifyContent !== 'normal') classes.push(`justify-${fg.justifyContent.replace('flex-', '')}`);
        if (fg.gap) classes.push(getTwClassFromScale(fg.gap, 'gap', SPACING_SCALE));
    }

    if (styles.display === 'grid') {
        if (fg.gridTemplateColumns && fg.gridTemplateColumns !== 'none') {
            const repeatMatch = fg.gridTemplateColumns.match(/repeat\((\d+),/);
            const parts = fg.gridTemplateColumns.trim().split(/\s+(?![^()]*\))/);
            const count = repeatMatch ? repeatMatch[1] : parts.length;
            if ([1, 2, 3, 4, 5, 6, 8, 10, 12].includes(Number(count)) && !fg.gridTemplateColumns.includes('minmax')) {
                classes.push(`grid-cols-${count}`);
            } else if (fg.gridTemplateColumns.includes('auto-fit')) {
                classes.push('grid-cols-[repeat(auto-fit,minmax(0,1fr))]');
            } else {
                classes.push(`grid-cols-[${fg.gridTemplateColumns.replace(/\s+/g, '_')}]`);
            }
        }
        if (fg.gridAutoFlow) {
            const flowMap = { 'row': 'grid-flow-row', 'column': 'grid-flow-col', 'dense': 'grid-flow-dense', 'row dense': 'grid-flow-row-dense', 'column dense': 'grid-flow-col-dense' };
            if (flowMap[fg.gridAutoFlow]) classes.push(flowMap[fg.gridAutoFlow]);
        }
        if (fg.gap) classes.push(getTwClassFromScale(fg.gap, 'gap', SPACING_SCALE));
        if (fg.rowGap && fg.rowGap !== fg.gap) classes.push(getTwClassFromScale(fg.rowGap, 'gap-y', SPACING_SCALE));
        if (fg.columnGap && fg.columnGap !== fg.gap) classes.push(getTwClassFromScale(fg.columnGap, 'gap-x', SPACING_SCALE));
    }

    // Size
    if (styles.width) {
        if (styles.width === 'auto') classes.push('w-auto');
        else if (styles.width === '100%') classes.push('w-full');
        else if (styles.width === '100vw') classes.push('w-screen');
        else classes.push(getTwClassFromScale(styles.width, 'w', SPACING_SCALE));
    }
    if (styles.height) {
        if (styles.height === 'auto') classes.push('h-auto');
        else if (styles.height === '100%') classes.push('h-full');
        else if (styles.height === '100vh') classes.push('h-screen');
        else classes.push(getTwClassFromScale(styles.height, 'h', SPACING_SCALE));
    }

    // Typography
    if (styles.color) classes.push(getTwColor(styles.color, 'text'));
    if (styles.fontSize) classes.push(getTwClassFromScale(styles.fontSize, 'text', FONT_SIZE_SCALE));

    const weightMap = { '100': 'font-thin', '200': 'font-extralight', '300': 'font-light', '400': 'font-normal', '500': 'font-medium', '600': 'font-semibold', '700': 'font-bold', '800': 'font-extrabold', '900': 'font-black' };
    if (styles.fontWeight && weightMap[styles.fontWeight]) classes.push(weightMap[styles.fontWeight]);

    // Spacing
    const handleSpacing = (prop, prefix) => {
        const val = styles[prop];
        if (!val) return;

        if (typeof val === 'string') {
            classes.push(getTwClassFromScale(val, prefix, SPACING_SCALE));
        } else if (typeof val === 'object') {
            const { top, right, bottom, left } = val;
            // Check for equality (All sides same)
            if (top === right && top === bottom && top === left) {
                if (top && top !== '0px') classes.push(getTwClassFromScale(top, prefix, SPACING_SCALE));
            }
            // Check for X/Y
            else if (top === bottom && right === left) {
                if (top && top !== '0px') classes.push(getTwClassFromScale(top, `${prefix}y`, SPACING_SCALE));
                if (right && right !== '0px') classes.push(getTwClassFromScale(right, `${prefix}x`, SPACING_SCALE));
            }
            // Individual
            else {
                if (top && top !== '0px') classes.push(getTwClassFromScale(top, `${prefix}t`, SPACING_SCALE));
                if (right && right !== '0px') classes.push(getTwClassFromScale(right, `${prefix}r`, SPACING_SCALE));
                if (bottom && bottom !== '0px') classes.push(getTwClassFromScale(bottom, `${prefix}b`, SPACING_SCALE));
                if (left && left !== '0px') classes.push(getTwClassFromScale(left, `${prefix}l`, SPACING_SCALE));
            }
        }
    };

    handleSpacing('padding', 'p');
    handleSpacing('margin', 'm');

    // Background
    if (styles.backgroundColor && styles.backgroundColor !== 'transparent') classes.push(getTwColor(styles.backgroundColor, 'bg'));

    // Border
    if (styles.borderRadius) {
        const val = styles.borderRadius;
        if (typeof val === 'string') {
            classes.push(getTwClassFromScale(val, 'rounded', RADIUS_SCALE));
        } else if (typeof val === 'object') {
            const { topLeft, topRight, bottomRight, bottomLeft } = val;
            // All same
            if (topLeft === topRight && topLeft === bottomRight && topLeft === bottomLeft) {
                if (topLeft && topLeft !== '0px') classes.push(getTwClassFromScale(topLeft, 'rounded', RADIUS_SCALE));
            }
            // Top/Bottom (e.g. rounded-t-lg)
            else if (topLeft === topRight && bottomLeft === bottomRight && topLeft !== bottomLeft) {
                if (topLeft && topLeft !== '0px') classes.push(getTwClassFromScale(topLeft, 'rounded-t', RADIUS_SCALE));
                if (bottomLeft && bottomLeft !== '0px') classes.push(getTwClassFromScale(bottomLeft, 'rounded-b', RADIUS_SCALE));
            }
            // Left/Right
            else if (topLeft === bottomLeft && topRight === bottomRight && topLeft !== topRight) {
                if (topLeft && topLeft !== '0px') classes.push(getTwClassFromScale(topLeft, 'rounded-l', RADIUS_SCALE));
                if (topRight && topRight !== '0px') classes.push(getTwClassFromScale(topRight, 'rounded-r', RADIUS_SCALE));
            }
            // Individual
            else {
                if (topLeft && topLeft !== '0px') classes.push(getTwClassFromScale(topLeft, 'rounded-tl', RADIUS_SCALE));
                if (topRight && topRight !== '0px') classes.push(getTwClassFromScale(topRight, 'rounded-tr', RADIUS_SCALE));
                if (bottomRight && bottomRight !== '0px') classes.push(getTwClassFromScale(bottomRight, 'rounded-br', RADIUS_SCALE));
                if (bottomLeft && bottomLeft !== '0px') classes.push(getTwClassFromScale(bottomLeft, 'rounded-bl', RADIUS_SCALE));
            }
        }
    }
    if (styles.borderWidth && styles.borderWidth !== '0px') classes.push(`border-[${styles.borderWidth}]`);
    if (styles.borderColor) classes.push(getTwColor(styles.borderColor, 'border'));

    return classes.join(' ');
}

export function cleanStyleValue(val) {
    if (!val) return undefined;
    if (typeof val === 'object') {
        const out = {};
        for (const k in val) {
            out[k] = cleanStyleValue(val[k]);
        }
        return out;
    }
    return val;
}
