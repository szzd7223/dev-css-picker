import React, { useState } from 'react';
import { usePageData } from '../../hooks/usePageData';
import { Copy, Check, MousePointer2 } from 'lucide-react';
import DomTree from './DomTree';

export default function OverviewTab({ onTabChange, onToggleInspect, selectedElement, onSelectElement }) {
    const { fonts, bgColors, textColors, meta, loading, error, rescan } = usePageData();
    const [copiedToken, setCopiedToken] = useState(null);

    const handleCopy = (value) => {
        navigator.clipboard.writeText(value);
        setCopiedToken(value);
        setTimeout(() => setCopiedToken(null), 2000);
    };

    const handlePlaceholderClick = () => {
        onToggleInspect(true);
        onTabChange('inspector');
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

    const renderToken = (label, value) => (
        <div
            onClick={() => handleCopy(value)}
            className="flex items-center justify-between p-2 rounded-lg border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/30 cursor-pointer transition-all group"
        >
            <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded shadow-sm border border-gray-200" style={{ backgroundColor: value }} />
                <span className="font-mono text-xs text-gray-700">{value}</span>
            </div>
            {copiedToken === value ? (
                <Check size={12} className="text-green-500" />
            ) : (
                <Copy size={12} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
        </div>
    );

    return (
        <div className="p-4 space-y-6 animate-fade-in pb-20">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{meta.title || 'Page Overview'}</h1>
                <div className="flex items-center gap-2 text-blue-500 text-sm overflow-hidden">
                    <span className="truncate underline cursor-pointer">{(meta.url || window.location.href).split('?')[0]}</span>
                </div>
            </div>

            {/* DOM HIERARCHY */}
            {selectedElement ? (
                <div className="bg-slate-50/50 p-3 rounded-xl border border-gray-100">
                    <DomTree hierarchy={selectedElement.hierarchy} onSelectNode={handleSelectNode} />
                </div>
            ) : (
                <div
                    onClick={handlePlaceholderClick}
                    className="p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer flex flex-col items-center gap-2 group"
                >
                    <MousePointer2 size={24} className="text-gray-400 group-hover:text-indigo-500" />
                    <p className="text-xs font-semibold text-gray-500 group-hover:text-indigo-600">Click to Select Element</p>
                </div>
            )}

            {/* COLORS */}
            <section>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Extracted Colors</h3>
                    <button className="text-xs text-indigo-600 font-bold hover:underline">COPY ALL</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {bgColors.slice(0, 4).map((c, i) => (
                        <div key={i} onClick={() => handleCopy(c.value)} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm cursor-pointer hover:border-indigo-200 transition-all group relative">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg shadow-inner border border-gray-100" style={{ backgroundColor: c.value }} />
                                <div>
                                    <div className="text-sm font-mono font-bold text-gray-900 uppercase">{c.value}</div>
                                    <div className="text-[10px] text-gray-400 uppercase">{i === 0 ? 'Primary' : i === 1 ? 'Background' : 'Accent'}</div>
                                </div>
                            </div>
                            {copiedToken === c.value && (
                                <div className="absolute inset-0 bg-white/90 rounded-xl flex items-center justify-center text-green-600 font-bold text-xs animate-fade-in">
                                    COPIED!
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* TYPOGRAPHY */}
            <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden p-4">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Typography</h3>
                    <div className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg">
                        <MousePointer2 size={14} />
                    </div>
                </div>
                {fonts.slice(0, 1).map((f, i) => (
                    <div key={i} className="mb-4">
                        <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Primary Font</div>
                        <div className="text-2xl font-bold text-gray-900 mb-2 truncate" style={{ fontFamily: f.value }}>{f.value}</div>

                        <div className="flex flex-wrap gap-2">
                            {['400', '600', '700'].map(w => (
                                <span key={w} className="bg-gray-100 px-3 py-1 rounded text-xs font-bold text-gray-600">{w}</span>
                            ))}
                        </div>
                    </div>
                ))}
                <div className="space-y-2">
                    <div className="text-[10px] text-gray-400 font-bold uppercase mb-1">Sizes Used</div>
                    <div className="flex flex-wrap gap-2">
                        {['14px', '16px', '24px', '32px'].map(s => (
                            <span key={s} className="bg-slate-900 text-white px-3 py-1 rounded text-xs font-mono">{s}</span>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
