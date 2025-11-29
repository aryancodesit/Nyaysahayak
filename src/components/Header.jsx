import React from 'react';
import { Printer, Scale } from 'lucide-react';

const Header = ({ currentMode, handlePrintReport }) => {
    return (
        <header className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-orange-500/10 p-2 rounded-full text-orange-500">
                    <Scale size={24} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                        NyayaSahayak
                        <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/30 font-mono">v1.4 Cloud</span>
                    </h1>
                    <p className="text-xs text-slate-400">AI Legal Counsel • {currentMode === 'chat' ? 'Active Consultation' : 'Knowledge Browser'}</p>
                </div>
            </div>

            {currentMode === 'chat' && (
                <button
                    onClick={handlePrintReport}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-all text-sm font-medium"
                >
                    <Printer size={16} />
                    <span className="hidden md:inline">Print Official Report</span>
                </button>
            )}
        </header>
    );
};

export default Header;
