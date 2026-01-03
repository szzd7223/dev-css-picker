import React, { useEffect, useState } from 'react';
import { Type, Palette, Box, Copy, Code, Layers, ArrowLeft, RefreshCw, ChevronDown, ChevronRight, Check, Play, Circle, Square, MousePointerClick, Move, LayoutGrid } from 'lucide-react';
import DomTree from './DomTree';
import { ColorInput, SliderInput, SelectInput, SpacingInput, RadiusInput } from '../ui/StyleControls';
import { generateTailwindClasses } from '../../utils/tailwindGenerator';

const ShapeButton = ({ onClick, icon: Icon, label, active }) => (
    <button
        onClick={onClick}
        className={`p-2 rounded-lg flex flex-col items-center gap-1 transition-all border ${active ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'}`}
        title={label}
    >
        <Icon size={16} />
        <span className="text-[10px] font-medium">{label}</span>
    </button>
);

// Utility to clean style values
const cleanStyleValue = (val) => {
    if (typeof val === 'object' && val !== null) {
        const out = {};
        for (const k in val) out[k] = cleanStyleValue(val[k]);
        return out;
    }
    if (!val || val === 'none' || val === 'auto') return val;
    // Keep original units if possible, just round if it's pixels
    if (String(val).endsWith('px')) {
        const parsed = parseFloat(val);
        if (!isNaN(parsed) && isFinite(parsed)) {
            // Cap extremely large values (often used for pill shapes) to 9999px to avoid UI glitches
            if (parsed > 10000) return '9999px';
            return `${Math.round(parsed)}px`;
        }
    }
    return val;
};

export default function InspectorTab({ selectedElement, onSelectElement, onTabChange, codeTab, setCodeTab }) {
    const [error, setError] = useState(null);
    const [originalStyles, setOriginalStyles] = useState({});
    const [localStyles, setLocalStyles] = useState(() => {
        if (!selectedElement) return {};

        return {
            color: selectedElement.colors.text,
            backgroundColor: selectedElement.colors.background,
            fontSize: selectedElement.typography.size,
            fontWeight: selectedElement.typography.weight,
            borderRadius: cleanStyleValue(selectedElement.boxModel.borderRadius),
            padding: cleanStyleValue(selectedElement.boxModel.padding),
            margin: cleanStyleValue(selectedElement.boxModel.margin),
            borderWidth: cleanStyleValue(selectedElement.boxModel.borderWidth),
            borderStyle: selectedElement.boxModel.borderStyle || 'solid',
            borderColor: selectedElement.colors.border || 'transparent',
            display: selectedElement.boxModel.display,
            width: selectedElement.width + 'px',
            height: selectedElement.height + 'px'
        };
    });
    const [generatedCode, setGeneratedCode] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const [generatedCss, setGeneratedCss] = useState('');

    // Sync state if selectedElement data changes (e.g. Refresh)
    useEffect(() => {
        if (selectedElement) {
            const cleanPx = (val) => {
                if (typeof val === 'object' && val !== null) {
                    const out = {};
                    for (const k in val) out[k] = cleanPx(val[k]);
                    return out;
                }
                if (!val || val === 'none' || val === 'auto') return val;
                const parsed = parseFloat(val);
                if (isNaN(parsed) || !isFinite(parsed)) return '0px';
                if (parsed > 10000) return '0px';
                return `${Math.round(parsed)}px`;
            };


            // Special helper for radius to clamp "pill hacks" (e.g. 9999px) to the actual visual limit
            const effectiveMaxRadius = Math.max(0, Math.round(Math.min(selectedElement.width, selectedElement.height) / 2));

            const cleanRadius = (val) => {
                if (typeof val === 'object' && val !== null) {
                    const out = {};
                    for (const k in val) out[k] = cleanRadius(val[k]);
                    return out;
                }

                // If it's a pixel value, check if it exceeds the effective max
                if (String(val).endsWith('px')) {
                    const parsed = parseFloat(val);
                    if (!isNaN(parsed) && isFinite(parsed)) {
                        // If it's effectively a pill (larger than half size), clamp it to half size
                        // This allows the slider to be useful immediately (sliding down from max)
                        if (effectiveMaxRadius > 0 && parsed > effectiveMaxRadius) {
                            return `${effectiveMaxRadius}px`;
                        }
                        return `${Math.round(parsed)}px`;
                    }
                }
                return cleanStyleValue(val);
            };

            const initialState = {
                color: selectedElement.colors.text,
                backgroundColor: selectedElement.colors.background,
                fontSize: selectedElement.typography.size,
                fontWeight: selectedElement.typography.weight,
                borderRadius: cleanRadius(selectedElement.boxModel.borderRadius),
                padding: cleanStyleValue(selectedElement.boxModel.padding),
                margin: cleanStyleValue(selectedElement.boxModel.margin),
                borderWidth: cleanStyleValue(selectedElement.boxModel.borderWidth),
                borderStyle: selectedElement.boxModel.borderStyle || 'solid',
                borderColor: selectedElement.colors.border || 'transparent',
                display: selectedElement.boxModel.display,
                width: selectedElement.width + 'px',
                height: selectedElement.height + 'px',
                // New Phase 1 Properties
                position: selectedElement.positioning?.position || 'static',
                top: cleanStyleValue(selectedElement.positioning?.top),
                right: cleanStyleValue(selectedElement.positioning?.right),
                bottom: cleanStyleValue(selectedElement.positioning?.bottom),
                left: cleanStyleValue(selectedElement.positioning?.left),
                flexGrid: {
                    flexDirection: selectedElement.flexGrid?.flexDirection,
                    justifyContent: selectedElement.flexGrid?.justifyContent,
                    alignItems: selectedElement.flexGrid?.alignItems,
                    gap: cleanStyleValue(selectedElement.flexGrid?.gap),
                    gridTemplateColumns: selectedElement.flexGrid?.gridTemplateColumns,
                    gridTemplateRows: selectedElement.flexGrid?.gridTemplateRows,
                }
            };

            setOriginalStyles(initialState);
            setLocalStyles(initialState);
            // Debug check
            console.log('Inspector Data', initialState);
        }
    }, [selectedElement]);

    // 1. Logic for Code Generation (Runs whenever styles change)
    useEffect(() => {
        if (!selectedElement || Object.keys(localStyles).length === 0) return;

        const code = generateTailwindClasses(localStyles);
        setGeneratedCode(code);

        const cssBlock = `${selectedElement.tagName.toLowerCase()} {\n  color: ${localStyles.color};\n  background: ${localStyles.backgroundColor};\n  font-size: ${localStyles.fontSize};\n  width: ${localStyles.width};\n  height: ${localStyles.height};\n}`;
        setGeneratedCss(cssBlock);
    }, [localStyles, selectedElement]);

    // 2. Logic for Live Updates (Triggered only by user interaction)
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


    // Handlers
    const handleStyleChange = (property, value) => {
        const nextStyles = { ...localStyles, [property]: value };
        setLocalStyles(nextStyles);

        // Send only the change to preserve other original styles on the page
        sendLiveUpdate({ [property]: value });
    };

    const handleReset = (property) => {
        if (originalStyles[property] !== undefined) {
            handleStyleChange(property, originalStyles[property]);
        }
    };

    const applyShape = (shape) => {
        const updates = {};
        if (shape === 'circle') {
            updates.borderRadius = '50%';
            // Force square aspect ratio if possible, or just set radius
            // For now, let's just do radius + equal width/height if it has dimensions
            const size = Math.max(parseInt(localStyles.width) || 0, parseInt(localStyles.height) || 0);
            if (size > 0) {
                updates.width = `${size}px`;
                updates.height = `${size}px`;
            }
        } else if (shape === 'rounded') {
            updates.borderRadius = '8px';
        } else if (shape === 'square') {
            updates.borderRadius = '0px';
        }

        const nextStyles = { ...localStyles, ...updates };
        setLocalStyles(nextStyles);
        sendLiveUpdate(updates);
    };

    const handleFlexGridChange = (prop, value) => {
        const newFlexGrid = { ...localStyles.flexGrid, [prop]: value };
        const nextStyles = { ...localStyles, flexGrid: newFlexGrid };
        setLocalStyles(nextStyles);
        sendLiveUpdate({ [prop]: value });
    };

    // Helper to set grid columns/rows from presets
    const handleGridPreset = (prop, count) => {
        if (count === 'custom') return; // No-op or open generic input in future
        const val = count === 'auto-fit'
            ? 'repeat(auto-fit, minmax(100px, 1fr))'
            : `repeat(${count}, 1fr)`;
        handleFlexGridChange(prop, val);
    };

    const getGridPreset = (val) => {
        if (!val) return 'custom';
        if (val.includes('repeat(1, 1fr)')) return '1';
        if (val.includes('repeat(2, 1fr)')) return '2';
        if (val.includes('repeat(3, 1fr)')) return '3';
        if (val.includes('repeat(4, 1fr)')) return '4';
        if (val.includes('repeat(6, 1fr)')) return '6';
        if (val.includes('repeat(12, 1fr)')) return '12';
        if (val.includes('auto-fit')) return 'auto-fit';
        return 'custom';
    };

    const handleSelectNode = (cpId) => {
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'SELECT_NODE',
                    payload: { cpId }
                }, (response) => {
                    if (response && response.tagName) {
                        onSelectElement(response);
                    }
                });
                chrome.tabs.sendMessage(tabs[0].id, { type: 'HIGHLIGHT_NODE', payload: { cpId } });
            }
        });
    };

    const copyToClipboard = () => {
        const generatedCss = `${selectedElement.tagName.toLowerCase()} {\n  color: ${localStyles.color};\n  background: ${localStyles.backgroundColor};\n  font-size: ${localStyles.fontSize};\n  width: ${localStyles.width};\n  height: ${localStyles.height};\n}`;
        const textToCopy = codeTab === 'tailwind'
            ? `<${selectedElement.tagName.toLowerCase()} class="${generatedCode}">`
            : generatedCss;
        navigator.clipboard.writeText(textToCopy);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    // --- SETUP EFFECT ---
    useEffect(() => {
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            if (!tabs[0]?.id) {
                setError("No active page found.");
            }
        });
        setError(null);
    }, []);

    if (error) {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-full text-center animate-fade-in text-slate-400">
                <p>{error}</p>
                <button onClick={() => chrome.tabs.reload()} className="mt-4 text-blue-400 hover:text-blue-300">Refresh Page</button>
            </div>
        )
    }

    if (!selectedElement) {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-full text-center animate-fade-in">
                <div className="w-16 h-16 bg-slate-800 text-blue-500 rounded-full flex items-center justify-center mb-4">
                    <Box size={32} strokeWidth={1.5} />
                </div>
                <h2 className="text-lg font-bold text-white mb-2">Inspector Mode Active</h2>
                <p className="text-slate-400 text-sm max-w-[200px] mb-6">
                    Hover over elements on the page to see details. Click to lock selection.
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-8 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => onTabChange('overview')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                        <ArrowLeft size={18} />
                    </button>
                    <h1 className="text-xl font-bold text-white">Inspect Element</h1>
                </div>
                <div className="p-2 bg-slate-800 rounded-full text-blue-400">
                    <RefreshCw size={14} className="cursor-pointer hover:rotate-180 transition-transform duration-500" onClick={() => handleSelectNode(selectedElement.cpId)} />
                </div>
            </div>

            {/* DOM HIERARCHY (Matches Overview) */}
            <section>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-bold text-white">DOM Hierarchy</h3>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700">Shallow View</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl">
                    <DomTree hierarchy={selectedElement.hierarchy} onSelectNode={handleSelectNode} />
                </div>
            </section>

            {/* SECTIONS */}
            <div className="space-y-6">
                {/* TYPOGRAPHY */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
                        <Type size={16} className="text-slate-400" />
                        <span className="text-sm font-bold text-slate-200">Typography</span>
                    </div>
                    <div className="p-4 space-y-4">
                        <SliderInput
                            label="Font Size"
                            value={localStyles.fontSize}
                            onChange={(val) => handleStyleChange('fontSize', val)}
                            originalValue={originalStyles.fontSize}
                            onReset={() => handleReset('fontSize')}
                            min={8} max={72}
                        />
                        <SelectInput
                            label="Font Weight"
                            value={localStyles.fontWeight}
                            onChange={(val) => handleStyleChange('fontWeight', val)}
                            originalValue={originalStyles.fontWeight}
                            onReset={() => handleReset('fontWeight')}
                            options={[
                                { value: '100', label: 'Thin (100)' },
                                { value: '300', label: 'Light (300)' },
                                { value: '400', label: 'Normal (400)' },
                                { value: '500', label: 'Medium (500)' },
                                { value: '600', label: 'SemiBold (600)' },
                                { value: '700', label: 'Bold (700)' },
                                { value: '900', label: 'Black (900)' },
                            ]}
                        />
                    </div>
                </div>

                {/* COLORS */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
                        <Palette size={16} className="text-slate-400" />
                        <span className="text-sm font-bold text-slate-200">Colors</span>
                    </div>
                    <div className="p-4 space-y-4">
                        <ColorInput
                            label="Text Color"
                            value={localStyles.color}
                            onChange={(val) => handleStyleChange('color', val)}
                            originalValue={originalStyles.color}
                            onReset={() => handleReset('color')}
                        />
                        <ColorInput
                            label="Background"
                            value={localStyles.backgroundColor}
                            onChange={(val) => handleStyleChange('backgroundColor', val)}
                            originalValue={originalStyles.backgroundColor}
                            onReset={() => handleReset('backgroundColor')}
                        />
                        <SliderInput
                            label="Border Width"
                            value={localStyles.borderWidth}
                            onChange={(val) => handleStyleChange('borderWidth', val)}
                            originalValue={originalStyles.borderWidth}
                            onReset={() => handleReset('borderWidth')}
                            min={0} max={20}
                        />
                        <SelectInput
                            label="Border Style"
                            value={localStyles.borderStyle}
                            onChange={(val) => handleStyleChange('borderStyle', val)}
                            originalValue={originalStyles.borderStyle}
                            onReset={() => handleReset('borderStyle')}
                            options={[
                                { value: 'solid', label: 'Solid' },
                                { value: 'dashed', label: 'Dashed' },
                                { value: 'dotted', label: 'Dotted' },
                                { value: 'double', label: 'Double' },
                                { value: 'none', label: 'None' },
                            ]}
                        />
                        <ColorInput
                            label="Border Color"
                            value={localStyles.borderColor}
                            onChange={(val) => handleStyleChange('borderColor', val)}
                            originalValue={originalStyles.borderColor}
                            onReset={() => handleReset('borderColor')}
                        />
                    </div>
                </div>

                {/* POSITIONING */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
                        <Move size={16} className="text-slate-400" />
                        <span className="text-sm font-bold text-slate-200">Positioning</span>
                    </div>
                    <div className="p-4 space-y-4">
                        <SelectInput
                            label="Type"
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
                                <SliderInput
                                    label="Top"
                                    value={localStyles.top}
                                    onChange={(val) => handleStyleChange('top', val)}
                                    min={-100} max={500} allowAuto
                                />
                                <SliderInput
                                    label="Right"
                                    value={localStyles.right}
                                    onChange={(val) => handleStyleChange('right', val)}
                                    min={-100} max={500} allowAuto
                                />
                                <SliderInput
                                    label="Bottom"
                                    value={localStyles.bottom}
                                    onChange={(val) => handleStyleChange('bottom', val)}
                                    min={-100} max={500} allowAuto
                                />
                                <SliderInput
                                    label="Left"
                                    value={localStyles.left}
                                    onChange={(val) => handleStyleChange('left', val)}
                                    min={-100} max={500} allowAuto
                                />
                            </div>
                        )}
                        {/* Z-Index could go here, but not in strict scope for Phase 1 */}
                    </div>
                </div>

                {/* LAYOUT */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
                        <Box size={16} className="text-slate-400" />
                        <span className="text-sm font-bold text-slate-200">Layout</span>
                    </div>
                    <div className="p-4 space-y-4">
                        {/* Spacing (Gap) - Only for Flex/Grid */}
                        {(localStyles.display === 'flex' || localStyles.display === 'grid') && (
                            <div className="pb-4 border-b border-slate-700 mb-4">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Child Spacing</div>
                                <SliderInput
                                    label="Gap"
                                    value={localStyles.flexGrid?.gap || '0px'}
                                    onChange={(val) => handleFlexGridChange('gap', val)}
                                    min={0} max={100}
                                />
                                {(localStyles.display === 'grid') && (
                                    <>
                                        <SliderInput
                                            label="Row Gap"
                                            value={localStyles.flexGrid?.rowGap || localStyles.flexGrid?.gap || '0px'}
                                            onChange={(val) => handleFlexGridChange('rowGap', val)}
                                            min={0} max={100}
                                        />
                                        <SliderInput
                                            label="Col Gap"
                                            value={localStyles.flexGrid?.columnGap || localStyles.flexGrid?.gap || '0px'}
                                            onChange={(val) => handleFlexGridChange('columnGap', val)}
                                            min={0} max={100}
                                        />
                                    </>
                                )}
                            </div>
                        )}

                        {/* Flex Controls */}
                        {localStyles.display === 'flex' && (
                            <div className="pb-4 border-b border-slate-700 mb-4">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Flexbox</div>
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
                            </div>
                        )}

                        {/* Grid Controls */}
                        {localStyles.display === 'grid' && (
                            <div className="pb-4 border-b border-slate-700 mb-4">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Grid Layout</div>
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
                                    value="custom" // Placeholder as we didn't impl row reading yet fully
                                    onChange={(val) => handleGridPreset('gridTemplateRows', val)}
                                    options={[
                                        { value: '1', label: '1 Row' },
                                        { value: '2', label: '2 Rows' },
                                        { value: '3', label: '3 Rows' },
                                        { value: '4', label: '4 Rows' },
                                        { value: 'custom', label: 'Custom' },
                                    ]}
                                />
                            </div>
                        )}

                        <SpacingInput
                            key={`${selectedElement.cpId}-padding`}
                            label="Padding"
                            values={localStyles.padding}
                            onChange={(val) => handleStyleChange('padding', val)}
                            originalValues={originalStyles.padding}
                            onReset={() => handleReset('padding')}
                        />
                        <SpacingInput
                            key={`${selectedElement.cpId}-margin`}
                            label="Margin"
                            values={localStyles.margin}
                            onChange={(val) => handleStyleChange('margin', val)}
                            originalValues={originalStyles.margin}
                            onReset={() => handleReset('margin')}
                        />
                        <RadiusInput
                            label="Radius"
                            values={localStyles.borderRadius}
                            onChange={(val) => handleStyleChange('borderRadius', val)}
                            originalValues={originalStyles.borderRadius}
                            onReset={() => handleReset('borderRadius')}
                            max={Math.max(50, Math.round(Math.min(
                                parseFloat(localStyles.width) || selectedElement.width || 0,
                                parseFloat(localStyles.height) || selectedElement.height || 0
                            ) / 2))}
                        />
                        <SelectInput
                            label="Display"
                            value={localStyles.display}
                            onChange={(val) => handleStyleChange('display', val)}
                            originalValue={originalStyles.display}
                            onReset={() => handleReset('display')}
                            options={[
                                { value: 'block', label: 'block' },
                                { value: 'flex', label: 'flex' },
                                { value: 'grid', label: 'grid' },
                                { value: 'inline-block', label: 'inline-block' },
                                { value: 'none', label: 'none' },
                            ]}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <SliderInput label="Width" value={localStyles.width} onChange={(val) => handleStyleChange('width', val)} originalValue={originalStyles.width} onReset={() => handleReset('width')} min={0} max={1000} allowAuto />
                            <SliderInput label="Height" value={localStyles.height} onChange={(val) => handleStyleChange('height', val)} originalValue={originalStyles.height} onReset={() => handleReset('height')} min={0} max={1000} allowAuto />
                        </div>

                        {/* Shape Tools */}
                        <div className="pt-2 border-t border-slate-700">
                            <div className="mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Shapes</div>
                            <div className="grid grid-cols-3 gap-2">
                                <ShapeButton label="Square" icon={Square} onClick={() => applyShape('square')} />
                                <ShapeButton label="Rounded" icon={MousePointerClick} onClick={() => applyShape('rounded')} />
                                <ShapeButton label="Circle" icon={Circle} onClick={() => applyShape('circle')} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* GENERATED CODE */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden mt-4">
                <div className="flex border-b border-slate-800">
                    <button
                        onClick={() => setCodeTab('tailwind')}
                        className={`flex-1 py-2 text-xs font-bold transition-colors ${codeTab === 'tailwind' ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-800/30' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Tailwind
                    </button>
                    <button
                        onClick={() => setCodeTab('css')}
                        className={`flex-1 py-2 text-xs font-bold transition-colors ${codeTab === 'css' ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-800/30' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        CSS
                    </button>
                    <button onClick={copyToClipboard} className="px-3 border-l border-slate-800 text-slate-400 hover:text-white flex items-center gap-1.5 min-w-[70px] justify-center">
                        {isCopied ? (
                            <>
                                <Check size={12} className="text-green-500" />
                                <span className="text-[10px] text-green-500 uppercase font-bold">Copied</span>
                            </>
                        ) : (
                            <>
                                <Copy size={12} />
                                <span className="text-[10px] uppercase font-bold">Copy</span>
                            </>
                        )}
                    </button>
                </div>
                <div className="p-4 pt-2">
                    <div className="relative group/code">
                        <textarea
                            value={codeTab === 'tailwind'
                                ? `<${selectedElement.tagName.toLowerCase()} class="${generatedCode}">`
                                : `${selectedElement.tagName.toLowerCase()} {\n  color: ${localStyles.color};\n  background: ${localStyles.backgroundColor};\n  font-size: ${localStyles.fontSize};\n  width: ${localStyles.width};\n  height: ${localStyles.height};\n}`
                            }
                            readOnly={true}
                            className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-blue-300 resize-none focus:outline-none"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
