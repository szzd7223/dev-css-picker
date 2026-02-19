import React, { useState, useEffect } from 'react';
import { RotateCcw, ChevronDown, Maximize2, Minimize2, Equal, Ban } from 'lucide-react';

export const ColorInput = ({ label, value, onChange, originalValue, onReset }) => {
    const isChanged = originalValue !== undefined && value !== originalValue;
    const [internalValue, setInternalValue] = useState(value || '');
    const [isFocused, setIsFocused] = useState(false);

    // Sync internal value with prop value when not focused, to allow external updates (like picking a color)
    // without overwriting the user while they are typing.
    useEffect(() => {
        if (!isFocused) {
            setInternalValue(value || '');
        }
    }, [value, isFocused]);

    const handleCommit = () => {
        if (internalValue !== value) {
            onChange(internalValue);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleCommit();
            e.currentTarget.blur();
        }
    };

    return (
        <div className="flex items-center justify-between mb-2 group">
            <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-400 uppercase">{label}</label>
                {isChanged && (
                    <button
                        onClick={onReset}
                        className="text-slate-600 hover:text-primary opacity-0 group-hover:opacity-100 transition-all p-0.5 rounded"
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
                            backgroundImage: value === 'transparent' ? 'conic-gradient(#0A0D0A 0.25turn, #050705 0.25turn 0.5turn, #0A0D0A 0.5turn 0.75turn, #050705 0.75turn)' : 'none',
                            backgroundSize: '8px 8px'
                        }}
                    />
                </div>
                <input
                    type="text"
                    value={internalValue}
                    onChange={(e) => setInternalValue(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => { setIsFocused(false); handleCommit(); }}
                    onKeyDown={handleKeyDown}
                    className="w-24 text-xs font-mono border border-slate-700 bg-bg rounded px-2 py-1 text-right text-slate-200 focus:border-primary outline-none"
                    spellCheck={false}
                />
                <button
                    onClick={() => onChange(value === 'transparent' ? '#000000' : 'transparent')}
                    className={`h-7 w-7 flex items-center justify-center rounded border transition-colors ${value === 'transparent' ? 'bg-primary border-primary text-bg' : 'bg-surface border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'}`}
                    title="Toggle Transparent"
                >
                    <Ban size={14} />
                </button>
            </div>
        </div>
    );
};

const UNITS = ['px', '%', 'rem', 'vw', 'vh'];

const parseValue = (val) => {
    if (!val || val === 'auto') return { num: 0, unit: 'px', isAuto: true };
    if (typeof val === 'number') return { num: val, unit: 'px', isAuto: false };
    const match = String(val).match(/^([\d.-]+)([a-z%]*)$/);
    if (!match) return { num: '', unit: 'px', isAuto: false };
    return {
        num: parseFloat(match[1]),
        unit: match[2] || 'px',
        isAuto: false
    };
};

export const convertToPx = (value, fallbackPx = 0) => {
    const { num, unit, isAuto } = parseValue(value);
    if (isAuto) return fallbackPx;

    switch (unit) {
        case 'rem': return num * 16;
        case 'vw': return (num * window.innerWidth) / 100;
        case 'vh': return (num * window.innerHeight) / 100;
        case '%': return (num * fallbackPx) / 100;
        case 'px':
        default: return num;
    }
};

export const convertFromPx = (pxValue, targetUnit, referencePx = 1) => {
    switch (targetUnit) {
        case 'rem': return pxValue / 16;
        case 'vw': return (pxValue * 100) / window.innerWidth;
        case 'vh': return (pxValue * 100) / window.innerHeight;
        case '%': return (pxValue * 100) / referencePx;
        case 'px':
        default: return pxValue;
    }
};

export const SliderInput = ({ label, value, onChange, min = 0, max = 1000, allowAuto = false, originalValue, onReset, placeholderValue, hideUnitSelector = false, disabled = false, unitless = false, step, hideSlider = false, stacked = false, forceInteger = false }) => {
    const { num, unit: parsedUnit, isAuto } = parseValue(value);
    // If unitless, force empty string. Otherwise respect hideUnitSelector or parsed unit.
    const unit = unitless ? '' : ((hideUnitSelector || forceInteger) ? 'px' : parsedUnit);
    const isChanged = originalValue !== undefined && value !== originalValue;
    const [showUnits, setShowUnits] = useState(false);
    const isDisabled = disabled || isAuto;

    // Local state for text input to allow free typing without reset loops
    // We store the RAW string user types (e.g. "10", "10.5", "") to avoid premature parsing/formatting
    // If forceInteger is on, we might want to round the initial display, but maybe better to respect prop exactly?
    // Let's round initial state if forceInteger is true to hide "0.777" immediately.
    const initialVal = isAuto ? (placeholderValue || '') : (forceInteger ? Math.round(num) : num);
    const [internalValue, setInternalValue] = useState(initialVal);
    const [isFocused, setIsFocused] = useState(false);

    // Sync from props -> internal state, ONLY if not focused
    useEffect(() => {
        if (!isFocused) {
            setInternalValue(isAuto ? (placeholderValue || '') : (forceInteger ? Math.round(num) : num));
        }
    }, [value, isAuto, placeholderValue, num, isFocused, forceInteger]);


    // Adjust max based on unit
    let currentMax = max;
    let currentMin = min;
    // Only adjust if we have a unit that needs it
    if (!unitless) {
        if (unit === '%') {
            currentMax = 100;
            currentMin = Math.max(-100, min);
        }
        if (unit === 'rem') {
            currentMax = max / 16;
            currentMin = min / 16;
        }
        if (unit === 'vw' || unit === 'vh') {
            currentMax = 100;
            currentMin = Math.max(-100, min);
        }
    }

    // Determine Step
    // If unit is px (default) and no step provided, default to 1 (integer)
    let currentStep = step;
    if (!currentStep) {
        if (forceInteger) currentStep = 1;
        else if (unit === 'rem') currentStep = 0.1;
        else if (unit === 'px' || !unit) currentStep = 1;
        else currentStep = 1;
    }

    // Slider is "live" - it updates parent immediately, which updates props, which updates internal state (via effect)
    const handleSliderChange = (newVal) => {
        const valToEmit = forceInteger ? Math.round(newVal) : newVal;
        onChange(`${valToEmit}${unit}`);
    };

    const handleUnitChange = (newUnit) => {
        setShowUnits(false);
        // Try to convert roughly or just keep value? Keeping value usually safer for UX flow
        onChange(`${num}${newUnit}`);
    };

    const toggleAuto = () => {
        if (isAuto) {
            onChange(`${placeholderValue || 0}${unit}`);
        } else {
            onChange('auto');
        }
    };

    // Commit logic for text input
    const handleCommit = () => {
        //If auto, ignore
        if (isAuto) return;

        // Parse internalValue
        if (internalValue === '' || internalValue === '-') {
            // maybe reset to 0? or just leave it?
            // If empty, let's assume 0 for safety, or keep previous.
            // actually, if we send "0px", that's fine.
            onChange(`0${unit}`);
            return;
        }

        const parsed = parseFloat(internalValue);
        if (!isNaN(parsed)) {
            onChange(`${parsed}${unit}`);
        } else {
            // reverting to prop value handled by useEffect when focus lost (if we trigger it)
            // But we can just reload from props
            setInternalValue(num);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleCommit();
            e.currentTarget.blur();
        }
    };

    return (
        <div className="mb-3 group relative">
            {/* Row 1: Label & Reset */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {label && <label className="text-xs font-medium text-slate-400 uppercase">{label}</label>}
                    {isChanged && (
                        <button
                            onClick={onReset}
                            className="text-slate-600 hover:text-primary opacity-0 group-hover:opacity-100 transition-all p-0.5 rounded"
                            title="Reset to original"
                        >
                            <RotateCcw size={10} />
                        </button>
                    )}
                </div>
            </div>

            {/* Row 2: Controls (Auto Toggle & Input) */}
            <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex-1">
                    {allowAuto && (
                        <button
                            onClick={toggleAuto}
                            className={`text-[9px] px-2 py-1 rounded border transition-colors uppercase font-bold tracking-wider flex items-center gap-1 ${isAuto ? 'bg-primary-muted border-primary/50 text-primary' : 'bg-surface border-slate-700 text-slate-500 hover:text-slate-300'}`}
                            title="Toggle Auto"
                        >
                            <div className={`w-1.5 h-1.5 rounded-full ${isAuto ? 'bg-primary' : 'bg-slate-600'}`} />
                            Auto
                        </button>
                    )}
                </div>

                {/* Value Display & Unit Selector */}
                <div className="flex items-center bg-bg border border-slate-800 rounded px-2 py-1 focus-within:border-primary/50 transition-colors w-24">
                    <input
                        type="text"
                        value={internalValue}
                        onChange={(e) => setInternalValue(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => { setIsFocused(false); handleCommit(); }}
                        onKeyDown={handleKeyDown}
                        disabled={isAuto}
                        className={`w-full text-xs font-mono font-bold border-none p-0 text-right outline-none focus:ring-0 appearance-none bg-transparent ${isAuto ? 'text-slate-500' : 'text-slate-200'}`}
                    />
                    {!isAuto && !unitless && (
                        <div className="relative border-l border-slate-800 pl-2 ml-2">
                            {hideUnitSelector ? (
                                <span className="text-[10px] text-slate-600 font-medium">{unit}</span>
                            ) : (
                                <button
                                    onClick={() => setShowUnits(!showUnits)}
                                    className="text-[10px] text-slate-500 hover:text-primary font-medium flex items-center hover:bg-surface rounded px-1 -mr-1"
                                >
                                    {unit}
                                </button>
                            )}
                            {showUnits && !hideUnitSelector && (
                                <div className="absolute top-full right-0 mt-1 bg-surface border border-slate-700 rounded shadow-xl z-50 flex flex-col min-w-[50px]">
                                    {UNITS.map(u => (
                                        <button
                                            key={u}
                                            onClick={() => handleUnitChange(u)}
                                            className={`text-[10px] px-2 py-1 text-left hover:bg-slate-700 ${u === unit ? 'text-primary font-bold' : 'text-slate-400'}`}
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

            {/* Row 3: Slider */}
            {!hideSlider && (
                <div className="flex items-center gap-2">
                    <input
                        type="range"
                        min={currentMin}
                        max={currentMax}
                        step={currentStep}
                        value={num === '' ? 0 : num}
                        disabled={isDisabled}
                        onChange={(e) => handleSliderChange(e.target.value)}
                        className={`w-full h-1 rounded-lg appearance-none cursor-pointer accent-primary ${isDisabled ? 'bg-surface opacity-50 cursor-not-allowed' : 'bg-slate-700'}`}
                    />
                </div>
            )}
            {/* Backdrop for unit dropdown */}
            {showUnits && (
                <div className="fixed inset-0 z-40" onClick={() => setShowUnits(false)} />
            )}
        </div>
    );
};

// New Component for handling Padding/Margin (All sides or Separate)
export const SpacingInput = ({ label, values, onChange, originalValues, onReset, min = 0, max = 100, allowAuto = false, placeholderValues }) => {
    // values is object { top, right, bottom, left } or string (if previously single)
    const getObj = (val) => {
        if (typeof val === 'string') return { top: val, right: val, bottom: val, left: val };
        return val || { top: '0px', right: '0px', bottom: '0px', left: '0px' };
    };

    const current = getObj(values);
    const original = getObj(originalValues);
    const placeholders = getObj(placeholderValues);

    // Normalize for comparison to avoid '10px' vs '10px ' issues
    const norm = (v) => String(v).trim();

    // SINGLE SOURCE OF TRUTH: Data drives the state.
    // If sides are different, we MUST show expanded view to represent truth.
    const areSidesDifferent =
        norm(current.top) !== norm(current.right) ||
        norm(current.top) !== norm(current.bottom) ||
        norm(current.top) !== norm(current.left);

    // Global Reset Logic
    const isChanged =
        norm(current.top) !== norm(original.top) ||
        norm(current.right) !== norm(original.right) ||
        norm(current.bottom) !== norm(original.bottom) ||
        norm(current.left) !== norm(original.left);

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
        <div className="bg-surface/50 rounded-lg p-2 border border-slate-700/50 mb-3">
            <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-400 uppercase flex items-center gap-2">
                    {label}
                </label>

                <div className="flex items-center gap-1">
                    {/* Global Reset */}
                    {isChanged && (
                        <button
                            onClick={onReset}
                            className="flex items-center justify-center p-1 rounded hover:bg-surface text-slate-500 hover:text-primary transition-colors mr-1"
                            title="Reset all sides"
                        >
                            <RotateCcw size={10} />
                        </button>
                    )}

                    {areSidesDifferent && (
                        <button
                            onClick={() => handleAllChange(current.top)}
                            className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface hover:bg-slate-700 text-[10px] text-primary transition-colors border border-slate-600 hover:border-primary/50"
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
                                ? 'bg-surface text-primary'
                                : 'hover:bg-surface text-slate-500 hover:text-primary'
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
                        min={min} max={max}
                        allowAuto={allowAuto}
                        placeholderValue={placeholders.top}
                        stacked={true}
                    />
                    <SliderInput
                        label="Right"
                        value={current.right}
                        onChange={(v) => handleSideChange('right', v)}
                        originalValue={original.right}
                        onReset={() => handleSideChange('right', original.right)}
                        min={min} max={max}
                        allowAuto={allowAuto}
                        placeholderValue={placeholders.right}
                        stacked={true}
                    />
                    <SliderInput
                        label="Bottom"
                        value={current.bottom}
                        onChange={(v) => handleSideChange('bottom', v)}
                        originalValue={original.bottom}
                        onReset={() => handleSideChange('bottom', original.bottom)}
                        min={min} max={max}
                        allowAuto={allowAuto}
                        placeholderValue={placeholders.bottom}
                        stacked={true}
                    />
                    <SliderInput
                        label="Left"
                        value={current.left}
                        onChange={(v) => handleSideChange('left', v)}
                        originalValue={original.left}
                        onReset={() => handleSideChange('left', original.left)}
                        min={min} max={max}
                        allowAuto={allowAuto}
                        placeholderValue={placeholders.left}
                        stacked={true}
                    />
                </div>
            ) : (
                <SliderInput
                    label="All Sides"
                    value={current.top}
                    onChange={handleAllChange}
                    originalValue={original.top}
                    onReset={() => onChange(original)}
                    min={min} max={max}
                    allowAuto={allowAuto}
                    placeholderValue={placeholders.top}
                />
            )}
        </div>
    );
};

export const RadiusInput = ({ label, values, onChange, originalValues, onReset, max = 100 }) => {
    // values is object { topLeft, topRight, bottomRight, bottomLeft } or string (if previously single)
    const getObj = (val) => {
        if (typeof val === 'string') return { topLeft: val, topRight: val, bottomRight: val, bottomLeft: val };
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

    // Determine representative value
    let representativeValue;
    if (!areCornersDifferent) {
        representativeValue = current.topLeft;
    } else {
        const maxValue = Math.max(
            parseNum(current.topLeft),
            parseNum(current.topRight),
            parseNum(current.bottomRight),
            parseNum(current.bottomLeft)
        );
        const representativeUnit = getUnit(current.topLeft) || getUnit(current.topRight) || 'px';
        representativeValue = `${maxValue}${representativeUnit}`;
    }

    // State for Fine Tune Mode
    const [isFineTune, setIsFineTune] = useState(false);

    // Auto-detect removed: Fine Tune always hidden by default per user request


    const handleAllChange = (val) => {
        onChange({ topLeft: val, topRight: val, bottomRight: val, bottomLeft: val });
    };

    const handleCornerChange = (corner, val) => {
        onChange({ ...current, [corner]: val });
    };

    // Preset Handlers
    const setPreset = (val) => {
        handleAllChange(val);
        setIsFineTune(false); // Hide fine tune when preset clicked
    };

    const PRESETS = [
        { label: 'None', val: '0px', match: ['0px', '0'] },
        { label: 'SM', val: '0.125rem', match: ['2px', '0.125rem'] },
        { label: 'MD', val: '0.375rem', match: ['6px', '0.375rem'] },
        { label: 'LG', val: '0.5rem', match: ['8px', '0.5rem'] },
        { label: 'XL', val: '0.75rem', match: ['12px', '0.75rem'] },
        { label: '2XL', val: '1rem', match: ['16px', '1rem'] },
        { label: '3XL', val: '1.5rem', match: ['24px', '1.5rem'] },
        { label: '4XL', val: '2rem', match: ['32px', '2rem'] },
        { label: 'Full', val: '9999px', match: ['9999px', '50%'] },
    ];

    const isCurrentPreset = (matches) => {
        if (areCornersDifferent) return false;
        return matches.includes(representativeValue);
    };

    return (
        <div className="bg-surface/50 rounded-lg p-2 border border-slate-700/50 mb-3">
            <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-400 uppercase flex items-center gap-2">
                    {label}
                    {areCornersDifferent && (
                        <span className="text-[9px] bg-surface px-1.5 py-0.5 rounded text-primary ml-1">Mixed</span>
                    )}
                </label>

                <div className="flex items-center gap-2">
                    {/* Toggle Fine Tune */}
                    <button
                        onClick={() => setIsFineTune(!isFineTune)}
                        className={`text-[9px] font-bold uppercase tracking-wider transition-colors ${isFineTune ? 'text-primary' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        {isFineTune ? 'Hide Controls' : 'Fine Tune'}
                    </button>

                    {/* Global Reset */}
                    {(JSON.stringify(current) !== JSON.stringify(original)) && (
                        <button
                            onClick={onReset}
                            className="text-slate-600 hover:text-primary transition-colors p-0.5"
                            title="Reset to original"
                        >
                            <RotateCcw size={10} />
                        </button>
                    )}
                </div>
            </div>

            {/* Presets Row */}
            <div className="flex flex-wrap items-center gap-1 mb-2 bg-bg/50 p-1 rounded-md border border-slate-800/50">
                {PRESETS.map((preset) => (
                    <button
                        key={preset.label}
                        onClick={() => setPreset(preset.val)}
                        className={`flex-1 min-w-[36px] py-1.5 text-[10px] font-bold rounded transition-all border ${isCurrentPreset(preset.match) && !isFineTune
                            ? 'bg-primary border-primary text-bg shadow-sm'
                            : 'bg-transparent border-transparent text-slate-400 hover:bg-surface hover:text-slate-200'
                            }`}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            {/* Fine Tune Controls (Hidden by default) */}
            {isFineTune && (
                <div className="animate-fade-in pt-1 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-medium">Manual Input</span>
                        <button
                            onClick={() => setIsFineTune(false)} // Just verify if they want separate collapse
                            className="text-[9px] text-slate-600 hover:text-primary flex items-center gap-1"
                        >
                            {areCornersDifferent ? 'Collapse' : 'Expand Corners'}
                        </button>
                    </div>

                    {/* If mixed or expanded, show 4 inputs, else 1 */}
                    <div className="grid grid-cols-2 gap-2">
                        {areCornersDifferent ? (
                            <>
                                <SliderInput label="TL" value={current.topLeft} onChange={(v) => handleCornerChange('topLeft', v)} min={0} max={max} hideSlider={true} />
                                <SliderInput label="TR" value={current.topRight} onChange={(v) => handleCornerChange('topRight', v)} min={0} max={max} hideSlider={true} />
                                <SliderInput label="BR" value={current.bottomRight} onChange={(v) => handleCornerChange('bottomRight', v)} min={0} max={max} hideSlider={true} />
                                <SliderInput label="BL" value={current.bottomLeft} onChange={(v) => handleCornerChange('bottomLeft', v)} min={0} max={max} hideSlider={true} />
                            </>
                        ) : (
                            <div className="col-span-2">
                                <SliderInput
                                    label={null}
                                    value={representativeValue}
                                    onChange={handleAllChange}
                                    min={0} max={max}
                                    hideSlider={true}
                                    placeholderValue="0px"
                                />
                            </div>
                        )}
                    </div>
                </div>
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
                        className="text-slate-600 hover:text-primary opacity-0 group-hover:opacity-100 transition-all p-0.5 rounded"
                        title="Reset to original"
                    >
                        <RotateCcw size={10} />
                    </button>
                )}
            </div>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full text-sm bg-bg text-slate-200 border border-slate-700 rounded-md px-2 py-1.5 outline-none focus:border-primary"
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );
};
