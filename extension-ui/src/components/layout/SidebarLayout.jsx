import React, { useState } from 'react';
import { LayoutGrid, Image, FileCode, Palette, ScanEye, Smartphone, Tablet, Monitor, Maximize, Box } from 'lucide-react';

const TABS = [
    { id: 'overview', icon: LayoutGrid, label: 'Overview' },
    { id: 'inspector', icon: ScanEye, label: 'Inspector' },
    { id: 'layout', icon: Box, label: 'Layout' },
    { id: 'colors', icon: Palette, label: 'Colors' },
    { id: 'assets', icon: Image, label: 'Assets' },
];

export default function SidebarLayout({ activeTab, onTabChange, isInspectMode, onToggleInspect, onViewportChange, children }) {

    return (
        <div className="flex flex-col h-screen bg-bg text-primary-text font-sans overflow-hidden">
            {/* Fixed Header */}
            <header className="flex-none px-4 py-3 bg-bg border-b border-border-subtle flex flex-wrap items-center justify-between gap-2 z-10 sticky top-0">
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap">

                    <div
                        className="flex items-center gap-2 cursor-pointer group"
                        onClick={onToggleInspect}
                        title="Toggle Inspect Mode"
                    >
                        <div className={`w-8 h-4 rounded-full relative transition-colors duration-200 ${isInspectMode ? 'bg-primary' : 'bg-slate-700'}`}>
                            <div className={`absolute top-0.5 w-3 h-3 ${isInspectMode ? 'bg-bg' : 'bg-white'} rounded-full transition-all duration-200 shadow-sm ${isInspectMode ? 'left-4' : 'left-0.5'}`}></div>
                        </div>
                        <span className="font-semibold text-sm group-hover:text-primary transition-colors">Inspect Mode</span>
                    </div>

                    {/* Viewport Resizer Controls */}
                    <div className="flex items-center bg-surface rounded-lg p-0.5 border border-border-subtle">
                        <button onClick={() => onViewportChange('mobile')} className="p-1.5 hover:bg-bg/50 rounded-md text-dim-text hover:text-primary transition-colors" title="Mobile View">
                            <Smartphone size={14} />
                        </button>
                        <button onClick={() => onViewportChange('tablet')} className="p-1.5 hover:bg-bg/50 rounded-md text-dim-text hover:text-primary transition-colors" title="Tablet View">
                            <Tablet size={14} />
                        </button>
                        <button onClick={() => onViewportChange('desktop')} className="p-1.5 hover:bg-bg/50 rounded-md text-dim-text hover:text-primary transition-colors" title="Desktop View">
                            <Monitor size={14} />
                        </button>
                        <div className="w-px h-3 bg-border-subtle mx-0.5"></div>
                        <button onClick={() => onViewportChange('reset')} className="p-1.5 hover:bg-bg/50 rounded-md text-dim-text hover:text-primary transition-colors" title="Reset View">
                            <Maximize size={14} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto custom-scrollbar relative">
                {children}
            </main>

            {/* Fixed Bottom Navigation */}
            <nav className="flex-none bg-bg border-t border-border-subtle px-2 py-3 safe-bottom z-20">
                <div className="flex justify-between items-center">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={`p-2 rounded-xl transition-all duration-200 flex flex-col items-center gap-1 group relative
                  ${isActive ? 'text-primary' : 'text-dim-text hover:text-primary-text'}`}
                                aria-label={tab.label}
                                title={tab.label}
                            >
                                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                {isActive && (
                                    <span className="absolute -bottom-3 w-1 h-1 bg-primary rounded-full animate-fade-in"></span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
