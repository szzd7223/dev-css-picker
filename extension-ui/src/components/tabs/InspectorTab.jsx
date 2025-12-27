import React, { useEffect, useState } from 'react';
import { Type, Palette, Box, Copy, Code, Layers, ArrowLeft, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import DomTree from './DomTree';
import { ColorInput, SliderInput, SelectInput } from '../ui/StyleControls';
import { generateTailwindClasses } from '../../utils/tailwindGenerator';

export default function InspectorTab({ selectedElement, onSelectElement, onTabChange }) {
    const [error, setError] = useState(null);
    const [localStyles, setLocalStyles] = useState({});
    const [generatedCode, setGeneratedCode] = useState('');
    const [codeTab, setCodeTab] = useState('tailwind');

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
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'UPDATE_STYLE',
                    payload: {
                        cpId: selectedElement.cpId,
                        styles: localStyles
                    }
                }).catch(() => { });
            }
        });

    }, [localStyles, selectedElement]);


    // Handlers
    const handleStyleChange = (property, value) => {
        setLocalStyles(prev => ({ ...prev, [property]: value }));
    };

    const handleSelectNode = (cpId) => {
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
                chrome.tabs.sendMessage(tabs[0].id, { type: 'HIGHLIGHT_NODE', payload: { cpId } });
            }
        });
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedCode);
    };

    // --- SETUP EFFECT ---
    useEffect(() => {
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            if (!tabs[0]?.id) {
                setError("No active page found.");
            }
        });
        setError(null);
    }, []);

    if (error) {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-full text-center animate-fade-in text-slate-400">
                <p>{error}</p>
                <button onClick={() => chrome.tabs.reload()} className="mt-4 text-blue-400 hover:text-blue-300">Refresh Page</button>
            </div>
        )
    }

    if (!selectedElement) {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-full text-center animate-fade-in">
                <div className="w-16 h-16 bg-slate-800 text-blue-500 rounded-full flex items-center justify-center mb-4">
                    <Box size={32} strokeWidth={1.5} />
                </div>
                <h2 className="text-lg font-bold text-white mb-2">Inspector Mode Active</h2>
                <p className="text-slate-400 text-sm max-w-[200px] mb-6">
                    Hover over elements on the page to see details. Click to lock selection.
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-8 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => onTabChange('overview')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
                        <ArrowLeft size={18} />
                    </button>
                    <h1 className="text-xl font-bold text-white">Inspect Element</h1>
                </div>
                <div className="p-2 bg-slate-800 rounded-full text-blue-400">
                    <RefreshCw size={14} className="cursor-pointer hover:rotate-180 transition-transform duration-500" onClick={() => handleSelectNode(selectedElement.cpId)} />
                </div>
            </div>

            {/* DOM HIERARCHY (Matches Overview) */}
            <section>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-bold text-white">DOM Hierarchy</h3>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700">Shallow View</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl">
                    <DomTree hierarchy={selectedElement.hierarchy} onSelectNode={handleSelectNode} />
                </div>
            </section>

            {/* SECTIONS */}
            <div className="space-y-6">
                {/* TYPOGRAPHY */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
                        <Type size={16} className="text-slate-400" />
                        <span className="text-sm font-bold text-slate-200">Typography</span>
                    </div>
                    <div className="p-4 space-y-4">
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

                {/* COLORS */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
                        <Palette size={16} className="text-slate-400" />
                        <span className="text-sm font-bold text-slate-200">Colors</span>
                    </div>
                    <div className="p-4 space-y-4">
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

                {/* LAYOUT */}
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
                        <Box size={16} className="text-slate-400" />
                        <span className="text-sm font-bold text-slate-200">Layout</span>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <SliderInput label="Padding" value={localStyles.padding} onChange={(val) => handleStyleChange('padding', val)} min={0} max={64} />
                            <SliderInput label="Margin" value={localStyles.margin} onChange={(val) => handleStyleChange('margin', val)} min={0} max={64} />
                        </div>
                        <SliderInput label="Radius" value={localStyles.borderRadius} onChange={(val) => handleStyleChange('borderRadius', val)} min={0} max={50} />
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
            </div>

            {/* GENERATED CODE */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden mt-4">
                <div className="flex border-b border-slate-800">
                    <button
                        onClick={() => setCodeTab('tailwind')}
                        className={`flex-1 py-2 text-xs font-bold transition-colors ${codeTab === 'tailwind' ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-800/30' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Tailwind
                    </button>
                    <button
                        onClick={() => setCodeTab('css')}
                        className={`flex-1 py-2 text-xs font-bold transition-colors ${codeTab === 'css' ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-800/30' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        CSS
                    </button>
                    <button onClick={copyToClipboard} className="px-3 border-l border-slate-800 text-slate-400 hover:text-white">
                        <Copy size={14} />
                    </button>
                </div>
                <div className="p-4 bg-slate-950 font-mono text-xs">
                    {codeTab === 'tailwind' ? (
                        <code className="text-green-400 break-words block">
                            {`<${selectedElement.tagName.toLowerCase()} class="${generatedCode}">`}
                        </code>
                    ) : (
                        <code className="text-blue-300 break-words block whitespace-pre-wrap">
                            {`${selectedElement.tagName.toLowerCase()} {\n  color: ${localStyles.color};\n  background: ${localStyles.backgroundColor};\n  font-size: ${localStyles.fontSize};\n}`}
                        </code>
                    )}
                </div>
            </div>
        </div>
    );
}
