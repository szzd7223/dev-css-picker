import React from 'react';
import { LayoutGrid, Image, FileCode, Palette, ScanEye, User } from 'lucide-react';

const TABS = [
    { id: 'overview', icon: LayoutGrid, label: 'Overview' },
    { id: 'images', icon: Image, label: 'Images' },
    { id: 'svgs', icon: FileCode, label: 'SVGs' },
    { id: 'colors', icon: Palette, label: 'Colors' },
    { id: 'inspector', icon: ScanEye, label: 'Inspector' },
    { id: 'profile', icon: User, label: 'Profile' },
];

export default function SidebarLayout({ activeTab, onTabChange, children }) {
    return (
        <div className="flex flex-col h-screen bg-white text-slate-900 font-sans overflow-hidden">
            {/* Fixed Header */}
            <header className="flex-none px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between z-10 sticky top-0">
                <div
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={() => onTabChange(activeTab === 'inspector' ? 'overview' : 'inspector')}
                >
                    <div className={`w-8 h-4 rounded-full relative transition-colors duration-200 ${activeTab === 'inspector' ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-200 shadow-sm ${activeTab === 'inspector' ? 'left-4.5' : 'left-0.5'}`}></div>
                    </div>
                    <span className="font-semibold text-sm group-hover:text-indigo-600 transition-colors">Inspect mode</span>
                </div>

                <div className="text-xs text-gray-400 font-medium flex items-center gap-1">
                    {/* Limit removed */}
                </div>
            </header>

            {/* Scrollable Content */}
            <main className="flex-1 overflow-y-auto custom-scrollbar relative">
                {children}
            </main>

            {/* Fixed Bottom Navigation */}
            <nav className="flex-none bg-white border-t border-gray-100 px-4 py-3 safe-bottom z-20">
                <div className="flex justify-between items-center">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={`p-2 rounded-xl transition-all duration-200 flex flex-col items-center gap-1 group relative
                  ${isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                                aria-label={tab.label}
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
