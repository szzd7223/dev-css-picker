import React from 'react';
import { User } from 'lucide-react';

export default function ProfileTab() {
    return (
        <div className="p-6 animate-fade-in flex flex-col items-center justify-center h-full space-y-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <User size={40} />
            </div>

            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">Welcome!</h2>
                <p className="text-gray-500 text-sm">Sign in to track your extractions</p>
            </div>

            <button className="w-full py-3 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/30 hover:bg-indigo-600 transition-transform active:scale-95">
                Sign In / Register
            </button>

            <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 w-full text-center">
                <p className="text-xs text-indigo-600 font-medium">Upgrade to Premium for unlimited exports</p>
            </div>
        </div>
    );
}
