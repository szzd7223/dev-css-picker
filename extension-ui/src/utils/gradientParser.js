export const parseGradient = (cssString) => {
    if (!cssString || cssString === 'none') return null;

    const isLinear = cssString.startsWith('linear-gradient');
    const isRadial = cssString.startsWith('radial-gradient');
    const isConic = cssString.startsWith('conic-gradient');

    if (!isLinear && !isRadial && !isConic) return null;

    const type = isLinear ? 'linear' : isRadial ? 'radial' : 'conic';

    // Simple parser for Phase 2 - mainly handling linear-gradient standard syntax
    // linear-gradient(90deg, red 0%, blue 100%)

    if (type !== 'linear') {
        return { type, isComplex: true, original: cssString };
    }

    try {
        // Remove 'linear-gradient(' and trailing ')'
        let content = cssString.substring(16, cssString.length - 1);

        let angle = 180; // Default to bottom
        let stopString = content;

        // Check for angle/direction
        const matchAngle = content.match(/^(\d+)deg/);
        const matchTo = content.match(/^to (top|bottom|left|right|top left|top right|bottom left|bottom right)/);

        if (matchAngle) {
            angle = parseInt(matchAngle[1]);
            stopString = content.substring(content.indexOf(',') + 1).trim();
        } else if (matchTo) {
            // Convert 'to right' etc to degrees approx
            const dir = matchTo[1];
            const directionMap = {
                'top': 0, 'right': 90, 'bottom': 180, 'left': 270,
                'top right': 45, 'bottom right': 135, 'bottom left': 225, 'top left': 315
            };
            angle = directionMap[dir] || 180;
            stopString = content.substring(content.indexOf(',') + 1).trim();
        }

        // Parse stops - very basic split by comma, ignoring commas inside nested parens (e.g. rgb())
        // For Phase 2, we assume a relatively clean syntax like "color pos, color pos"
        // A robust parser is complex, we will try a regex split or just naive split for now
        const stops = [];
        const rawStops = stopString.split(/,(?![^(]*\))/).map(s => s.trim());

        rawStops.forEach(s => {
            // Try to separate color and position
            const parts = s.match(/^(.*?)(?:\s+(\d+%|[\d.]+px))?$/);
            if (parts) {
                stops.push({
                    color: parts[1],
                    position: parts[2] || null // Auto position handling is hard, we might default logic later
                });
            }
        });

        return { type, angle, stops, isComplex: false };
    } catch (e) {
        console.error("Gradient parse error", e);
        return { type, isComplex: true, original: cssString };
    }
};

export const buildGradientString = (type, angle, stops) => {
    if (type !== 'linear') return '';
    const stopStr = stops.map(s => `${s.color}${s.position ? ' ' + s.position : ''}`).join(', ');
    return `linear-gradient(${angle}deg, ${stopStr})`;
};
