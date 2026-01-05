import React from 'react';

const parseTracks = (val) => {
    if (!val || val === 'none') return ['1fr'];

    // Handle repeat(n, ...) - very basic support
    let normalized = val.replace(/repeat\((\d+),\s*([^)]+)\)/g, (match, count, content) => {
        return new Array(parseInt(count)).fill(content).join(' ');
    });

    // Split by space but avoid splitting inside parentheses
    return normalized.trim().split(/\s+(?![^()]*\))/);
};

export default function GridMap({ columns, rows, gap = '4px', items = [], onHover, onLeave }) {
    const cols = parseTracks(columns);
    const rs = parseTracks(rows);

    return (
        <div className="mt-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    Grid Visualization
                </div>
                <div className="px-2 py-0.5 bg-slate-800/80 border border-slate-700 rounded text-[9px] text-slate-400 font-mono flex gap-2">
                    <span>{cols.length} cols</span>
                    <span className="text-slate-600">|</span>
                    <span>{rs.length} rows</span>
                </div>
            </div>

            <div
                className="relative aspect-video bg-slate-950 rounded border border-slate-800 flex items-center justify-center p-4 overflow-hidden"
                onMouseLeave={onLeave}
            >
                {/* Background Dots */}
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '12px 12px' }}></div>

                <div
                    className="grid w-full h-full gap-1 transition-all duration-300 relative"
                    style={{
                        gridTemplateColumns: `repeat(${cols.length}, 1fr)`,
                        gridTemplateRows: `repeat(${rs.length}, 1fr)`,
                        gap: gap
                    }}
                >
                    {/* Render Base Grid Cells */}
                    {Array.from({ length: cols.length * rs.length }).map((_, i) => {
                        const col = (i % cols.length) + 1;
                        const row = Math.floor(i / cols.length) + 1;
                        return (
                            <div
                                key={`cell-${i}`}
                                className="bg-slate-800/20 border border-slate-800/50 rounded-sm flex items-center justify-center relative group overflow-hidden"
                                onMouseEnter={() => onHover && onHover({ type: 'cell', col, row })}
                            >
                                <div className="absolute inset-0 bg-green-500/10 border border-green-500/30 opacity-0 group-hover:opacity-100 transition-opacity z-10"></div>
                                <span className="text-[8px] text-slate-700 font-mono">{i + 1}</span>
                            </div>
                        );
                    })}

                    {/* Render Spanning Items */}
                    {items && items.map((item, i) => {
                        if ((!item.gridColumn || item.gridColumn === 'auto') && (!item.gridRow || item.gridRow === 'auto')) return null;

                        return (
                            <div
                                key={`item-${i}`}
                                className="z-20 bg-blue-500/20 border border-blue-400/40 rounded-sm ring-1 ring-blue-500/20 flex items-center justify-center group hover:bg-green-500/20 hover:border-green-500/50 hover:ring-green-500/30 transition-all cursor-crosshair"
                                style={{
                                    gridColumn: item.gridColumn,
                                    gridRow: item.gridRow
                                }}
                                onMouseEnter={() => onHover && onHover({ type: 'item', index: i })}
                            >
                                <span className="text-[8px] text-blue-300 font-bold drop-shadow-sm group-hover:text-green-300">{i + 1}</span>
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <p className="mt-2 text-[9px] text-slate-500 italic">
                * Highlighted boxes represent actual child elements.
            </p>
        </div>
    );
}
