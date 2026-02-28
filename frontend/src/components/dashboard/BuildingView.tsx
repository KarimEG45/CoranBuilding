'use client';

import React from 'react';
import JuzSection from './JuzSection';

interface BuildingViewProps {
    onPageClick: (page: number) => void;
    progress: Record<number, 'locked' | 'started' | 'revise' | 'mastered'>;
}

const BuildingView: React.FC<BuildingViewProps> = ({ onPageClick, progress }) => {
    const renderJuzSections = () => {
        const sections = [];

        // 1. Roof Section (Juz 30+ Pages 601-604)
        sections.push(
            <JuzSection
                key="juz-30-plus"
                juzNumber={31} // Internal ID for 30+
                startPage={601}
                endPage={604}
                progress={progress}
                onPageClick={onPageClick}
                isTopLevel={true}
            />
        );

        // 2. Main Juz Sections (30 down to 2) - Compact Mode
        for (let juz = 30; juz >= 2; juz--) {
            const end = juz * 20;
            const start = end - 19;

            sections.push(
                <React.Fragment key={juz}>
                    <JuzSection
                        juzNumber={juz}
                        startPage={start}
                        endPage={end}
                        progress={progress}
                        onPageClick={onPageClick}
                    />
                </React.Fragment>
            );
        }

        // 3. Juz 1 (Pages 1-20)
        sections.push(
            <React.Fragment key={1}>
                <JuzSection
                    juzNumber={1}
                    startPage={1}
                    endPage={20}
                    progress={progress}
                    onPageClick={onPageClick}
                />
            </React.Fragment>
        );

        return sections;
    };

    return (
        <div className="flex flex-col items-center justify-end py-10 min-h-full overflow-x-auto w-full">

            {/* Roof Decoration */}
            <div className="relative z-10 flex flex-col items-center mb-0">
                <div className="w-1 h-32 bg-slate-300"></div>
                <div className="w-20 h-8 bg-slate-300 rotate-45 rounded-sm absolute top-10"></div>
                <div className="w-16 h-16 border-4 border-slate-300 rounded-full absolute top-4"></div>

                <div className="w-64 h-6 bg-slate-300 rounded-t-lg mt-0"></div>
                <div className="w-full text-center pb-4 pt-2">
                    <span className="bg-white/90 px-4 py-1 rounded-full text-xs font-bold text-slate-500 backdrop-blur shadow-sm border border-slate-200">
                        Sommet du Gratte-Ciel
                    </span>
                </div>
            </div>

            {/* Building Body - Compact & Connected */}
            {/* Adjusted style to look like a single glass facade */}
            <div className="flex flex-col bg-white shadow-2xl border-x-4 border-slate-300 rounded-t-lg relative z-0 w-fit min-w-[1300px] divide-y divide-slate-100">
                {renderJuzSections()}
            </div>

            {/* Foundation - Wider to support w-16 apartments */}
            {/* 20 * 64px + gaps = ~1350px width. */}
            <div className="w-[1350px] h-16 bg-gradient-to-b from-slate-800 to-slate-900 rounded-t-xl mt-0 shadow-2xl flex items-center justify-center border-t border-white/20 z-10">
                <div className="text-white/40 text-sm font-mono tracking-[0.5em] uppercase font-bold">
                    FONDATION DU SAVOIR - SOURATE AL-FATIHA
                </div>
            </div>
            <div className="w-full h-32 bg-gradient-to-t from-slate-900 via-slate-800 to-transparent -mt-1 opacity-60"></div>

        </div>
    );
};

export default BuildingView;
