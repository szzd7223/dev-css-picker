import React, { useState, useEffect } from 'react';
import { Type, Check, Copy, ArrowLeft, RefreshCw, Box } from 'lucide-react';
import { SliderInput, SelectInput } from '../ui/StyleControls';
import DomTree from './DomTree';
import { generateTailwindClasses } from '../../utils/styleUtils';
import { isRestrictedUrl } from '../../utils/browserUtils';

export default function InspectorTab({ selectedElement, onSelectElement, onTabChange }) {
    const [localStyles, setLocalStyles] = useState({});
    const [originalStyles, setOriginalStyles] = useState({});
    const [error, setError] = useState(null);
    const [codeTab, setCodeTab] = useState('tailwind');
    const [generatedCode, setGeneratedCode] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const [generatedCss, setGeneratedCss] = useState('');

    // Sync state if selectedElement data changes (e.g. Refresh)
    useEffect(() => {
        if (selectedElement) {
            const cleanPx = (val) => {
                if (typeof val === 'object' && val !== null) {
                    const out = {};
                    for (const k in val) out[k] = cleanPx(val[k]);
                    return out;
                }
                if (!val || val === 'none' || val === 'auto') return val;
                const parsed = parseFloat(val);
                if (isNaN(parsed) || !isFinite(parsed)) return '0px';
                if (parsed > 10000) return '0px';
                return `${Math.round(parsed)}px`;
            };


            // Special helper for radius to clamp "pill hacks" (e.g. 9999px) to the actual visual limit
            const effectiveMaxRadius = Math.max(0, Math.round(Math.min(selectedElement.width, selectedElement.height) / 2));

            const cleanRadius = (val) => {
                if (typeof val === 'object' && val !== null) {
                    const out = {};
                    for (const k in val) out[k] = cleanRadius(val[k]);
                    return out;
                }

                // If it's a pixel value, check if it exceeds the effective max
                if (String(val).endsWith('px')) {
                    const parsed = parseFloat(val);
                    if (!isNaN(parsed) && isFinite(parsed)) {
                        // If it's effectively a pill (larger than half size), clamp it to half size
                        // This allows the slider to be useful immediately (sliding down from max)
                        if (effectiveMaxRadius > 0 && parsed > effectiveMaxRadius) {
                            return `${effectiveMaxRadius}px`;
                        }
                        return `${Math.round(parsed)}px`;
                    }
                }
                return cleanStyleValue(val);
            };

            const initialState = {
                color: selectedElement.colors.text,
                fontSize: selectedElement.typography.size,
                fontWeight: selectedElement.typography.weight,
                // We keep some basic dimensions for the CSS preview if needed, or remove them.
                // Let's keep them for the "summary" CSS block even if not editable here.
                width: selectedElement.width + 'px',
                height: selectedElement.height + 'px',
            };

            setOriginalStyles(initialState);
            setLocalStyles(initialState);
            // Debug check
            console.log('Inspector Data', initialState);
        }
    }, [selectedElement]);

    // 1. Logic for Code Generation (Runs whenever styles change)
    useEffect(() => {
        if (!selectedElement || Object.keys(localStyles).length === 0) return;

        const code = generateTailwindClasses(localStyles);
        setGeneratedCode(code);

        const cssBlock = `${selectedElement.tagName.toLowerCase()} {\n  color: ${localStyles.color};\n  font-size: ${localStyles.fontSize};\n}`;
        setGeneratedCss(cssBlock);
    }, [localStyles, selectedElement]);

    // 2. Logic for Live Updates (Triggered only by user interaction)
    const sendLiveUpdate = (updatedStyles) => {
        if (!selectedElement) return;
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'UPDATE_STYLE',
                    payload: {
                        cpId: selectedElement.cpId,
                        styles: updatedStyles
                    }
                }).catch(() => { });
            }
        });
    };


    // Handlers
    const handleStyleChange = (property, value) => {
        const nextStyles = { ...localStyles, [property]: value };
        setLocalStyles(nextStyles);

        // Send only the change to preserve other original styles on the page
        sendLiveUpdate({ [property]: value });
    };

    const handleReset = (property) => {
        if (originalStyles[property] !== undefined) {
            handleStyleChange(property, originalStyles[property]);
        }
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
        const generatedCss = `${selectedElement.tagName.toLowerCase()} {\n  color: ${localStyles.color};\n  background: ${localStyles.backgroundColor};\n  font-size: ${localStyles.fontSize};\n  width: ${localStyles.width};\n  height: ${localStyles.height};\n}`;
        const textToCopy = codeTab === 'tailwind'
            ? `<${selectedElement.tagName.toLowerCase()} class="${generatedCode}">`
            : generatedCss;
        navigator.clipboard.writeText(textToCopy);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    // --- SETUP EFFECT ---
    useEffect(() => {
        chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            if (!activeTab?.id) {
                setError("No active page found.");
                return;
            }

            if (isRestrictedUrl(activeTab.url)) {
                setError("RESTRICTED_PAGE");
            } else {
                setError(null);
            }
        });
    }, []);

    if (error) {
        const isRestricted = error === "RESTRICTED_PAGE";
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
                        : error
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
                            originalValue={originalStyles.fontSize}
                            onReset={() => handleReset('fontSize')}
                            min={8} max={72}
                        />
                        <SelectInput
                            label="Font Weight"
                            value={localStyles.fontWeight}
                            onChange={(val) => handleStyleChange('fontWeight', val)}
                            originalValue={originalStyles.fontWeight}
                            onReset={() => handleReset('fontWeight')}
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

                {/* COLORS (Moved to ColorsTab) - Removed */}
                {/* POSITIONING (Moved to LayoutTab) - Removed */}
                {/* LAYOUT (Moved to LayoutTab) - Removed */}
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
                                : `${selectedElement.tagName.toLowerCase()} {\n  color: ${localStyles.color};\n  background: ${localStyles.backgroundColor};\n  font-size: ${localStyles.fontSize};\n  width: ${localStyles.width};\n  height: ${localStyles.height};\n}`
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
