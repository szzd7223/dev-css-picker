// extension/content-script/inspector.js

(function () {
    const { getOrAssignId, normalizeColor } = window.CSSPicker.utils;

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
            // Access tracker from global scope, assuming init.js has run or will run
            // Note: init.js runs AFTER this file, but window.CSSPicker.tracker will be available when getElementInfo is CALLED because it's called on user interaction or messaging, which happens after all scripts load.
            originalStyles: window.CSSPicker.tracker ? window.CSSPicker.tracker.getAllOriginals(el) : {}
        };
    }

    window.CSSPicker.inspector = {
        getElementInfo,
        getAssetInfo
    };
})();
