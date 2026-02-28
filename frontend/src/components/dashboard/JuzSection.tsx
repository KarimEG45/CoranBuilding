'use client';

import React from 'react';
import ApartmentNode from './ApartmentNode';

interface JuzSectionProps {
    juzNumber: number;
    startPage: number;
    endPage: number;
    progress: Record<number, 'locked' | 'started' | 'revise' | 'mastered'>;
    onPageClick: (page: number) => void;
    isTopLevel?: boolean; // For Juz 30+ (Pages 601-604)
}

const JuzSection: React.FC<JuzSectionProps> = ({
    juzNumber,
    startPage,
    endPage,
    progress,
    onPageClick,
    isTopLevel
}) => {
    const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).reverse();

    return (
        <div id={`juz-section-${juzNumber}`} className={`group flex relative mx-auto ${isTopLevel ? 'bg-slate-50 border-b border-slate-200' : 'bg-white border-b border-slate-200'}`}>

            {/* Floor Label (Left) */}
            <div className="absolute -left-28 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 w-24 justify-end">
                <div className="bg-white/80 backdrop-blur px-3 py-1 rounded-md shadow-sm border border-slate-200 text-slate-500 font-bold font-mono text-xs">
                    Étage {juzNumber > 30 ? 'Toit' : String(juzNumber).padStart(2, '0')}
                </div>
            </div>

            {/* Pages Grid - Single Row of 20 */}
            {/* Reduced padding (p-1) and gap (gap-1) for compactness */}
            <div
                className={`p-1 w-auto grid gap-1 bg-inherit mx-auto
         ${isTopLevel ? 'grid-cols-4 w-[200px]' : 'grid-cols-20'}
        `}
            >
                {pages.map((pageNumber) => (
                    <ApartmentNode
                        key={pageNumber}
                        pageNumber={pageNumber}
                        status={progress[pageNumber] || 'locked'}
                        onClick={onPageClick}
                        size={isTopLevel ? 'large' : 'normal'}
                    />
                ))}
            </div>

            {/* Juz Label (Right) */}
            <div className={`w-10 border-l border-slate-200 flex items-center justify-center text-slate-300 font-bold text-[10px] rotate-180 
        ${isTopLevel ? 'bg-slate-200 text-slate-500' : 'bg-slate-50'}
      `} style={{ writingMode: 'vertical-rl' }}>
                Juz' {juzNumber > 30 ? '30+' : String(juzNumber).padStart(2, '0')}
            </div>
        </div>
    );
};

export default JuzSection;
