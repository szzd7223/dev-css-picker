import React, { useState } from 'react';
import { LayoutGrid, Image, FileCode, Palette, ScanEye, User, Smartphone, Tablet, Monitor, Maximize } from 'lucide-react';

const TABS = [
    { id: 'overview', icon: LayoutGrid, label: 'Overview' },
    { id: 'inspector', icon: ScanEye, label: 'Inspector' },
    { id: 'assets', icon: Image, label: 'Assets' },
    { id: 'colors', icon: Palette, label: 'Colors' },
    { id: 'profile', icon: User, label: 'Profile' },
];

export default function SidebarLayout({ activeTab, onTabChange, isInspectMode, onToggleInspect, onViewportChange, children }) {

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-slate-200 font-sans overflow-hidden">
            {/* Fixed Header */}
            <header className="flex-none px-4 py-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 z-10 sticky top-0">
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap">

                    <div
                        className="flex items-center gap-2 cursor-pointer group"
                        onClick={onToggleInspect}
                        title="Toggle Inspect Mode"
                    >
                        <div className={`w-8 h-4 rounded-full relative transition-colors duration-200 ${isInspectMode ? 'bg-blue-600' : 'bg-slate-700'}`}>
                            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200 shadow-sm ${isInspectMode ? 'left-4' : 'left-0.5'}`}></div>
                        </div>
                        <span className="font-semibold text-sm group-hover:text-blue-400 transition-colors hidden sm:inline">Inspect</span>
                    </div>

                    {/* Viewport Resizer Controls */}
                    <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                        <button onClick={() => onViewportChange('mobile')} className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-blue-400 transition-colors" title="Mobile View">
                            <Smartphone size={14} />
                        </button>
                        <button onClick={() => onViewportChange('tablet')} className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-blue-400 transition-colors" title="Tablet View">
                            <Tablet size={14} />
                        </button>
                        <button onClick={() => onViewportChange('desktop')} className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-blue-400 transition-colors" title="Desktop View">
                            <Monitor size={14} />
                        </button>
                        <div className="w-px h-3 bg-slate-700 mx-0.5"></div>
                        <button onClick={() => onViewportChange('reset')} className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-green-400 transition-colors" title="Reset View">
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
            <nav className="flex-none bg-slate-900 border-t border-slate-800 px-2 py-3 safe-bottom z-20">
                <div className="flex justify-between items-center">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={`p-2 rounded-xl transition-all duration-200 flex flex-col items-center gap-1 group relative
                  ${isActive ? 'text-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                                aria-label={tab.label}
                                title={tab.label}
                            >
                                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                {isActive && (
                                    <span className="absolute -bottom-3 w-1 h-1 bg-blue-500 rounded-full animate-fade-in"></span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
