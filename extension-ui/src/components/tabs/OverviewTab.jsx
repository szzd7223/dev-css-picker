import React from 'react';

export default function OverviewTab() {
    return (
        <div className="p-4 space-y-4 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900">Overview</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                    <div className="text-2xl font-bold text-indigo-600">--</div>
                    <div className="text-xs text-indigo-400 font-medium uppercase tracking-wide">Fonts</div>
                </div>
                <div className="p-3 bg-pink-50 rounded-xl border border-pink-100">
                    <div className="text-2xl font-bold text-pink-600">--</div>
                    <div className="text-xs text-pink-400 font-medium uppercase tracking-wide">Colors</div>
                </div>
            </div>

            <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Typography</h3>
                <p className="text-sm text-gray-400 italic">No data extracted yet.</p>
            </div>
        </div>
    );
}
