import { cleanStyleValue } from './styleUtils';

// Re-using the scales from styleUtils or defining them here if we want to fully decouple.
// For now, let's keep them self-contained here to ensure this module is standalone for the store.

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
    'xl': '0.75rem', '2xl': '1rem', '3xl': '1.5rem', '4xl': '2rem', 'full': '9999px'
};

const FONT_SIZE_SCALE = {
    'xs': '0.75rem', 'sm': '0.875rem', 'base': '1rem', 'lg': '1.125rem', 'xl': '1.25rem',
    '2xl': '1.5rem', '3xl': '1.875rem', '4xl': '2.25rem', '5xl': '3rem', '6xl': '3.75rem',
    '7xl': '4.5rem', '8xl': '6rem', '9xl': '8rem'
};

function getTwClassFromScale(value, prefix, scale) {
    if (!value || value === '0px' || value === 'none') return '';
    if (String(value) === 'transparent' || String(value) === 'rgba(0, 0, 0, 0)') return '';

    let valStr = String(value);
    let pxVal = 0;
    if (valStr.endsWith('px')) pxVal = parseFloat(valStr);
    else if (valStr.endsWith('rem')) pxVal = parseFloat(valStr) * 16;
    else return `${prefix}-[${valStr}]`;

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
            // Simplified detection logic
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

    // Typography Extras
    if (styles.textAlign) {
        const alignMap = { 'left': 'text-left', 'center': 'text-center', 'right': 'text-right', 'justify': 'text-justify' };
        if (alignMap[styles.textAlign]) classes.push(alignMap[styles.textAlign]);
    }
    if (styles.textTransform) {
        const transformMap = { 'uppercase': 'uppercase', 'lowercase': 'lowercase', 'capitalize': 'capitalize' };
        if (transformMap[styles.textTransform]) classes.push(transformMap[styles.textTransform]);
    }
    if (styles.textDecoration && styles.textDecoration !== 'none') {
        const decMap = { 'underline': 'underline', 'line-through': 'line-through', 'no-underline': 'no-underline', 'overline': 'overline' };
        if (decMap[styles.textDecoration] || styles.textDecoration.includes(' ')) classes.push(decMap[styles.textDecoration] || `decoration-[${styles.textDecoration}]`);
    }
    if (styles.lineHeight && styles.lineHeight !== 'normal') classes.push(`leading-[${styles.lineHeight}]`);
    if (styles.letterSpacing && styles.letterSpacing !== 'normal') classes.push(`tracking-[${styles.letterSpacing}]`);


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

    // Background & Effects
    if (styles.backgroundColor && styles.backgroundColor !== 'transparent') classes.push(getTwColor(styles.backgroundColor, 'bg'));

    if (styles.opacity && String(styles.opacity) !== '1') {
        const opVal = parseFloat(styles.opacity);
        // Map to step if close, else arbitrary
        const step = Math.round(opVal * 100);
        if (step % 5 === 0) classes.push(`opacity-${step}`);
        else classes.push(`opacity-[${opVal}]`);
    }

    if (styles.boxShadow && styles.boxShadow !== 'none') {
        // Simple heuristic for common shadows could go here, for now arbitrary to ensure exactness
        classes.push(`shadow-[${styles.boxShadow.replace(/\s+/g, '_')}]`);
    }

    if (styles.mixBlendMode && styles.mixBlendMode !== 'normal') {
        classes.push(`mix-blend-${styles.mixBlendMode}`);
    }

    // Border
    if (styles.borderRadius) {
        const val = styles.borderRadius;
        if (val === '50%') {
            classes.push('rounded-full');
        } else if (typeof val === 'string') {
            classes.push(getTwClassFromScale(val, 'rounded', RADIUS_SCALE));
        } else if (typeof val === 'object') {
            const { topLeft, topRight, bottomRight, bottomLeft } = val;
            // All same
            if (topLeft === topRight && topLeft === bottomRight && topLeft === bottomLeft) {
                if (topLeft === '50%') classes.push('rounded-full');
                else if (topLeft && topLeft !== '0px') classes.push(getTwClassFromScale(topLeft, 'rounded', RADIUS_SCALE));
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
    if (styles.borderStyle && styles.borderStyle !== 'solid' && styles.borderStyle !== 'none') {
        classes.push(`border-${styles.borderStyle}`);
    }

    // Positioning
    if (styles.position && styles.position !== 'static') {
        const pMap = { 'relative': 'relative', 'absolute': 'absolute', 'fixed': 'fixed', 'sticky': 'sticky' };
        if (pMap[styles.position]) classes.push(pMap[styles.position]);

        const handlePos = (prop, prefix) => {
            if (styles[prop] === 'auto') classes.push(`${prefix}-auto`);
            else if (styles[prop]) classes.push(getTwClassFromScale(styles[prop], prefix, SPACING_SCALE));
        };
        handlePos('top', 'top');
        handlePos('right', 'right');
        handlePos('bottom', 'bottom');
        handlePos('left', 'left');
    }
    if (styles.zIndex && styles.zIndex !== 'auto') classes.push(`z-[${styles.zIndex}]`);

    // Transforms & Interactivity
    if (styles.transform && styles.transform !== 'none') {
        // Tailwind has explicit transform utility but purely arbitrary transform works best for complex matrix strings
        // If it's simple like "rotate(45deg)", we could parse, but "transform-[...]" is safest for exact match
        classes.push(`[transform:${styles.transform.replace(/\s+/g, '_')}]`);
    }
    if (styles.cursor && styles.cursor !== 'auto' && styles.cursor !== 'default') {
        classes.push(`cursor-${styles.cursor}`);
    }

    return classes.join(' ');
}

export function generateCSS(styles, tagName = 'element') {
    const cssLines = [];

    // Core Layout
    cssLines.push(`  display: ${styles.display || 'block'};`);
    if (styles.width) cssLines.push(`  width: ${styles.width};`);
    if (styles.height) cssLines.push(`  height: ${styles.height};`);
    if (styles.color) cssLines.push(`  color: ${styles.color};`);

    if (styles.backgroundColor && styles.backgroundColor !== 'transparent') {
        cssLines.push(`  background-color: ${styles.backgroundColor};`);
    }

    // Effects & Visuals
    if (styles.opacity && String(styles.opacity) !== '1') cssLines.push(`  opacity: ${styles.opacity};`);
    if (styles.boxShadow && styles.boxShadow !== 'none') cssLines.push(`  box-shadow: ${styles.boxShadow};`);
    if (styles.mixBlendMode && styles.mixBlendMode !== 'normal') cssLines.push(`  mix-blend-mode: ${styles.mixBlendMode};`);

    // Border
    if (styles.borderWidth && styles.borderWidth !== '0px') cssLines.push(`  border-width: ${styles.borderWidth};`);
    if (styles.borderColor) cssLines.push(`  border-color: ${styles.borderColor};`);
    if (styles.borderStyle && styles.borderStyle !== 'solid' && styles.borderStyle !== 'none') cssLines.push(`  border-style: ${styles.borderStyle};`);

    // Transforms & Interactivity
    if (styles.transform && styles.transform !== 'none') cssLines.push(`  transform: ${styles.transform};`);
    if (styles.cursor && styles.cursor !== 'auto') cssLines.push(`  cursor: ${styles.cursor};`);


    // Positioning
    if (styles.position && styles.position !== 'static') {
        cssLines.push(`  position: ${styles.position};`);
        if (styles.top) cssLines.push(`  top: ${styles.top};`);
        if (styles.right) cssLines.push(`  right: ${styles.right};`);
        if (styles.bottom) cssLines.push(`  bottom: ${styles.bottom};`);
        if (styles.left) cssLines.push(`  left: ${styles.left};`);
        if (styles.zIndex) cssLines.push(`  z-index: ${styles.zIndex};`);
    }

    // Box Model (Padding/Margin)
    const formatSpacing = (val) => {
        if (typeof val === 'string') return val;
        if (typeof val === 'object') {
            if (val.top === val.bottom && val.left === val.right) {
                return val.top === val.left ? val.top : `${val.top} ${val.left}`;
            }
            return `${val.top} ${val.right} ${val.bottom} ${val.left}`;
        }
        return undefined;
    };

    if (styles.padding) {
        const p = formatSpacing(styles.padding);
        if (p) cssLines.push(`  padding: ${p};`);
    }
    if (styles.margin) {
        const m = formatSpacing(styles.margin);
        if (m) cssLines.push(`  margin: ${m};`);
    }

    // Typography
    if (styles.fontSize) cssLines.push(`  font-size: ${styles.fontSize};`);
    if (styles.fontWeight) cssLines.push(`  font-weight: ${styles.fontWeight};`);
    if (styles.textAlign && styles.textAlign !== 'start') cssLines.push(`  text-align: ${styles.textAlign};`);
    if (styles.lineHeight && styles.lineHeight !== 'normal') cssLines.push(`  line-height: ${styles.lineHeight};`);
    if (styles.letterSpacing && styles.letterSpacing !== 'normal') cssLines.push(`  letter-spacing: ${styles.letterSpacing};`);
    if (styles.textTransform && styles.textTransform !== 'none') cssLines.push(`  text-transform: ${styles.textTransform};`);
    if (styles.textDecoration && !styles.textDecoration.includes('none')) cssLines.push(`  text-decoration: ${styles.textDecoration};`);

    // Flex/Grid
    if (styles.display === 'flex') {
        const fg = styles.flexGrid || {};
        if (fg.flexDirection) cssLines.push(`  flex-direction: ${fg.flexDirection};`);
        if (fg.justifyContent) cssLines.push(`  justify-content: ${fg.justifyContent};`);
        if (fg.alignItems) cssLines.push(`  align-items: ${fg.alignItems};`);
        if (fg.gap) cssLines.push(`  gap: ${fg.gap};`);
    } else if (styles.display === 'grid') {
        const fg = styles.flexGrid || {};
        if (fg.gridTemplateColumns) cssLines.push(`  grid-template-columns: ${fg.gridTemplateColumns};`);
        if (fg.gridAutoFlow && fg.gridAutoFlow !== 'row') cssLines.push(`  grid-auto-flow: ${fg.gridAutoFlow};`);
        if (fg.gap) cssLines.push(`  gap: ${fg.gap};`);
    }

    return `${tagName} {\n${cssLines.join('\n')}\n}`;
}
