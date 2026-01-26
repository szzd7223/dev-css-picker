import React, { useState, useEffect, useRef } from 'react';
import { Box, Move, Layers, Maximize2, Minimize2, Grid, Layout, Equal } from 'lucide-react';
import { SliderInput, SelectInput, SpacingInput, RadiusInput, convertToPx, convertFromPx } from '../ui/StyleControls';
import GridMap from '../ui/GridMap';
import { cleanStyleValue } from '../../utils/styleUtils';
import { useDevToolsStore } from '../../store/devtools';

export default function LayoutTab({ selectedElement, onUpdateElement }) {
    const [localStyles, setLocalStyles] = useState({});
    const [originalStyles, setOriginalStyles] = useState({});
    const [computedGrid, setComputedGrid] = useState(null);
    const previousCpId = useRef(null);

    const { isInspectMode, setInspectMode } = useDevToolsStore();

    // Sync state with selected element
    useEffect(() => {
        if (selectedElement) {
            const cleanPx = (val) => {
                if (!val || val === 'none' || val === 'auto') return val;
                const parsed = parseFloat(val);
                if (isNaN(parsed) || !isFinite(parsed)) return '0px';
                return `${Math.round(parsed)}px`;
            };

            const cleanRadius = (val) => {
                // ... reuse or import this logic if complex, for now simple clean
                if (typeof val === 'object' && val !== null) {
                    const out = {};
                    for (const k in val) out[k] = cleanRadius(val[k]);
                    return out;
                }
                return cleanStyleValue(val);
            };

            const getOriginal = (prop, currentVal) => {
                // Check if we have a tracked original value from the DOM tracker
                if (selectedElement.originalStyles && selectedElement.originalStyles[prop] !== undefined) {
                    return selectedElement.originalStyles[prop];
                }
                // If not tracked, the current value IS the original
                return currentVal;
            };

            const getOriginalBoxModel = (prop, side, currentVal) => {
                const trackedProp = side ? `${prop}-${side}` : prop;
                // Tracker stores 'padding-top', 'margin-left' etc or 'border-top-left-radius'
                // Our UI uses 'padding', 'margin', 'borderRadius' objects.
                // We need to map UI keys to CSS properties.

                let cssProp = '';
                if (prop === 'borderRadius') {
                    if (side === 'topLeft') cssProp = 'border-top-left-radius';
                    if (side === 'topRight') cssProp = 'border-top-right-radius';
                    if (side === 'bottomRight') cssProp = 'border-bottom-right-radius';
                    if (side === 'bottomLeft') cssProp = 'border-bottom-left-radius';
                } else {
                    cssProp = `${prop}-${side}`;
                }

                if (selectedElement.originalStyles && selectedElement.originalStyles[cssProp] !== undefined) {
                    return selectedElement.originalStyles[cssProp];
                }
                return currentVal;
            };

            const initialState = {
                display: selectedElement.boxModel.display,
                width: selectedElement.inlineStyle?.width || (selectedElement.width + 'px'),
                height: selectedElement.inlineStyle?.height || (selectedElement.height + 'px'),
                position: selectedElement.positioning?.position || 'static',
                top: cleanStyleValue(selectedElement.positioning?.top),
                right: cleanStyleValue(selectedElement.positioning?.right),
                bottom: cleanStyleValue(selectedElement.positioning?.bottom),
                left: cleanStyleValue(selectedElement.positioning?.left),
                padding: {
                    top: selectedElement.inlineStyle?.paddingTop || selectedElement.boxModel.padding?.top || '0px',
                    right: selectedElement.inlineStyle?.paddingRight || selectedElement.boxModel.padding?.right || '0px',
                    bottom: selectedElement.inlineStyle?.paddingBottom || selectedElement.boxModel.padding?.bottom || '0px',
                    left: selectedElement.inlineStyle?.paddingLeft || selectedElement.boxModel.padding?.left || '0px'
                },
                margin: {
                    top: selectedElement.inlineStyle?.marginTop || selectedElement.boxModel.margin?.top || '0px',
                    right: selectedElement.inlineStyle?.marginRight || selectedElement.boxModel.margin?.right || '0px',
                    bottom: selectedElement.inlineStyle?.marginBottom || selectedElement.boxModel.margin?.bottom || '0px',
                    left: selectedElement.inlineStyle?.marginLeft || selectedElement.boxModel.margin?.left || '0px'
                },
                borderRadius: cleanRadius(selectedElement.boxModel.borderRadius),
                flexGrid: {
                    flexDirection: selectedElement.flexGrid?.flexDirection,
                    justifyContent: selectedElement.flexGrid?.justifyContent,
                    alignItems: selectedElement.flexGrid?.alignItems,
                    gap: cleanStyleValue(selectedElement.flexGrid?.gap),
                    rowGap: cleanStyleValue(selectedElement.flexGrid?.rowGap),
                    columnGap: cleanStyleValue(selectedElement.flexGrid?.columnGap),
                    gridTemplateColumns: selectedElement.flexGrid?.gridTemplateColumns,
                    gridTemplateRows: selectedElement.flexGrid?.gridTemplateRows,
                    gridAutoFlow: selectedElement.flexGrid?.gridAutoFlow || 'row',
                    gridItems: selectedElement.flexGrid?.gridItems || []
                }
            };

            const originalState = {
                display: getOriginal('display', initialState.display),
                width: getOriginal('width', initialState.width),
                height: getOriginal('height', initialState.height),
                position: getOriginal('position', initialState.position),
                top: getOriginal('top', initialState.top),
                right: getOriginal('right', initialState.right),
                bottom: getOriginal('bottom', initialState.bottom),
                left: getOriginal('left', initialState.left),
                padding: {
                    top: getOriginalBoxModel('padding', 'top', initialState.padding.top),
                    right: getOriginalBoxModel('padding', 'right', initialState.padding.right),
                    bottom: getOriginalBoxModel('padding', 'bottom', initialState.padding.bottom),
                    left: getOriginalBoxModel('padding', 'left', initialState.padding.left)
                },
                margin: {
                    top: getOriginalBoxModel('margin', 'top', initialState.margin.top),
                    right: getOriginalBoxModel('margin', 'right', initialState.margin.right),
                    bottom: getOriginalBoxModel('margin', 'bottom', initialState.margin.bottom),
                    left: getOriginalBoxModel('margin', 'left', initialState.margin.left)
                },
                borderRadius: {
                    topLeft: getOriginalBoxModel('borderRadius', 'topLeft', initialState.borderRadius.topLeft),
                    topRight: getOriginalBoxModel('borderRadius', 'topRight', initialState.borderRadius.topRight),
                    bottomRight: getOriginalBoxModel('borderRadius', 'bottomRight', initialState.borderRadius.bottomRight),
                    bottomLeft: getOriginalBoxModel('borderRadius', 'bottomLeft', initialState.borderRadius.bottomLeft)
                },
                flexGrid: {
                    // Flex/Grid resets might be trickier if tracked property names differ (camelCase vs kebab)
                    // internal tracker uses kebab for most, but let's check. 
                    // Tracker essentially stores what we passed it. 
                    // content.js sends kebab for standard properties.
                    flexDirection: getOriginal('flex-direction', initialState.flexGrid.flexDirection),
                    justifyContent: getOriginal('justify-content', initialState.flexGrid.justifyContent),
                    alignItems: getOriginal('align-items', initialState.flexGrid.alignItems),
                    gap: getOriginal('gap', initialState.flexGrid.gap),
                    rowGap: getOriginal('row-gap', initialState.flexGrid.rowGap),
                    columnGap: getOriginal('column-gap', initialState.flexGrid.columnGap),
                    gridTemplateColumns: getOriginal('grid-template-columns', initialState.flexGrid.gridTemplateColumns),
                    gridTemplateRows: getOriginal('grid-template-rows', initialState.flexGrid.gridTemplateRows),
                    gridAutoFlow: getOriginal('grid-auto-flow', initialState.flexGrid.gridAutoFlow),
                    gridItems: initialState.flexGrid.gridItems // Items aren't style props directly
                }
            };

            // Only update original styles when we select a NEW element
            if (previousCpId.current !== selectedElement.cpId) {
                setOriginalStyles(originalState);
                previousCpId.current = selectedElement.cpId;
            }

            // Always update local styles to reflect current state (externally or echo)
            setLocalStyles(initialState);

            // Initialize computed grid if needed (or keep sync)
            if (previousCpId.current !== selectedElement.cpId || !computedGrid) {
                setComputedGrid({
                    columns: selectedElement.flexGrid?.gridTemplateColumns,
                    rows: selectedElement.flexGrid?.gridTemplateRows,
                    items: selectedElement.flexGrid?.gridItems
                });
            }
        }
    }, [selectedElement, computedGrid]);

    const sendLiveUpdate = (updatedStyles, callback) => {
        if (!selectedElement) return;
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'UPDATE_STYLE',
                    payload: {
                        cpId: selectedElement.cpId,
                        styles: updatedStyles
                    }
                })
                    .then((response) => {
                        if (callback && response) callback(response);
                    })
                    .catch(() => { });
            }
        });
    };

    const handleStyleChange = (property, value) => {
        const nextStyles = { ...localStyles, [property]: value };
        setLocalStyles(nextStyles);
        sendLiveUpdate({ [property]: value });
        if (onUpdateElement) onUpdateElement({ [property]: value });
    };

    const handleFlexGridChange = (prop, value) => {
        const newFlexGrid = { ...localStyles.flexGrid, [prop]: value };

        // If master gap is changed, sync row/col gap to it
        if (prop === 'gap') {
            newFlexGrid.rowGap = value;
            newFlexGrid.columnGap = value;
        }

        const nextStyles = { ...localStyles, flexGrid: newFlexGrid };
        setLocalStyles(nextStyles);

        // Send only the relevant change to prevent interference
        const updatePayload = { [prop]: value };

        // If gap was changed, we must also send rowGap/columnGap to the element
        // because shorthand 'gap' might be overridden by computed row-gap/column-gap
        if (prop === 'gap') {
            updatePayload.rowGap = value;
            updatePayload.columnGap = value;
        }

        sendLiveUpdate(updatePayload, (newInfo) => {
            if (newInfo && newInfo.flexGrid) {
                setComputedGrid({
                    columns: newInfo.flexGrid.gridTemplateColumns,
                    rows: newInfo.flexGrid.gridTemplateRows,
                    items: newInfo.flexGrid.gridItems
                });
            }
        });

        if (onUpdateElement) onUpdateElement({ [prop]: value });
    };

    const handleSyncGaps = () => {
        const value = localStyles.flexGrid?.rowGap || '0px';
        handleFlexGridChange('gap', value);
    };

    const handleGridPreset = (prop, count) => {
        if (count === 'custom') return;
        const val = count === 'auto-fit'
            ? 'repeat(auto-fit, minmax(100px, 1fr))'
            : `repeat(${count}, 1fr)`;
        handleFlexGridChange(prop, val);
    };

    const getGridPreset = (val) => {
        if (!val || val === 'none') return '1';
        if (val.includes('auto-fit')) return 'auto-fit';
        const repeatMatch = val.match(/repeat\((\d+),/);
        if (repeatMatch) return repeatMatch[1];
        const parts = val.trim().split(/\s+(?![^()]*\))/);
        const count = parts.length;
        if ([1, 2, 3, 4, 6, 12].includes(count)) return count.toString();
        return 'custom';
    };

    const handleReset = (property) => {
        if (originalStyles[property] !== undefined) {
            if (property === 'flexGrid') {
                // Resetting flexGrid is complex, might need granular reset or full object reset
                // For now, let's assume we don't reset the whole object often via this generic handler
            } else {
                handleStyleChange(property, originalStyles[property]);
            }
        }
    };

    const handleGridHover = (hoverInfo) => {
        if (!selectedElement) return;
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'HIGHLIGHT_GRID_AREA',
                    payload: {
                        cpId: selectedElement.cpId,
                        ...hoverInfo
                    }
                }).catch(() => { });
            }
        });
    };

    const handleGridLeave = () => {
        if (!selectedElement) return;
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'CLEAR_GRID_AREA',
                    payload: { cpId: selectedElement.cpId }
                }).catch(() => { });
            }
        });
    };


    if (!selectedElement) {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-full text-center animate-fade-in">
                <div className={`w-16 h-16 ${isInspectMode ? 'bg-slate-800' : 'bg-slate-800/50'} text-blue-500 rounded-full flex items-center justify-center mb-4`}>
                    <Layout size={32} strokeWidth={1.5} className={isInspectMode ? 'animate-pulse' : 'opacity-40'} />
                </div>
                {isInspectMode ? (
                    <>
                        <h2 className="text-lg font-bold text-white mb-2">Inspector Mode Active</h2>
                        <p className="text-slate-400 text-sm max-w-[200px] mb-6">
                            Hover over elements on the page to see details. Click to lock selection.
                        </p>
                    </>
                ) : (
                    <>
                        <h2 className="text-lg font-bold text-white mb-2">Setup Layout</h2>
                        <p className="text-slate-400 text-sm max-w-[200px] mb-6">
                            Enable inspect mode to select an element and start adjusting its layout and position.
                        </p>
                        <button
                            onClick={() => setInspectMode(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                        >
                            Enable Inspect Mode
                        </button>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6 animate-fade-in pb-24">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
                <Layout size={18} className="text-blue-400" />
                <h2 className="text-lg font-bold text-white">Layout & Positioning</h2>
            </div>

            {/* DISPLAY & DIMENSIONS */}
            <section className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-4">
                <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <Maximize2 size={12} /> Dimensions & Display
                </div>
                <SelectInput
                    label="Display"
                    value={localStyles.display}
                    onChange={(val) => handleStyleChange('display', val)}
                    originalValue={originalStyles.display}
                    options={[
                        { value: 'block', label: 'block' },
                        { value: 'flex', label: 'flex' },
                        { value: 'grid', label: 'grid' },
                        { value: 'inline-block', label: 'inline-block' },
                        { value: 'none', label: 'none' },
                    ]}
                />
                <div className="grid grid-cols-2 gap-4">
                    <SliderInput label="Width" value={localStyles.width} onChange={(val) => handleStyleChange('width', val)} min={0} max={1000} allowAuto placeholderValue={selectedElement.width} />
                    <SliderInput label="Height" value={localStyles.height} onChange={(val) => handleStyleChange('height', val)} min={0} max={1000} allowAuto placeholderValue={selectedElement.height} />
                </div>
            </section>

            {/* POSITIONING */}
            <section className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-4">
                <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <Move size={12} /> Positioning
                </div>
                <SelectInput
                    label="Position"
                    value={localStyles.position}
                    onChange={(val) => handleStyleChange('position', val)}
                    options={[
                        { value: 'static', label: 'Static' },
                        { value: 'relative', label: 'Relative' },
                        { value: 'absolute', label: 'Absolute' },
                        { value: 'fixed', label: 'Fixed' },
                        { value: 'sticky', label: 'Sticky' },
                    ]}
                />
                {localStyles.position !== 'static' && (
                    <div className="grid grid-cols-2 gap-4">
                        <SliderInput label="Top" value={localStyles.top} onChange={(val) => handleStyleChange('top', val)} min={-100} max={500} allowAuto placeholderValue={(() => { const n = parseFloat(selectedElement.positioning?.top); return isNaN(n) ? 0 : n; })()} />
                        <SliderInput label="Right" value={localStyles.right} onChange={(val) => handleStyleChange('right', val)} min={-100} max={500} allowAuto placeholderValue={(() => { const n = parseFloat(selectedElement.positioning?.right); return isNaN(n) ? 0 : n; })()} />
                        <SliderInput label="Bottom" value={localStyles.bottom} onChange={(val) => handleStyleChange('bottom', val)} min={-100} max={500} allowAuto placeholderValue={(() => { const n = parseFloat(selectedElement.positioning?.bottom); return isNaN(n) ? 0 : n; })()} />
                        <SliderInput label="Left" value={localStyles.left} onChange={(val) => handleStyleChange('left', val)} min={-100} max={500} allowAuto placeholderValue={(() => { const n = parseFloat(selectedElement.positioning?.left); return isNaN(n) ? 0 : n; })()} />
                    </div>
                )}
            </section>

            {/* FLEX/GRID CONTROLS */}
            {(localStyles.display === 'flex' || localStyles.display === 'grid') && (
                <section className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-4">
                    <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                        {localStyles.display === 'grid' ? <Grid size={12} /> : <Layers size={12} />}
                        {localStyles.display === 'grid' ? 'Grid Container' : 'Flex Container'}
                    </div>

                    {/* GAP */}
                    <div className="pb-4 border-b border-slate-700 mb-4">
                        {/* Master Gap */}
                        <div className="relative group/gap">
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-medium text-slate-400 uppercase">Gap</label>
                                {localStyles.flexGrid?.rowGap !== localStyles.flexGrid?.columnGap && (
                                    <button
                                        onClick={handleSyncGaps}
                                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] text-blue-300 transition-colors border border-slate-600 hover:border-blue-500/50"
                                        title="Sync Row and Column gaps"
                                    >
                                        <Equal size={10} />
                                        <span>Make Even</span>
                                    </button>
                                )}
                            </div>
                            <SliderInput
                                label={null}
                                value={localStyles.flexGrid?.gap || '0px'}
                                onChange={(val) => handleFlexGridChange('gap', val)}
                                min={0} max={100}
                                disabled={localStyles.flexGrid?.rowGap !== localStyles.flexGrid?.columnGap}
                            />
                        </div>

                        {localStyles.display === 'grid' && (
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <SliderInput label="Row Gap" value={localStyles.flexGrid?.rowGap || localStyles.flexGrid?.gap || '0px'} onChange={(val) => handleFlexGridChange('rowGap', val)} min={0} max={100} />
                                <SliderInput label="Col Gap" value={localStyles.flexGrid?.columnGap || localStyles.flexGrid?.gap || '0px'} onChange={(val) => handleFlexGridChange('columnGap', val)} min={0} max={100} />
                            </div>
                        )}
                    </div>

                    {/* FLEX SPECIFIC */}
                    {localStyles.display === 'flex' && (
                        <>
                            <SelectInput
                                label="Direction"
                                value={localStyles.flexGrid?.flexDirection || 'row'}
                                onChange={(val) => handleFlexGridChange('flexDirection', val)}
                                options={[
                                    { value: 'row', label: 'Row →' },
                                    { value: 'column', label: 'Column ↓' },
                                    { value: 'row-reverse', label: 'Row Reverse ←' },
                                    { value: 'column-reverse', label: 'Column Reverse ↑' },
                                ]}
                            />
                            <SelectInput
                                label="Align Items"
                                value={localStyles.flexGrid?.alignItems || 'stretch'}
                                onChange={(val) => handleFlexGridChange('alignItems', val)}
                                options={[
                                    { value: 'stretch', label: 'Stretch' },
                                    { value: 'flex-start', label: 'Start' },
                                    { value: 'center', label: 'Center' },
                                    { value: 'flex-end', label: 'End' },
                                    { value: 'baseline', label: 'Baseline' },
                                ]}
                            />
                            <SelectInput
                                label="Justify Content"
                                value={localStyles.flexGrid?.justifyContent || 'flex-start'}
                                onChange={(val) => handleFlexGridChange('justifyContent', val)}
                                options={[
                                    { value: 'flex-start', label: 'Start' },
                                    { value: 'center', label: 'Center' },
                                    { value: 'flex-end', label: 'End' },
                                    { value: 'space-between', label: 'Space Between' },
                                    { value: 'space-around', label: 'Space Around' },
                                    { value: 'space-evenly', label: 'Space Evenly' },
                                ]}
                            />
                        </>
                    )}

                    {/* GRID SPECIFIC */}
                    {localStyles.display === 'grid' && (
                        <>
                            <SelectInput
                                label="Columns"
                                value={getGridPreset(localStyles.flexGrid?.gridTemplateColumns)}
                                onChange={(val) => handleGridPreset('gridTemplateColumns', val)}
                                options={[
                                    { value: '1', label: '1 Column' },
                                    { value: '2', label: '2 Columns' },
                                    { value: '3', label: '3 Columns' },
                                    { value: '4', label: '4 Columns' },
                                    { value: '6', label: '6 Columns' },
                                    { value: '12', label: '12 Columns' },
                                    { value: 'auto-fit', label: 'Auto Fit' },
                                    { value: 'custom', label: 'Custom' },
                                ]}
                            />
                            <SelectInput
                                label="Rows"
                                value={getGridPreset(localStyles.flexGrid?.gridTemplateRows)}
                                onChange={(val) => handleGridPreset('gridTemplateRows', val)}
                                options={[
                                    { value: '1', label: '1 Row' },
                                    { value: '2', label: '2 Rows' },
                                    { value: '3', label: '3 Rows' },
                                    { value: '4', label: '4 Rows' },
                                    { value: 'custom', label: 'Custom' },
                                ]}
                            />
                            <SelectInput
                                label="Auto Flow"
                                value={localStyles.flexGrid?.gridAutoFlow || 'row'}
                                onChange={(val) => handleFlexGridChange('gridAutoFlow', val)}
                                options={[
                                    { value: 'row', label: 'Row' },
                                    { value: 'column', label: 'Column' },
                                    { value: 'dense', label: 'Dense' },
                                    { value: 'row dense', label: 'Row Dense' },
                                    { value: 'column dense', label: 'Column Dense' },
                                ]}
                            />

                            <GridMap
                                columns={computedGrid?.columns || localStyles.flexGrid?.gridTemplateColumns}
                                rows={computedGrid?.rows || localStyles.flexGrid?.gridTemplateRows}
                                gap={localStyles.flexGrid?.gap}
                                items={computedGrid?.items || localStyles.flexGrid?.gridItems}
                                autoFlow={localStyles.flexGrid?.gridAutoFlow || 'row'}
                                onHover={handleGridHover}
                                onLeave={handleGridLeave}
                            />
                        </>
                    )}
                </section>
            )}

            {/* BOX MODEL */}
            <section className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-4">
                <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <Box size={12} /> Box Model
                </div>
                <SpacingInput
                    label="Padding"
                    values={localStyles.padding}
                    onChange={(val) => handleStyleChange('padding', val)}
                    originalValues={originalStyles.padding}
                    onReset={() => handleReset('padding')}
                    placeholderValues={selectedElement.boxModel.padding}
                />
                <SpacingInput
                    label="Margin"
                    values={localStyles.margin}
                    onChange={(val) => handleStyleChange('margin', val)}
                    originalValues={originalStyles.margin}
                    onReset={() => handleReset('margin')}
                    min={-500}
                    max={500}
                    allowAuto={true}
                    placeholderValues={selectedElement.boxModel.margin}
                />
                <RadiusInput
                    label="Border Radius"
                    values={localStyles.borderRadius}
                    onChange={(val) => handleStyleChange('borderRadius', val)}
                    originalValues={originalStyles.borderRadius}
                    onReset={() => handleReset('borderRadius')}
                    max={(() => {
                        // 1. Get the current visual limit in Pixels
                        // Fallback to computed size if auto/% is used for dimension
                        const wPx = convertToPx(localStyles.width, selectedElement?.width || 0);
                        const hPx = convertToPx(localStyles.height, selectedElement?.height || 0);
                        const visualLimitPx = Math.min(wPx, hPx) / 2;

                        // 2. Identify the unit the user is currently using for radius
                        // RadiusInput identifies a "representative value" and its unit.
                        // We need to convert our pixel limit into THAT unit for the slider max.
                        const radiusObj = typeof localStyles.borderRadius === 'string'
                            ? { topLeft: localStyles.borderRadius }
                            : (localStyles.borderRadius || { topLeft: '0px' });

                        const firstVal = Object.values(radiusObj)[0] || '0px';
                        const match = String(firstVal).match(/[a-z%]+$/);
                        const currentRadiusUnit = match ? match[0] : 'px';

                        if (currentRadiusUnit === '%') return 50;

                        // Reference for % conversion is the same logic as convertToPx but we use visualLimitPx
                        // Actually, just convert back using the dedicated utility
                        const reference = (wPx + hPx) / 2; // Rough average or min for %? CSS says % is relative to size.
                        // For radius, 50% means meet in middle.

                        return convertFromPx(visualLimitPx, currentRadiusUnit, reference);
                    })()}
                />
            </section>
        </div>
    );
}
