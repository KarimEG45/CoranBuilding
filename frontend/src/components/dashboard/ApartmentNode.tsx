'use client';

import React from 'react';
import clsx from 'clsx';
import { BookOpen, CheckCircle, AlertCircle, Lock } from 'lucide-react';

import { getSurahForPage } from '../../utils/quranMapping';

interface ApartmentNodeProps {
    pageNumber: number;
    status: 'locked' | 'started' | 'revise' | 'mastered';
    onClick: (page: number) => void;
    size?: 'normal' | 'large';
}

const ApartmentNode: React.FC<ApartmentNodeProps> = ({ pageNumber, status, onClick, size = 'normal' }) => {
    const getStatusClasses = () => {
        switch (status) {
            case 'mastered':
                return 'bg-emerald-500 border-emerald-600/30 text-white shadow-md';
            case 'revise':
                return 'bg-amber-500 border-amber-600/30 text-white shadow-md animate-pulse';
            case 'started':
                return 'bg-blue-200 border-blue-300 text-slate-700 shadow-sm';
            case 'locked':
            default:
                return 'bg-slate-700 border-slate-600 text-white/30 shadow-inner opacity-80';
        }
    };

    return (
        <div className={clsx(
            "relative group/apt transition-all",
            size === 'large' ? 'h-20 w-24 text-xl' : 'h-14 w-16 text-xs'
        )}>
            <div
                onClick={() => onClick(pageNumber)}
                className={clsx(
                    "w-full h-full rounded-sm border window-glass flex items-center justify-center font-bold transition-all duration-200 transform",
                    getStatusClasses(),
                    "cursor-pointer hover:scale-110 hover:z-20 hover:shadow-xl hover:border-white/50"
                )}
            >
                {pageNumber}
            </div>

            {/* Hover Card (Tooltip) */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-48 bg-slate-800 text-white p-3 rounded-lg text-xs pointer-events-none opacity-0 group-hover/apt:opacity-100 transition-all z-50 shadow-xl">
                <div className="font-bold border-b border-white/20 pb-1 mb-1 text-sky-300">
                    Page {pageNumber}
                </div>
                <div className="opacity-90 mb-2">{getSurahForPage(pageNumber)}</div>
                <div className={clsx("flex items-center gap-1 font-bold",
                    status === 'mastered' ? "text-emerald-400" :
                        status === 'revise' ? "text-amber-400" :
                            status === 'started' ? "text-blue-300" : "text-slate-400"
                )}>
                    {status === 'mastered' && <><CheckCircle size={14} /> Maîtrisé</>}
                    {status === 'revise' && <><AlertCircle size={14} /> À Réviser</>}
                    {status === 'started' && <><BookOpen size={14} /> En Cours</>}
                    {status === 'locked' && <><Lock size={14} /> Non débuté</>}
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
            </div>
        </div>
    );
};

export default ApartmentNode;
