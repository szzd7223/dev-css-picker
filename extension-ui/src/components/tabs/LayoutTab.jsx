import React, { useState, useEffect } from 'react';
import { Box, Move, Layers, Maximize2, Minimize2, Grid, Layout } from 'lucide-react';
import { SliderInput, SelectInput, SpacingInput, RadiusInput } from '../ui/StyleControls';
import GridMap from '../ui/GridMap';
import { cleanStyleValue } from '../../utils/styleUtils';

export default function LayoutTab({ selectedElement, onUpdateElement }) {
    const [localStyles, setLocalStyles] = useState({});
    const [originalStyles, setOriginalStyles] = useState({});

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
                    top: selectedElement.boxModel.padding?.top || '0px',
                    right: selectedElement.boxModel.padding?.right || '0px',
                    bottom: selectedElement.boxModel.padding?.bottom || '0px',
                    left: selectedElement.boxModel.padding?.left || '0px'
                },
                margin: {
                    top: selectedElement.boxModel.margin?.top || '0px',
                    right: selectedElement.boxModel.margin?.right || '0px',
                    bottom: selectedElement.boxModel.margin?.bottom || '0px',
                    left: selectedElement.boxModel.margin?.left || '0px'
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

            setOriginalStyles(initialState);
            setLocalStyles(initialState);
        }
    }, [selectedElement]);

    const sendLiveUpdate = (updatedStyles) => {
        if (!selectedElement) return;
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'UPDATE_STYLE',
                    payload: {
                        cpId: selectedElement.cpId,
                        styles: updatedStyles
                    }
                }).catch(() => { });
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
        const nextStyles = { ...localStyles, flexGrid: newFlexGrid };
        setLocalStyles(nextStyles);

        // Sync the entire flex/grid state to the element to ensure consistency
        // especially when properties like auto-flow depend on template-rows/cols
        sendLiveUpdate({
            display: localStyles.display,
            flexDirection: newFlexGrid.flexDirection,
            justifyContent: newFlexGrid.justifyContent,
            alignItems: newFlexGrid.alignItems,
            gap: newFlexGrid.gap,
            rowGap: newFlexGrid.rowGap,
            columnGap: newFlexGrid.columnGap,
            gridTemplateColumns: newFlexGrid.gridTemplateColumns,
            gridTemplateRows: newFlexGrid.gridTemplateRows,
            gridAutoFlow: newFlexGrid.gridAutoFlow
        });

        if (onUpdateElement) onUpdateElement({ [prop]: value });
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


    if (!selectedElement) return null;

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
                        <SliderInput
                            label="Gap"
                            value={localStyles.flexGrid?.gap || '0px'}
                            onChange={(val) => handleFlexGridChange('gap', val)}
                            min={0} max={100}
                        />
                        {localStyles.display === 'grid' && (
                            <>
                                <SliderInput label="Row Gap" value={localStyles.flexGrid?.rowGap || localStyles.flexGrid?.gap || '0px'} onChange={(val) => handleFlexGridChange('rowGap', val)} min={0} max={100} />
                                <SliderInput label="Col Gap" value={localStyles.flexGrid?.columnGap || localStyles.flexGrid?.gap || '0px'} onChange={(val) => handleFlexGridChange('columnGap', val)} min={0} max={100} />
                            </>
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
                                columns={localStyles.flexGrid?.gridTemplateColumns}
                                rows={localStyles.flexGrid?.gridTemplateRows}
                                gap={localStyles.flexGrid?.gap}
                                items={localStyles.flexGrid?.gridItems}
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
                />
                <SpacingInput
                    label="Margin"
                    values={localStyles.margin}
                    onChange={(val) => handleStyleChange('margin', val)}
                    originalValues={originalStyles.margin}
                    onReset={() => handleReset('margin')}
                    min={-500}
                    max={500}
                />
                <RadiusInput
                    label="Border Radius"
                    values={localStyles.borderRadius}
                    onChange={(val) => handleStyleChange('borderRadius', val)}
                    originalValues={originalStyles.borderRadius}
                    onReset={() => handleReset('borderRadius')}
                    max={(() => {
                        const parseDim = (val) => {
                            if (!val) return 0;
                            const num = parseFloat(val);
                            return isNaN(num) ? 0 : num;
                        };

                        // Try local styles first (user editing)
                        let w = parseDim(localStyles.width);
                        let h = parseDim(localStyles.height);

                        // Fallback to computed element dimensions if local is unusable (e.g. auto/%/0)
                        if (w <= 0 && selectedElement?.width) w = selectedElement.width;
                        if (h <= 0 && selectedElement?.height) h = selectedElement.height;

                        // If we have valid dimensions, use min(w,h)/2
                        if (w > 0 && h > 0) return Math.min(w, h) / 2;

                        // Absolute fallback if everything fails
                        return 100;
                    })()}
                />
            </section>
        </div>
    );
}
