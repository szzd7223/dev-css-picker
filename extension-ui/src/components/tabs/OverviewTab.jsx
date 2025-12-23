import React, { useState } from 'react';
import { usePageData } from '../../hooks/usePageData';
import { Copy, Check } from 'lucide-react';

export default function OverviewTab({ onTabChange }) {
    const { fonts, bgColors, textColors, meta, loading, error, rescan } = usePageData();
    const [copiedColor, setCopiedColor] = useState(null);

    const handleCopy = (color) => {
        navigator.clipboard.writeText(color);
        setCopiedColor(color);
        setTimeout(() => setCopiedColor(null), 2000);
    };

    if (loading) {
        return (
            <div className="p-8 flex flex-col items-center justify-center animate-pulse space-y-4">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <p className="text-gray-400 text-sm">Scanning page assets...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-center">
                <p className="text-red-500 mb-2">{error}</p>
                <button onClick={rescan} className="text-sm text-indigo-600 font-medium hover:underline">Retry</button>
            </div>
        )
    }

    const renderColorRow = (label, colors, count) => (
        <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
                <h3 className="text-md font-bold text-gray-800">{label}</h3>
                <span className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-md font-medium">{count}</span>
            </div>
            <div className="space-y-2">
                {colors.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No colors detected.</p>
                ) : (
                    colors.slice(0, 5).map((item, idx) => (
                        <div
                            key={idx}
                            onClick={() => handleCopy(item.value)}
                            className="group flex items-center justify-between p-1 pr-3 rounded-lg border border-gray-100 hover:border-indigo-100 hover:bg-gray-50 cursor-pointer transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-12 h-12 rounded-md shadow-sm border border-gray-200"
                                    style={{ backgroundColor: item.value }}
                                />
                                <span className="font-mono text-sm text-gray-700 font-medium">{item.value}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                {copiedColor === item.value ? (
                                    <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-md flex items-center gap-1">
                                        <Check size={12} /> Copied
                                    </span>
                                ) : (
                                    <>
                                        <span className="text-xs text-gray-400 group-hover:hidden">{item.count} instances</span>
                                        <span className="hidden group-hover:flex text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md text-xs font-medium items-center gap-1">
                                            <Copy size={12} /> Copy
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );

    return (
        <div className="p-4 space-y-6 animate-fade-in pb-20">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900 truncate pr-4">{meta.title || 'Overview'}</h2>
            </div>

            {/* Typography Section */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-gray-700">Typography</h3>
                    <span className="text-xs text-gray-400">{fonts.length} found</span>
                </div>
                <div className="p-3 space-y-2">
                    {fonts.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">No fonts detected.</p>
                    ) : (
                        fonts.map((font, idx) => (
                            <div key={idx} className="flex justify-between items-center py-1">
                                <span className="text-sm text-gray-700 font-medium truncate w-40" style={{ fontFamily: font.value }}>{font.value}</span>
                                <span className="text-xs text-gray-400">{font.count} uses</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Enhanced Color Palette Preview */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Color Palette</h2>
                    <button
                        onClick={() => onTabChange('colors')}
                        className="text-indigo-600 text-xs font-semibold hover:text-indigo-700 hover:underline"
                    >
                        See all →
                    </button>
                </div>

                {renderColorRow("Background Colors", bgColors, bgColors.length)}
                {renderColorRow("Text Colors", textColors, textColors.length)}
            </div>
        </div>
    );
}
