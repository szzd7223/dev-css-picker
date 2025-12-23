import React from 'react';

export default function ColorsTab() {
    return (
        <div className="p-4 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900">Colors</h2>
                <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">0</span>
            </div>

            <div className="space-y-6">
                <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Background Colors</h3>
                    <div className="grid grid-cols-5 gap-2">
                        {/* Placeholders */}
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="aspect-square rounded-lg bg-gray-100 animate-pulse"></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
