import React, { useState, useEffect } from 'react';
import { Type, Check, Copy, ArrowLeft, RefreshCw, Box } from 'lucide-react';
import { SliderInput, SelectInput } from '../ui/StyleControls';
import DomTree from './DomTree';
import { generateTailwindClasses, generateCSS } from '../../utils/snippetGenerators';
import { isRestrictedUrl } from '../../utils/browserUtils';
import { useDevToolsStore } from '../../store/devtools';
import { cleanStyleValue } from '../../utils/styleUtils';

export default function InspectorTab() {
    const {
        selectedElement,
        setSelectedElement,
        updateProperty,
        setActiveTab,
        isInspectMode,
        setInspectMode
    } = useDevToolsStore();

    const [codeTab, setCodeTab] = useState('tailwind');
    const [isCopied, setIsCopied] = useState(false);
    const [pageError, setPageError] = useState(null);

    // Derived State for Snippets
    const generatedCode = selectedElement ? generateTailwindClasses(selectedElement) : '';
    const generatedCss = selectedElement ? generateCSS(selectedElement, selectedElement.tagName.toLowerCase()) : '';

    // Helper for flattened style access (safe access for UI controls)
    const getStyle = (path) => {
        if (!selectedElement) return '';
        // path e.g. 'colors.text' or 'typography.size'
        // But our inputs expect direct values matching what updateProperty uses?
        // Wait, the Store's updateProperty handles mapping FROM specific keys (like 'fontSize') TO the structure.
        // But for READING, we need to read from the structure `selectedElement`.
        // Let's create a safe reader or just map locally for the render.

        switch (path) {
            case 'fontSize': return selectedElement.typography?.size;
            case 'fontWeight': return selectedElement.typography?.weight;
            // Add others as needed if we add more controls back
            default: return '';
        }
    };

    // --- SETUP EFFECT ---
    useEffect(() => {
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            if (!activeTab?.id) {
                setPageError("No active page found.");
                return;
            }

            if (isRestrictedUrl(activeTab.url)) {
                setPageError("RESTRICTED_PAGE");
            } else {
                setPageError(null);
            }
        });
    }, []);

    // Handlers
    const handleSelectNode = (cpId) => {
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'SELECT_NODE',
                    payload: { cpId }
                }, (response) => {
                    if (response && response.tagName) {
                        setSelectedElement(response);
                    }
                });
                chrome.tabs.sendMessage(tabs[0].id, { type: 'HIGHLIGHT_NODE', payload: { cpId } });
            }
        });
    };

    const copyToClipboard = () => {
        if (!selectedElement) return;

        const textToCopy = codeTab === 'tailwind'
            ? `<${selectedElement.tagName.toLowerCase()} class="${generatedCode}">`
            : generatedCss;

        navigator.clipboard.writeText(textToCopy);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    // Render Error State
    if (pageError) {
        const isRestricted = pageError === "RESTRICTED_PAGE";
        return (
            <div className="p-8 flex flex-col items-center justify-center h-full text-center animate-fade-in">
                <div className={`w-12 h-12 ${isRestricted ? 'bg-amber-500/10' : 'bg-red-500/10'} rounded-full flex items-center justify-center mb-4`}>
                    <Box className={isRestricted ? 'text-amber-500' : 'text-red-500'} size={24} />
                </div>
                <h3 className="text-white font-bold mb-2">
                    {isRestricted ? "Restricted Page" : "Error"}
                </h3>
                <p className="text-slate-400 text-sm mb-6 max-w-[200px]">
                    {isRestricted
                        ? "For security reasons, CSS Picker cannot be used on internal browser pages or the Web Store."
                        : pageError
                    }
                </p>
                {!isRestricted && (
                    <button onClick={() => chrome.tabs.reload()} className="text-blue-400 hover:text-blue-300">Refresh Page</button>
                )}
            </div>
        )
    }

    if (!selectedElement) {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-full text-center animate-fade-in">
                <div className={`w-16 h-16 ${isInspectMode ? 'bg-slate-800' : 'bg-slate-800/50'} text-blue-500 rounded-full flex items-center justify-center mb-4`}>
                    <Box size={32} strokeWidth={1.5} className={isInspectMode ? 'animate-pulse' : 'opacity-40'} />
                </div>
                {isInspectMode ? (
                    <>
                        <h2 className="text-lg font-bold text-white mb-2">Inspector Mode Active</h2>
                        <p className="text-slate-400 text-sm max-w-[200px] mb-6">
                            Hover over elements on the page to see details. Click to lock selection.
                        </p>
                    </>
                ) : (
                    <>
                        <h2 className="text-lg font-bold text-white mb-2">Ready to Inspect</h2>
                        <p className="text-slate-400 text-sm max-w-[200px] mb-6">
                            Enable inspect mode to select an element and start editing styles.
                        </p>
                        <button
                            onClick={() => setInspectMode(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                        >
                            Enable Inspect Mode
                        </button>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="p-4 space-y-8 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button onClick={() => setActiveTab('overview')} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
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
                            value={getStyle('fontSize')}
                            onChange={(val) => updateProperty('fontSize', val)}
                            min={8} max={72}
                            hideUnitSelector={true}
                        />
                        <SelectInput
                            label="Font Weight"
                            value={getStyle('fontWeight')}
                            onChange={(val) => updateProperty('fontWeight', val)}
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
                    <button onClick={copyToClipboard} className="px-3 border-l border-slate-800 text-slate-400 hover:text-white flex items-center gap-1.5 min-w-[70px] justify-center">
                        {isCopied ? (
                            <>
                                <Check size={12} className="text-green-500" />
                                <span className="text-[10px] text-green-500 uppercase font-bold">Copied</span>
                            </>
                        ) : (
                            <>
                                <Copy size={12} />
                                <span className="text-[10px] uppercase font-bold">Copy</span>
                            </>
                        )}
                    </button>
                </div>
                <div className="p-4 pt-2">
                    <div className="relative group/code">
                        <textarea
                            value={codeTab === 'tailwind'
                                ? `<${selectedElement.tagName.toLowerCase()} class="${generatedCode}">`
                                : generatedCss
                            }
                            readOnly={true}
                            className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-blue-300 resize-none focus:outline-none"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
