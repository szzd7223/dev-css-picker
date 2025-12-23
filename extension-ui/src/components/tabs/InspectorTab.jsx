import React from 'react';

export default function InspectorTab() {
    return (
        <div className="p-4 animate-fade-in">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Inspector</h2>
            <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                <p className="text-gray-500 text-sm mb-2">Select an element to inspect</p>
                <span className="text-xs text-gray-400">Hover over any element on the page</span>
            </div>
        </div>
    );
}
