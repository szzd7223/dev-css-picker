import React from 'react';
import { User } from 'lucide-react';

export default function ProfileTab() {
    return (
        <div className="p-6 animate-fade-in flex flex-col items-center justify-center h-full space-y-6">
            <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500">
                <User size={40} />
            </div>

            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white">Welcome!</h2>
                <p className="text-slate-400 text-sm">Sign in to track your extractions</p>
            </div>

            <button className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-transform active:scale-95">
                Sign In / Register
            </button>

            <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 w-full text-center">
                <p className="text-xs text-blue-400 font-medium">Upgrade to Premium for unlimited exports</p>
            </div>
        </div>
    );
}
