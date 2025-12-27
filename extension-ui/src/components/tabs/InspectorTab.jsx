import React, { useEffect, useState, useMemo } from 'react';
import { Type, Palette, Box, Copy, Code, Layers } from 'lucide-react';
import DomTree from './DomTree';
import { ColorInput, SliderInput, SelectInput } from '../ui/StyleControls';
import { generateTailwindClasses } from '../../utils/tailwindGenerator';

export default function InspectorTab({ selectedElement, onSelectElement, onTabChange }) {
    const [error, setError] = useState(null);
    const [localStyles, setLocalStyles] = useState({});
    const [generatedCode, setGeneratedCode] = useState('');

    // Initialize/Reset local state when selection changes
    useEffect(() => {
        if (selectedElement) {
            setLocalStyles({
                color: selectedElement.colors.text,
                backgroundColor: selectedElement.colors.background,
                fontSize: selectedElement.typography.size,
                fontWeight: selectedElement.typography.weight,
                borderRadius: selectedElement.boxModel.borderRadius,
                padding: selectedElement.boxModel.padding,
                margin: selectedElement.boxModel.margin,
                borderWidth: '0px',
                borderColor: selectedElement.colors.border || 'transparent',
                display: selectedElement.boxModel.display
            });
        }
    }, [selectedElement?.cpId]);

    // Effect: Update Tailwind code and Live Preview when local styles change
    useEffect(() => {
        if (!selectedElement || Object.keys(localStyles).length === 0) return;

        // 1. Generate Code
        const code = generateTailwindClasses(localStyles);
        setGeneratedCode(code);

        // 2. Send Live Update
        // Send ALL modified styles to ensure consistency
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'UPDATE_STYLE',
                    payload: {
                        cpId: selectedElement.cpId,
                        styles: localStyles
                    }
                }).catch(() => { }); // Suppress errors if connection lost momentarily
            }
        });

    }, [localStyles, selectedElement]);


    // Handlers
    const handleStyleChange = (property, value) => {
        setLocalStyles(prev => ({ ...prev, [property]: value }));
    };

    const handleSelectNode = (cpId) => {
        // Request full data for the clicked node from content script
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'SELECT_NODE',
                    payload: { cpId }
                }, (response) => {
                    if (response && response.tagName) {
                        onSelectElement(response);
                    }
                });

                // Also highlight it immediately
                chrome.tabs.sendMessage(tabs[0].id, { type: 'HIGHLIGHT_NODE', payload: { cpId } });
            }
        });
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedCode);
        // Could show a toast here
    };

    // --- SETUP EFFECT (Connection & Initial Check) ---
    useEffect(() => {
        // Just verify connection, don't listen here (handled in App.jsx)
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            if (!tabs[0]?.id) {
                setError("No active page found.");
            }
        });
        setError(null);
    }, []);

    // --- RENDER ---

    if (error) {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-full text-center animate-fade-in">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                    <Box size={32} strokeWidth={1.5} />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">Connection Error</h2>
                <p className="text-gray-500 text-sm max-w-[200px] mb-4">{error}</p>
                <button onClick={() => chrome.tabs.reload()} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
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
                <div className="text-xs text-gray-400 bg-gray-50 px-3 py-2 rounded border border-gray-100">
                    Pro Tip: Click an element to edit styles live!
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6 animate-fade-in pb-20">

            {/* DOM TREE */}
            <DomTree hierarchy={selectedElement.hierarchy} onSelectNode={handleSelectNode} />

            <div className="space-y-4">
                {/* COLORS */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center gap-2">
                        <Palette size={14} className="text-gray-400" />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Colors</span>
                    </div>
                    <div className="p-4">
                        <ColorInput
                            label="Text Color"
                            value={localStyles.color}
                            onChange={(val) => handleStyleChange('color', val)}
                        />
                        <ColorInput
                            label="Background"
                            value={localStyles.backgroundColor}
                            onChange={(val) => handleStyleChange('backgroundColor', val)}
                        />
                        <ColorInput
                            label="Border Color"
                            value={localStyles.borderColor}
                            onChange={(val) => handleStyleChange('borderColor', val)}
                        />
                    </div>
                </div>

                {/* TYPOGRAPHY */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center gap-2">
                        <Type size={14} className="text-gray-400" />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Typography</span>
                    </div>
                    <div className="p-4">
                        <SliderInput
                            label="Font Size"
                            value={localStyles.fontSize}
                            onChange={(val) => handleStyleChange('fontSize', val)}
                            min={8} max={72}
                        />
                        <SelectInput
                            label="Font Weight"
                            value={localStyles.fontWeight}
                            onChange={(val) => handleStyleChange('fontWeight', val)}
                            options={[
                                { value: '100', label: 'Thin (100)' },
                                { value: '300', label: 'Light (300)' },
                                { value: '400', label: 'Normal (400)' },
                                { value: '500', label: 'Medium (500)' },
                                { value: '600', label: 'SemiBold (600)' },
                                { value: '700', label: 'Bold (700)' },
                                { value: '900', label: 'Black (900)' },
                            ]}
                        />
                    </div>
                </div>

                {/* LAYOUT */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center gap-2">
                        <Box size={14} className="text-gray-400" />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Layout</span>
                    </div>
                    <div className="p-4">
                        <SliderInput
                            label="Padding"
                            value={localStyles.padding}
                            onChange={(val) => handleStyleChange('padding', val)}
                            min={0} max={64}
                        />
                        <SliderInput
                            label="Margin"
                            value={localStyles.margin}
                            onChange={(val) => handleStyleChange('margin', val)}
                            min={0} max={64}
                        />
                        <SliderInput
                            label="Border Radius"
                            value={localStyles.borderRadius}
                            onChange={(val) => handleStyleChange('borderRadius', val)}
                            min={0} max={50}
                        />
                        <SelectInput
                            label="Display"
                            value={localStyles.display}
                            onChange={(val) => handleStyleChange('display', val)}
                            options={[
                                { value: 'block', label: 'block' },
                                { value: 'flex', label: 'flex' },
                                { value: 'grid', label: 'grid' },
                                { value: 'inline-block', label: 'inline-block' },
                                { value: 'none', label: 'none' },
                            ]}
                        />
                    </div>
                </div>

                {/* GENERATED CODE */}
                <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-lg overflow-hidden">
                    <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Code size={14} className="text-blue-400" />
                            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Tailwind Code</span>
                        </div>
                        <button
                            onClick={copyToClipboard}
                            className="text-slate-400 hover:text-white transition-colors"
                            title="Copy to clipboard"
                        >
                            <Copy size={14} />
                        </button>
                    </div>
                    <div className="p-4">
                        <code className="text-sm font-mono text-green-400 break-words block">
                            {generatedCode || 'No styles generated'}
                        </code>
                    </div>
                    <div className="bg-slate-950 px-4 py-1.5 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between">
                        <span>Changes are temporary</span>
                        <span>{selectedElement.tagName}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
