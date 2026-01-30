import React, { useState, useEffect } from 'react';
import { Palette, Layers, Code, Droplet } from 'lucide-react';
import { SliderInput, ColorInput, SelectInput } from '../ui/StyleControls';
import { parseGradient, buildGradientString } from '../../utils/gradientParser';
import { cleanStyleValue } from '../../utils/styleUtils';
import { useDevToolsStore } from '../../store/devtools';

export default function ColorsTab({ selectedElement, onUpdateElement }) {
    const [localStyles, setLocalStyles] = useState({});
    const [originalStyles, setOriginalStyles] = useState({});
    const { isInspectMode, setInspectMode } = useDevToolsStore();

    useEffect(() => {
        if (selectedElement) {
            const getOriginal = (prop, currentVal) => {
                if (selectedElement.originalStyles && selectedElement.originalStyles[prop] !== undefined) {
                    return selectedElement.originalStyles[prop];
                }
                return currentVal;
            };

            const initialState = {
                color: selectedElement.colors.text,
                backgroundColor: selectedElement.colors.background,
                backgroundImage: selectedElement.colors.backgroundImage || 'none',
                borderColor: selectedElement.colors.border || 'transparent',
                borderWidth: selectedElement.inlineStyle?.borderWidth || cleanStyleValue(selectedElement.boxModel.borderWidth),
                borderStyle: selectedElement.inlineStyle?.borderStyle || selectedElement.boxModel.borderStyle || 'none',
            };

            const originalState = {
                color: getOriginal('color', initialState.color),
                backgroundColor: getOriginal('background-color', initialState.backgroundColor),
                backgroundImage: getOriginal('background-image', initialState.backgroundImage),
                borderColor: getOriginal('border-color', initialState.borderColor),
                borderWidth: getOriginal('border-width', initialState.borderWidth),
                borderStyle: getOriginal('border-style', initialState.borderStyle),
            };

            setOriginalStyles(originalState);
            setLocalStyles(initialState);
        }
    }, [selectedElement]);



    const handleStyleChange = (property, value) => {
        const nextStyles = { ...localStyles, [property]: value };
        setLocalStyles(nextStyles);
        if (onUpdateElement) onUpdateElement({ [property]: value });
    };

    const handleReset = (property) => {
        if (originalStyles[property] !== undefined) {
            handleStyleChange(property, originalStyles[property]);
        }
    };


    if (!selectedElement) {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-full text-center animate-fade-in">
                <div className={`w-16 h-16 ${isInspectMode ? 'bg-slate-800' : 'bg-slate-800/50'} text-blue-500 rounded-full flex items-center justify-center mb-4`}>
                    <Palette size={32} strokeWidth={1.5} className={isInspectMode ? 'animate-pulse' : 'opacity-40'} />
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
                        <h2 className="text-lg font-bold text-white mb-2">Style Colors</h2>
                        <p className="text-slate-400 text-sm max-w-[200px] mb-6">
                            Enable inspect mode to select an element and start editing colors and backgrounds.
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
                <Palette size={18} className="text-blue-400" />
                <h2 className="text-lg font-bold text-white">Colors & Backgrounds</h2>
            </div>

            {/* TEXT & BORDER */}
            <section className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-4">
                <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <Droplet size={12} /> Basic Colors
                </div>
                <ColorInput
                    label="Text Color"
                    value={localStyles.color}
                    onChange={(val) => handleStyleChange('color', val)}
                    originalValue={originalStyles.color}
                    onReset={() => handleReset('color')}
                />
                <div className="pt-4 border-t border-slate-700">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Border</div>
                    <div className="space-y-4">
                        <SliderInput
                            label="Width"
                            value={localStyles.borderWidth}
                            onChange={(val) => {
                                const numVal = parseFloat(val);
                                // Auto-enable border style if width is increased
                                if (numVal > 0 && (localStyles.borderStyle === 'none' || !localStyles.borderStyle)) {
                                    const nextStyles = {
                                        ...localStyles,
                                        borderWidth: val,
                                        borderStyle: 'solid'
                                    };
                                    setLocalStyles(nextStyles);
                                    if (onUpdateElement) onUpdateElement({ borderWidth: val, borderStyle: 'solid' });
                                } else {
                                    handleStyleChange('borderWidth', val);
                                }
                            }}
                            originalValue={originalStyles.borderWidth}
                            onReset={() => handleReset('borderWidth')}
                            min={0} max={20}
                            forceInteger={true}
                            hideUnitSelector={true}
                        />
                        <SelectInput
                            label="Style"
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
                            label="Color"
                            value={localStyles.borderColor}
                            onChange={(val) => handleStyleChange('borderColor', val)}
                            originalValue={originalStyles.borderColor}
                            onReset={() => handleReset('borderColor')}
                        />
                    </div>
                </div>
            </section>

            {/* BACKGROUNDS */}
            <section className="bg-slate-800 rounded-xl border border-slate-700 p-4 space-y-4">
                <div className="flex items-center gap-2 mb-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
                    <Layers size={12} /> Backgrounds
                </div>
                <ColorInput
                    label="Solid Color"
                    value={localStyles.backgroundColor}
                    onChange={(val) => handleStyleChange('backgroundColor', val)}
                    originalValue={originalStyles.backgroundColor}
                    onReset={() => handleReset('backgroundColor')}
                />

                {/* GRADIENT EDITOR */}
                {localStyles.backgroundImage && localStyles.backgroundImage !== 'none' && (
                    <div className="pt-4 border-t border-slate-700/50">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-300">Gradient Overlay</span>
                            <button
                                onClick={() => handleStyleChange('backgroundImage', 'none')}
                                className="text-[10px] text-red-400 hover:text-red-300 font-medium"
                            >
                                Remove
                            </button>
                        </div>

                        {(() => {
                            const parsed = parseGradient(localStyles.backgroundImage);

                            if (!parsed || parsed.isComplex) {
                                return (
                                    <div className="bg-slate-950 rounded p-2 border border-slate-700">
                                        <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1">
                                            <Code size={10} /> Complex Gradient
                                        </div>
                                        <textarea
                                            value={localStyles.backgroundImage}
                                            onChange={(e) => handleStyleChange('backgroundImage', e.target.value)}
                                            className="w-full h-16 bg-transparent text-xs font-mono text-slate-300 outline-none resize-none"
                                        />
                                    </div>
                                );
                            }

                            // Render Linear Gradient Editor
                            const updateStop = (index, field, val) => {
                                const newStops = [...parsed.stops];
                                newStops[index] = { ...newStops[index], [field]: val };
                                const newBg = buildGradientString(parsed.type, parsed.angle, newStops);
                                handleStyleChange('backgroundImage', newBg);
                            };

                            const addStop = () => {
                                const newStops = [...parsed.stops, { color: '#ffffff', position: '100%' }];
                                const newBg = buildGradientString(parsed.type, parsed.angle, newStops);
                                handleStyleChange('backgroundImage', newBg);
                            };

                            const removeStop = (index) => {
                                if (parsed.stops.length <= 2) return; // Minimum 2 stops
                                const newStops = parsed.stops.filter((_, i) => i !== index);
                                const newBg = buildGradientString(parsed.type, parsed.angle, newStops);
                                handleStyleChange('backgroundImage', newBg);
                            };

                            return (
                                <div className="space-y-3">
                                    {/* Preview & Angle */}
                                    <div className="flex gap-2">
                                        <div className="w-10 h-10 rounded border border-slate-600 shadow-inner shrink-0" style={{ background: localStyles.backgroundImage }}></div>
                                        <div className="flex-1">
                                            <SliderInput
                                                label="Angle (deg)"
                                                value={parsed.angle}
                                                onChange={(val) => {
                                                    const angle = parseInt(val) || 0;
                                                    const newBg = buildGradientString(parsed.type, angle, parsed.stops);
                                                    handleStyleChange('backgroundImage', newBg);
                                                }}
                                                min={0} max={360}
                                            />
                                        </div>
                                    </div>

                                    {/* Stops */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Stops</span>
                                            <button onClick={addStop} className="text-[10px] bg-slate-700 hover:bg-slate-600 px-1.5 py-0.5 rounded text-blue-300 transition-colors">+ Add</button>
                                        </div>
                                        {parsed.stops.map((stop, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <div className="relative w-6 h-6 rounded border border-slate-700 overflow-hidden shrink-0 group">
                                                    <input
                                                        type="color"
                                                        value={stop.color.startsWith('#') ? stop.color : '#000000'} // Basic fallback for color input compatibility
                                                        onChange={(e) => updateStop(i, 'color', e.target.value)}
                                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                    />
                                                    <div className="w-full h-full" style={{ backgroundColor: stop.color }}></div>
                                                </div>
                                                <div className="flex-1">
                                                    <input
                                                        type="text"
                                                        value={stop.position || ''}
                                                        placeholder="%"
                                                        onChange={(e) => updateStop(i, 'position', e.target.value)}
                                                        className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-xs font-mono text-slate-300 focus:border-blue-500 outline-none"
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => removeStop(i)}
                                                    disabled={parsed.stops.length <= 2}
                                                    className="w-5 h-5 flex items-center justify-center rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-colors"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </section>
        </div>
    );
}
