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

export default function GridMap({ columns, rows, gap = '4px', items = [], autoFlow = 'row', onHover, onLeave }) {
    const cols = parseTracks(columns);
    const rs = parseTracks(rows);
    const isColumnFlow = autoFlow.includes('column');

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

                <div className="relative w-full h-full">
                    {/* Layer 1: Base Grid Cells (Background Layer) */}
                    <div
                        className="absolute inset-0 grid w-full h-full gap-1 pointer-events-none"
                        style={{
                            gridTemplateColumns: `repeat(${cols.length}, 1fr)`,
                            gridTemplateRows: `repeat(${rs.length}, 1fr)`,
                            gridAutoFlow: autoFlow,
                            gap: gap
                        }}
                    >
                        {Array.from({ length: cols.length * rs.length }).map((_, i) => (
                            <div
                                key={`base-${i}`}
                                className="bg-slate-800/10 border border-slate-800/30 rounded-sm"
                            />
                        ))}
                    </div>

                    {/* Layer 2: Actual Items (Content Layer) */}
                    <div
                        className="absolute inset-0 grid w-full h-full gap-1 pointer-events-none"
                        style={{
                            gridTemplateColumns: `repeat(${cols.length}, 1fr)`,
                            gridTemplateRows: `repeat(${rs.length}, 1fr)`,
                            gridAutoFlow: autoFlow,
                            gap: gap
                        }}
                    >
                        {items && items.map((item, i) => {
                            const isSpanning = (item.gridColumn && item.gridColumn !== 'auto') || (item.gridRow && item.gridRow !== 'auto');

                            // Calculate position for non-spanning items for hover data
                            // This is approximate as actual grid layout can be complex, but match autoFlow
                            let col, row;
                            if (!isSpanning) {
                                if (isColumnFlow) {
                                    row = (i % rs.length) + 1;
                                    col = Math.floor(i / rs.length) + 1;
                                } else {
                                    col = (i % cols.length) + 1;
                                    row = Math.floor(i / cols.length) + 1;
                                }
                            }

                            return (
                                <div
                                    key={`item-${i}`}
                                    className={`z-20 rounded-sm ring-1 flex items-center justify-center group transition-all cursor-crosshair pointer-events-auto
                                    ${isSpanning
                                            ? 'bg-blue-500/20 border border-blue-400/40 ring-blue-500/20 hover:bg-green-500/20 hover:border-green-500/50 hover:ring-green-500/30'
                                            : 'bg-slate-700/40 border border-slate-600/40 ring-slate-700/20 hover:bg-blue-500/30 hover:border-blue-400/50'
                                        }`}
                                    style={{
                                        gridColumn: item.gridColumn,
                                        gridRow: item.gridRow,
                                        position: isSpanning ? 'relative' : 'auto'
                                    }}
                                    onMouseEnter={() => onHover && onHover(isSpanning ? { type: 'item', index: i } : { type: 'cell', col, row })}
                                >
                                    <span className={`text-[8px] font-bold drop-shadow-sm ${isSpanning ? 'text-blue-300 group-hover:text-green-300' : 'text-slate-500 group-hover:text-blue-300'}`}>
                                        {i + 1}
                                    </span>
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            <p className="mt-2 text-[9px] text-slate-500 italic">
                * Highlighted boxes represent actual child elements. Flow: {autoFlow}
            </p>
        </div>
    );
}

