// extension/content-script/scanner.js

(function () {
    const { getOrAssignId, normalizeColor } = window.CSSPicker.utils;
    const { getAssetInfo } = window.CSSPicker.inspector;

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

    window.CSSPicker.scanner = {
        extractOverviewData,
        extractAssetsData
    };
})();
