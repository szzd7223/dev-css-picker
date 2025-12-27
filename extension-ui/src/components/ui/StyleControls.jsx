import React from 'react';

export const ColorInput = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-medium text-gray-500 uppercase">{label}</label>
        <div className="flex items-center gap-2">
            <div className="relative w-6 h-6 rounded-md border border-gray-200 shadow-sm overflow-hidden">
                <input
                    type="color"
                    value={value && value !== 'transparent' ? value : '#ffffff'}
                    onChange={(e) => onChange(e.target.value)}
                    className="absolute inset-0 w-full h-full p-0 border-0 opacity-0 cursor-pointer"
                />
                <div
                    className="w-full h-full"
                    style={{
                        backgroundColor: value === 'transparent' ? 'white' : value,
                        backgroundImage: value === 'transparent' ? 'conic-gradient(#eee 0.25turn, #fff 0.25turn 0.5turn, #eee 0.5turn 0.75turn, #fff 0.75turn)' : 'none',
                        backgroundSize: '8px 8px'
                    }}
                />
            </div>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-20 text-xs font-mono border-none bg-gray-50 rounded px-2 py-1 text-right focus:ring-1 focus:ring-blue-500 outline-none"
            />
        </div>
    </div>
);

export const SliderInput = ({ label, value, onChange, min = 0, max = 100, unit = 'px' }) => {
    // Parse numeric value from string (e.g., "16px" -> 16)
    const numValue = parseInt(value) || 0;

    const handleChange = (newVal) => {
        onChange(`${newVal}${unit}`);
    };

    return (
        <div className="mb-3">
            <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-medium text-gray-500 uppercase">{label}</label>
                <span className="text-xs font-mono font-bold text-gray-900">{value}</span>
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={numValue}
                    onChange={(e) => handleChange(e.target.value)}
                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
            </div>
        </div>
    );
};

export const SelectInput = ({ label, value, options, onChange }) => (
    <div className="mb-2">
        <label className="text-xs font-medium text-gray-500 uppercase block mb-1">{label}</label>
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full text-sm bg-gray-50 border border-gray-200 rounded-md px-2 py-1.5 outline-none focus:border-blue-500"
        >
            {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    </div>
);
