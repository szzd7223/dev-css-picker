import React from 'react';
import { LayoutGrid, Image, FileCode, Palette, ScanEye, User } from 'lucide-react';

const TABS = [
    { id: 'overview', icon: LayoutGrid, label: 'Overview' },
    { id: 'inspector', icon: ScanEye, label: 'Inspector' },
    { id: 'images', icon: Image, label: 'Images' },
    { id: 'colors', icon: Palette, label: 'Colors' },
    { id: 'svgs', icon: FileCode, label: 'SVGs' },
    { id: 'profile', icon: User, label: 'Profile' },
];

export default function SidebarLayout({ activeTab, onTabChange, isInspectMode, onToggleInspect, children }) {
    return (
        <div className="flex flex-col h-screen bg-slate-900 text-slate-200 font-sans overflow-hidden">
            {/* Fixed Header */}
            <header className="flex-none px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between z-10 sticky top-0">
                <div
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={onToggleInspect}
                >
                    <div className={`w-8 h-4 rounded-full relative transition-colors duration-200 ${isInspectMode ? 'bg-blue-600' : 'bg-slate-700'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200 shadow-sm ${isInspectMode ? 'left-4' : 'left-0.5'}`}></div>
                    </div>
                    <span className="font-semibold text-sm group-hover:text-blue-400 transition-colors">Inspect mode</span>
                </div>

                <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    {/* Placeholder for status or version */}
                </div>
            </header>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto custom-scrollbar relative">
                {children}
            </main>

            {/* Fixed Bottom Navigation */}
            <nav className="flex-none bg-slate-900 border-t border-slate-800 px-4 py-3 safe-bottom z-20">
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
