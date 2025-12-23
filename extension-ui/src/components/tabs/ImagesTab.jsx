import React from 'react';

export default function ImagesTab() {
    return (
        <div className="p-4 animate-fade-in">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900">Images & Videos</h2>
                <span className="bg-gray-100 text-gray-500 text-xs px-2 py-1 rounded-full">0</span>
            </div>

            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                    <span className="text-2xl">🖼️</span>
                </div>
                <p className="text-gray-500 text-sm">No images found</p>
                <button className="mt-4 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg shadow hover:bg-indigo-500 transition-colors">
                    Scan Page
                </button>
            </div>
        </div>
    );
}
