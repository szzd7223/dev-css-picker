import React, { useState } from 'react';
import { usePageData } from '../../hooks/usePageData';
import { Copy, Check, MousePointer2, Type, Palette, Layout, Link as LinkIcon, RefreshCw, Box } from 'lucide-react';
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
            <div className="flex flex-col items-center justify-center h-64 animate-pulse space-y-4">
                <div className="w-10 h-10 border-4 border-slate-700 border-t-primary rounded-full animate-spin"></div>
                <p className="text-dim-text text-sm">Scanning page assets...</p>
            </div>
        );
    }

    if (error) {
        const isRestricted = error === "RESTRICTED_PAGE";

        return (
            <div className="p-8 text-center flex flex-col items-center justify-center">
                <div className={`w-12 h-12 ${isRestricted ? 'bg-primary/10' : 'bg-destructive/10'} rounded-full flex items-center justify-center mb-4`}>
                    <Box className={isRestricted ? 'text-primary' : 'text-destructive'} size={24} />
                </div>
                <h3 className="text-white font-bold mb-2">
                    {isRestricted ? "Restricted Page" : "Scan Error"}
                </h3>
                <p className="text-slate-400 text-sm mb-6 max-w-[200px]">
                    {isRestricted
                        ? "For security reasons, Picky_Editor cannot be used on internal browser pages or the Web Store."
                        : error
                    }
                </p>
                {!isRestricted && (
                    <button
                        onClick={rescan}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-bg rounded-lg hover:bg-primary-hover transition-colors font-bold"
                    >
                        <RefreshCw size={14} /> Retry Scan
                    </button>
                )}
            </div>
        )
    }

    return (
        <div className="p-4 space-y-8 animate-fade-in pb-20">
            {/* Header */}
            <div>
                <div className="flex justify-between items-start">
                    <h1 className="text-2xl font-bold text-white mb-1">{meta.title || 'Page Overview'}</h1>
                    <div className="p-2 bg-primary rounded-lg text-bg hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20">
                        <RefreshCw size={16} onClick={rescan} className="cursor-pointer" />
                    </div>
                </div>
                <div className="flex items-center gap-2 text-primary text-xs font-mono">
                    <LinkIcon size={12} />
                    <span className="truncate underline cursor-pointer hover:text-primary">
                        {(meta.url || window.location.href).split('?')[0]}
                    </span>
                </div>
            </div>

            {/* DOM HIERARCHY */}
            <section>
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-bold text-white">DOM Hierarchy</h3>
                    <span className="text-[10px] bg-surface text-dim-text px-2 py-1 rounded border border-slate-700">Shallow View</span>
                </div>

                {selectedElement ? (
                    <div className="bg-bg border border-slate-800 p-2 rounded-xl">
                        <DomTree hierarchy={selectedElement.hierarchy} onSelectNode={handleSelectNode} />
                    </div>
                ) : (
                    <div
                        onClick={handlePlaceholderClick}
                        className="p-6 rounded-xl border border-dashed border-slate-700 hover:border-primary hover:bg-surface/50 transition-all cursor-pointer flex flex-col items-center gap-3 group"
                    >
                        <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center group-hover:bg-primary-muted group-hover:text-primary transition-colors">
                            <MousePointer2 size={18} className="text-slate-400 group-hover:text-primary" />
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-semibold text-slate-300 group-hover:text-white">Select an Element</p>
                            <p className="text-xs text-dim-text">Click to start inspecting the DOM</p>
                        </div>
                    </div>
                )}
            </section>

            {/* COLORS */}
            < section >
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-bold text-white">Extracted Colors</h3>
                    <button className="text-[10px] font-bold text-primary hover:text-primary-hover uppercase tracking-wide">COPY ALL</button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    {bgColors.slice(0, 4).map((c, i) => (
                        <div key={i} onClick={() => handleCopy(c.value)} className="bg-surface p-3 rounded-xl border border-slate-700 cursor-pointer hover:border-slate-500 transition-all group relative overflow-hidden">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg shadow-sm border border-slate-600/50" style={{ backgroundColor: c.value }} />
                                <div className="min-w-0">
                                    <div className="text-sm font-mono font-bold text-white truncate">{c.value}</div>
                                    <div className="text-[10px] text-dim-text uppercase tracking-wider">{i === 0 ? 'Primary' : i === 1 ? 'Background' : 'Surface'}</div>
                                </div>
                            </div>
                            {copiedToken === c.value && (
                                <div className="absolute inset-0 bg-surface/95 flex items-center justify-center text-primary font-bold text-xs animate-fade-in gap-1">
                                    <Check size={14} /> COPIED
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section >

            {/* TYPOGRAPHY */}
            < section >
                <h3 className="text-sm font-bold text-white mb-3">Typography</h3>
                <div className="bg-surface rounded-xl border border-slate-700 p-4 relative overflow-hidden">
                    <div className="absolute top-4 right-4 bg-bg/50 p-1.5 rounded-lg text-primary">
                        <Type size={16} />
                    </div>

                    {fonts.slice(0, 1).map((f, i) => (
                        <div key={i}>
                            <div className="text-[10px] text-dim-text font-bold uppercase mb-2 tracking-wider">Primary Font</div>
                            <div className="text-3xl font-medium text-white mb-4 truncate" style={{ fontFamily: f.value }}>{f.value}</div>

                            <div className="flex flex-wrap gap-2 mb-4">
                                {['400', '600', '700'].map(w => (
                                    <span key={w} className="bg-bg border border-slate-700 px-3 py-1 rounded-md text-xs font-mono text-primary-text">{w}</span>
                                ))}
                            </div>

                            <div>
                                <div className="text-[10px] text-dim-text font-bold uppercase mb-2 tracking-wider">Sizes Used</div>
                                <div className="flex flex-wrap gap-2">
                                    {['14px', '16px', '24px', '32px'].map(s => (
                                        <span key={s} className="bg-bg border border-slate-700 px-3 py-1 rounded-md text-xs font-mono text-primary-text">{s}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section >
        </div >
    );
}
