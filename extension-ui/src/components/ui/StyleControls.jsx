import React, { useState, useEffect } from 'react';
import { RotateCcw, ChevronDown, Maximize2, Minimize2, Equal } from 'lucide-react';

export const ColorInput = ({ label, value, onChange, originalValue, onReset }) => {
    const isChanged = originalValue !== undefined && value !== originalValue;

    return (
        <div className="flex items-center justify-between mb-2 group">
            <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-400 uppercase">{label}</label>
                {isChanged && (
                    <button
                        onClick={onReset}
                        className="text-slate-600 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all p-0.5 rounded"
                        title="Reset to original"
                    >
                        <RotateCcw size={10} />
                    </button>
                )}
            </div>
            <div className="flex items-center gap-2">
                <div className="relative w-6 h-6 rounded-md border border-slate-700 shadow-sm overflow-hidden">
                    <input
                        type="color"
                        value={value && value !== 'transparent' ? value : '#000000'}
                        onChange={(e) => onChange(e.target.value)}
                        className="absolute inset-0 w-full h-full p-0 border-0 opacity-0 cursor-pointer"
                    />
                    <div
                        className="w-full h-full"
                        style={{
                            backgroundColor: value === 'transparent' ? 'transparent' : value,
                            backgroundImage: value === 'transparent' ? 'conic-gradient(#334155 0.25turn, #1e293b 0.25turn 0.5turn, #334155 0.5turn 0.75turn, #1e293b 0.75turn)' : 'none',
                            backgroundSize: '8px 8px'
                        }}
                    />
                </div>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-20 text-xs font-mono border border-slate-700 bg-slate-950 rounded px-2 py-1 text-right text-slate-200 focus:border-blue-500 outline-none"
                />
            </div>
        </div>
    );
};

const UNITS = ['px', '%', 'rem', 'em', 'vw', 'vh'];

const parseValue = (val) => {
    if (!val || val === 'auto') return { num: 0, unit: 'px', isAuto: true };
    if (typeof val === 'number') return { num: val, unit: 'px', isAuto: false };
    const match = String(val).match(/^([\d.-]+)([a-z%]*)$/);
    if (!match) return { num: 0, unit: 'px', isAuto: false }; // fallback
    return {
        num: parseFloat(match[1]),
        unit: match[2] || 'px',
        isAuto: false
    };
};

export const SliderInput = ({ label, value, onChange, min = 0, max = 1000, allowAuto = false, originalValue, onReset }) => {
    const { num, unit, isAuto } = parseValue(value);
    const isChanged = originalValue !== undefined && value !== originalValue;
    const [showUnits, setShowUnits] = useState(false);

    // Adjust max based on unit
    let currentMax = max;
    if (unit === '%') currentMax = 100;
    if (unit === 'rem' || unit === 'em') currentMax = 20;
    if (unit === 'vw' || unit === 'vh') currentMax = 100;

    const handleChange = (newVal) => {
        onChange(`${newVal}${unit}`);
    };

    const handleUnitChange = (newUnit) => {
        setShowUnits(false);
        // Try to convert roughly or just keep value? Keeping value usually safer for UX flow
        onChange(`${num}${newUnit}`);
    };

    const toggleAuto = () => {
        if (isAuto) {
            onChange(`0${unit}`);
        } else {
            onChange('auto');
        }
    };

    return (
        <div className="mb-3 group relative">
            <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-slate-400 uppercase">{label}</label>
                    {isChanged && (
                        <button
                            onClick={onReset}
                            className="text-slate-600 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all p-0.5 rounded"
                            title="Reset to original"
                        >
                            <RotateCcw size={10} />
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {allowAuto && (
                        <button
                            onClick={toggleAuto}
                            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${isAuto ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}
                        >
                            Auto
                        </button>
                    )}

                    {/* Value Display & Unit Selector */}
                    <div className="flex items-center bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 focus-within:border-blue-500/50 transition-colors">
                        {isAuto ? (
                            <span className="text-xs font-mono font-bold text-slate-500 mr-1 min-w-[20px] text-right">-</span>
                        ) : (
                            <input
                                type="text"
                                value={num}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    // Allow empty or minus sign for typing, but parse for valid numbers
                                    if (val === '' || val === '-') {
                                        onChange(`${val}${unit}`);
                                        return;
                                    }
                                    const parsed = parseFloat(val);
                                    if (!isNaN(parsed)) {
                                        onChange(`${val}${unit}`);
                                    }
                                }}
                                className="w-10 text-xs font-mono font-bold text-slate-200 bg-transparent border-none p-0 text-right outline-none focus:ring-0 appearance-none"
                            />
                        )}
                        {!isAuto && (
                            <div className="relative">
                                <button
                                    onClick={() => setShowUnits(!showUnits)}
                                    className="text-[10px] text-slate-500 hover:text-blue-400 font-medium flex items-center"
                                >
                                    {unit}
                                </button>
                                {showUnits && (
                                    <div className="absolute top-full right-0 mt-1 bg-slate-800 border border-slate-700 rounded shadow-xl z-50 flex flex-col min-w-[50px]">
                                        {UNITS.map(u => (
                                            <button
                                                key={u}
                                                onClick={() => handleUnitChange(u)}
                                                className={`text-[10px] px-2 py-1 text-left hover:bg-slate-700 ${u === unit ? 'text-blue-400 font-bold' : 'text-slate-400'}`}
                                            >
                                                {u}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="range"
                    min={min}
                    max={currentMax}
                    step={unit === 'rem' || unit === 'em' ? 0.1 : 1}
                    value={num}
                    disabled={isAuto}
                    onChange={(e) => handleChange(e.target.value)}
                    className={`w-full h-1 rounded-lg appearance-none cursor-pointer accent-blue-500 ${isAuto ? 'bg-slate-800 opacity-50 cursor-not-allowed' : 'bg-slate-700'}`}
                />
            </div>
            {/* Backdrop for unit dropdown */}
            {showUnits && (
                <div className="fixed inset-0 z-40" onClick={() => setShowUnits(false)} />
            )}
        </div>
    );
};

// New Component for handling Padding/Margin (All sides or Separate)
export const SpacingInput = ({ label, values, onChange, originalValues, onReset }) => {
    // values is object { top, right, bottom, left } or string (if previously single)
    const getObj = (val) => {
        if (typeof val === 'string') return { top: val, right: val, bottom: val, left: val };
        return val || { top: '0px', right: '0px', bottom: '0px', left: '0px' };
    };

    const current = getObj(values);
    const original = getObj(originalValues);

    // Normalize for comparison to avoid '10px' vs '10px ' issues
    const norm = (v) => String(v).trim();

    // SINGLE SOURCE OF TRUTH: Data drives the state.
    // If sides are different, we MUST show expanded view to represent truth.
    const areSidesDifferent =
        norm(current.top) !== norm(current.right) ||
        norm(current.top) !== norm(current.bottom) ||
        norm(current.top) !== norm(current.left);

    // User can opt-in to see expanded view even if sides are the same
    const [userWantsExpanded, setUserWantsExpanded] = useState(false);

    // Final state is a derivation
    const isExpanded = areSidesDifferent || userWantsExpanded;

    const handleAllChange = (val) => {
        onChange({ top: val, right: val, bottom: val, left: val });
    };

    const handleSideChange = (side, val) => {
        onChange({ ...current, [side]: val });
    };

    return (
        <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50 mb-3">
            <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-400 uppercase flex items-center gap-2">
                    {label}
                </label>

                <div className="flex items-center gap-1">
                    {areSidesDifferent && (
                        <button
                            onClick={() => handleAllChange(current.top)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] text-blue-300 transition-colors border border-slate-600 hover:border-blue-500/50"
                            title="Make all sides equal to Top value"
                        >
                            <Equal size={10} />
                            <span>Make Even</span>
                        </button>
                    )}

                    <button
                        onClick={() => setUserWantsExpanded(!userWantsExpanded)}
                        disabled={areSidesDifferent}
                        className={`p-1 rounded transition-colors ${areSidesDifferent
                            ? 'opacity-30 cursor-not-allowed text-slate-600'
                            : isExpanded
                                ? 'bg-slate-700 text-blue-400'
                                : 'hover:bg-slate-700 text-slate-500 hover:text-blue-400'
                            }`}
                        title={
                            areSidesDifferent
                                ? "Make even to collapse"
                                : isExpanded
                                    ? "Collapse to single value"
                                    : "Expand to 4 sides"
                        }
                    >
                        {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                    </button>
                </div>
            </div>

            {isExpanded ? (
                <div className="grid grid-cols-2 gap-x-4">
                    <SliderInput
                        label="Top"
                        value={current.top}
                        onChange={(v) => handleSideChange('top', v)}
                        originalValue={original.top}
                        onReset={() => handleSideChange('top', original.top)}
                        min={0} max={100}
                    />
                    <SliderInput
                        label="Right"
                        value={current.right}
                        onChange={(v) => handleSideChange('right', v)}
                        originalValue={original.right}
                        onReset={() => handleSideChange('right', original.right)}
                        min={0} max={100}
                    />
                    <SliderInput
                        label="Bottom"
                        value={current.bottom}
                        onChange={(v) => handleSideChange('bottom', v)}
                        originalValue={original.bottom}
                        onReset={() => handleSideChange('bottom', original.bottom)}
                        min={0} max={100}
                    />
                    <SliderInput
                        label="Left"
                        value={current.left}
                        onChange={(v) => handleSideChange('left', v)}
                        originalValue={original.left}
                        onReset={() => handleSideChange('left', original.left)}
                        min={0} max={100}
                    />
                </div>
            ) : (
                <SliderInput
                    label="All Sides"
                    value={current.top}
                    onChange={handleAllChange}
                    originalValue={original.top}
                    onReset={() => onChange(original)}
                    min={0} max={100}
                />
            )}
        </div>
    );
};

export const RadiusInput = ({ label, values, onChange, originalValues, onReset, max = 100 }) => {
    // values is object { topLeft, topRight, bottomRight, bottomLeft } or string (if previously single)
    const getObj = (val) => {
        if (typeof val === 'string') return { topLeft: val, topRight: val, bottomRight: val, bottomLeft: val };
        // Handle case where val is object but missing keys (e.g. initial load)
        const v = val || {};
        return {
            topLeft: v.topLeft || '0px',
            topRight: v.topRight || '0px',
            bottomRight: v.bottomRight || '0px',
            bottomLeft: v.bottomLeft || '0px'
        };
    };

    const current = getObj(values);
    const original = getObj(originalValues);

    const norm = (v) => String(v).trim();
    const parseNum = (v) => parseFloat(v) || 0;

    const areCornersDifferent =
        norm(current.topLeft) !== norm(current.topRight) ||
        norm(current.topLeft) !== norm(current.bottomRight) ||
        norm(current.topLeft) !== norm(current.bottomLeft);

    const [userWantsExpanded, setUserWantsExpanded] = useState(false);

    // Default to collapsed unless user explicitly expands, to fulfill "single slider" request.
    // However, if they are different, we might want to alert, but user asked for "put slider to value".
    const isExpanded = userWantsExpanded;

    // Determine representative value (Max of corners)
    const maxValue = Math.max(
        parseNum(current.topLeft),
        parseNum(current.topRight),
        parseNum(current.bottomRight),
        parseNum(current.bottomLeft)
    );

    // We keep the unit from the first non-zero corner, or default to px
    const getUnit = (v) => {
        const match = String(v).match(/[a-z%]+$/);
        return match ? match[0] : 'px';
    };
    const representativeUnit = getUnit(current.topLeft) || getUnit(current.topRight) || 'px';
    const representativeValue = `${maxValue}${representativeUnit}`;

    const handleAllChange = (val) => {
        onChange({ topLeft: val, topRight: val, bottomRight: val, bottomLeft: val });
    };

    const handleCornerChange = (corner, val) => {
        onChange({ ...current, [corner]: val });
    };

    return (
        <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50 mb-3">
            <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-400 uppercase flex items-center gap-2">
                    {label}
                    {areCornersDifferent && !isExpanded && (
                        <span className="text-[9px] bg-slate-700 px-1.5 py-0.5 rounded text-blue-300 ml-1">Mixed</span>
                    )}
                </label>

                <div className="flex items-center gap-1">
                    {areCornersDifferent && isExpanded && (
                        <button
                            onClick={() => handleAllChange(representativeValue)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[10px] text-blue-300 transition-colors border border-slate-600 hover:border-blue-500/50"
                            title="Sync all to max value"
                        >
                            <Equal size={10} />
                            <span>Sync</span>
                        </button>
                    )}

                    <button
                        onClick={() => setUserWantsExpanded(!userWantsExpanded)}
                        className={`p-1 rounded transition-colors ${isExpanded
                            ? 'bg-slate-700 text-blue-400'
                            : 'hover:bg-slate-700 text-slate-500 hover:text-blue-400'
                            }`}
                        title={isExpanded ? "Collapse" : "Expand individual corners"}
                    >
                        {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                    </button>
                </div>
            </div>

            {isExpanded ? (
                <div className="grid grid-cols-2 gap-x-4">
                    <SliderInput
                        label="Top-Left"
                        value={current.topLeft}
                        onChange={(v) => handleCornerChange('topLeft', v)}
                        min={0} max={max}
                    />
                    <SliderInput
                        label="Top-Right"
                        value={current.topRight}
                        onChange={(v) => handleCornerChange('topRight', v)}
                        min={0} max={max}
                    />
                    <SliderInput
                        label="Btm-Right"
                        value={current.bottomRight}
                        onChange={(v) => handleCornerChange('bottomRight', v)}
                        min={0} max={max}
                    />
                    <SliderInput
                        label="Btm-Left"
                        value={current.bottomLeft}
                        onChange={(v) => handleCornerChange('bottomLeft', v)}
                        min={0} max={max}
                    />
                </div>
            ) : (
                <SliderInput
                    label={null}
                    value={representativeValue}
                    onChange={handleAllChange}
                    min={0} max={max}
                />
            )}
        </div>
    );
};

export const SelectInput = ({ label, value, options, onChange, originalValue, onReset }) => {
    const isChanged = originalValue !== undefined && value !== originalValue;

    return (
        <div className="mb-2 group">
            <div className="flex items-center gap-2 mb-1">
                <label className="text-xs font-medium text-slate-400 uppercase block">{label}</label>
                {isChanged && (
                    <button
                        onClick={onReset}
                        className="text-slate-600 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all p-0.5 rounded"
                        title="Reset to original"
                    >
                        <RotateCcw size={10} />
                    </button>
                )}
            </div>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full text-sm bg-slate-950 text-slate-200 border border-slate-700 rounded-md px-2 py-1.5 outline-none focus:border-blue-500"
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
};
