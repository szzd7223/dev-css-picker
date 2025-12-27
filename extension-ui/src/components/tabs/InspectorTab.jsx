import React, { useEffect, useState } from 'react';
import { Type, Palette, Box, Copy } from 'lucide-react';

export default function InspectorTab({ selectedElement, onSelectElement, onTabChange }) {
    // Local state removed, using props


    const [error, setError] = useState(null);

    useEffect(() => {
        // Function to send message to active tab
        const sendMessage = (type) => {
            chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
                if (tabs[0]?.id) {
                    chrome.tabs.sendMessage(tabs[0].id, { type }).catch((err) => {
                        console.log("Could not send message to content script:", err);
                        setError("Connection failed. Please reload the page.");
                    });
                } else {
                    setError("No active page found.");
                }
            });
        };

        // Start picking mode
        sendMessage('START_PICKING');
        setError(null);

        // Listen for selection
        const messageListener = (message) => {
            if (message.type === 'ELEMENT_SELECTED') {
                onSelectElement(message.payload);
            }
        };

        chrome.runtime.onMessage.addListener(messageListener);

        return () => {
            sendMessage('STOP_PICKING');
            chrome.runtime.onMessage.removeListener(messageListener);
        };
    }, []);

    if (error) {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-full text-center animate-fade-in">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <Box size={32} strokeWidth={1.5} />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Connection Error</h2>
                <p className="text-gray-500 text-sm max-w-[200px] mb-4">
                    {error}
                </p>
                <button
                    onClick={() => chrome.tabs.reload()}
                    className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                >
                    Refresh Page
                </button>
            </div>
        )
    }

    if (!selectedElement) {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-full text-center animate-fade-in">
                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                    <Box size={32} strokeWidth={1.5} />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Inspector Mode Active</h2>
                <p className="text-gray-500 text-sm max-w-[200px] mb-6">
                    Hover over elements on the page to see details. Click to lock selection.
                </p>
                <button
                    onClick={() => onTabChange('overview')}
                    className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                    Stop Inspecting
                </button>
            </div>
        );
    }

    const {
        tagName,
        fullSelector,
        colors,
        typography,
        boxModel,
        width,
        height
    } = selectedElement;

    return (
        <div className="p-4 space-y-6 animate-fade-in pb-20"> {/* pb-20 for bottom nav clearance */}

            {/* Header */}
            <div>
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Element Type</div>
                <h1 className="text-xl font-bold text-gray-900 capitalize mb-2">
                    {tagName === 'h1' || tagName === 'h2' || tagName === 'h3' ? 'Heading' :
                        tagName === 'img' ? 'Image' :
                            tagName === 'a' ? 'Link' :
                                tagName === 'div' ? 'Container' : tagName}
                </h1>
                <div className="inline-block bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-mono border border-indigo-100 break-all">
                    {fullSelector}
                </div>
            </div>

            {/* Colors */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center gap-2">
                    <Palette size={14} className="text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Colors</span>
                </div>
                <div className="p-4 space-y-4">

                    {/* Background */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Background</span>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md border border-gray-200 shadow-sm"
                                style={{
                                    backgroundColor: colors.background === 'transparent' ? 'white' : colors.background,
                                    backgroundImage: colors.background === 'transparent' ? 'conic-gradient(#eee 0.25turn, #fff 0.25turn 0.5turn, #eee 0.5turn 0.75turn, #fff 0.75turn)' : 'none',
                                    backgroundSize: '8px 8px'
                                }}>
                            </div>
                            <span className="text-xs font-bold font-mono text-gray-900 uppercase">{colors.background === 'transparent' ? 'None' : colors.background}</span>
                        </div>
                    </div>

                    {/* Text Color */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Text Color</span>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md border border-gray-200 shadow-sm" style={{ backgroundColor: colors.text }}></div>
                            <span className="text-xs font-bold font-mono text-gray-900 uppercase">{colors.text}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Typography */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center gap-2">
                    <Type size={14} className="text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Typography</span>
                </div>
                <div className="p-4 space-y-3">
                    <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                        <span className="text-sm text-gray-500">Font</span>
                        <span className="text-sm font-medium text-gray-900 text-right max-w-[150px] truncate" title={typography.font}>
                            {typography.font}
                        </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                        <span className="text-sm text-gray-500">Size</span>
                        <div>
                            <span className="text-sm font-bold text-gray-900">{typography.size}</span>
                            {/* Calculated rem? rough est: 16px = 1rem */}
                            <span className="text-xs text-gray-400 ml-1">
                                ({(parseFloat(typography.size) / 16).toFixed(2)}rem)
                            </span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                        <span className="text-sm text-gray-500">Weight</span>
                        <span className="text-sm font-bold text-gray-900">{typography.weight}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Line Height</span>
                        <span className="text-sm font-bold text-gray-900">{typography.lineHeight}</span>
                    </div>
                </div>
            </div>

            {/* Box Model / Info */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center gap-2">
                    <Box size={14} className="text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Box Model</span>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                    <div className='flex flex-col'>
                        <span className="text-xs text-gray-400 mb-1">Dimensions</span>
                        <span className="text-sm font-mono font-medium text-gray-900">{width} × {height} px</span>
                    </div>
                    <div className='flex flex-col'>
                        <span className="text-xs text-gray-400 mb-1">Display</span>
                        <span className="text-sm font-mono font-medium text-gray-900">{boxModel.display}</span>
                    </div>
                </div>
            </div>

        </div>
    );
}
