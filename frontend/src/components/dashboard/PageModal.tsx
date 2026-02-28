'use client';

import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Eye, EyeOff, CheckCircle, AlertCircle, BookOpen, Lock } from 'lucide-react';
import { QuranRecorder } from '../audio/QuranRecorder';
import AudioPlayer from '../audio/AudioPlayer';
import ImamFollower from '../audio/ImamFollower';
import RecordingHistory from '../audio/RecordingHistory';
import TajweedText from './TajweedText';
import clsx from 'clsx';
import { getSurahForPage } from '../../utils/quranMapping';

type PageStatus = 'locked' | 'started' | 'revise' | 'mastered';

interface PageModalProps {
    page: number;
    isOpen: boolean;
    onClose: () => void;
    onNext?: () => void;
    onPrev?: () => void;
    currentStatus: PageStatus;
    onStatusChange: (status: PageStatus) => void;
}

export default function PageModal({ page, isOpen, onClose, onNext, onPrev, currentStatus, onStatusChange }: PageModalProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [showPage, setShowPage] = useState(true);
    const [difficulty, setDifficulty] = useState<number>(1);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [historyTrigger, setHistoryTrigger] = useState<number>(0);
    const [showImamFollower, setShowImamFollower] = useState(false);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    useEffect(() => {
        setIsRecording(false);
        setShowPage(true);
        setAnalysisResult(null);
        setShowImamFollower(false);
    }, [page]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
            <div
                className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col md:flex-row z-10 animate-in fade-in zoom-in-95 duration-200">

                {/* Left: Quran Page Image */}
                <div className="flex-1 bg-[#fdfbf7] relative flex flex-col items-center justify-center border-r border-slate-200 overflow-hidden">

                    {analysisResult && (
                        <div className="absolute inset-0 z-40 bg-[#fdfbf7]/90 backdrop-blur-md p-8 flex flex-col items-center justify-center animate-in fade-in slide-in-from-bottom-8 duration-500">
                            <div className="w-full h-full flex items-center justify-center">
                                <TajweedText analysis={analysisResult.analysis} />
                            </div>
                            <button
                                onClick={() => setAnalysisResult(null)}
                                className="absolute top-4 right-4 p-2 bg-white shadow-md rounded-full text-slate-400 hover:text-slate-600 transition-colors z-50"
                                title="Fermer l'analyse"
                            >
                                <X size={20} />
                            </button>
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full border border-slate-100 shadow-sm">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Analyse IA Détailé</span>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="md:hidden absolute top-4 left-4 p-2 bg-white/50 rounded-full text-slate-500 hover:bg-white transition-colors z-30"
                    >
                        <X size={24} />
                    </button>

                    <div className="absolute top-6 w-full text-center z-10 pointer-events-none">
                        <h3 className="text-xl font-bold text-slate-800 font-display">{getSurahForPage(page)}</h3>
                        <p className="text-sm text-primary font-medium tracking-wide">Page {page}</p>
                    </div>

                    {!isRecording && onPrev && (
                        <button
                            onClick={onPrev}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/80 shadow-lg hover:bg-white hover:scale-110 transition-all text-slate-400 hover:text-primary z-20"
                        >
                            <ChevronLeft size={24} />
                        </button>
                    )}

                    {!isRecording && onNext && (
                        <button
                            onClick={onNext}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/80 shadow-lg hover:bg-white hover:scale-110 transition-all text-slate-400 hover:text-primary z-20"
                        >
                            <ChevronRight size={24} />
                        </button>
                    )}

                    <div className={clsx(
                        "absolute inset-0 z-10 bg-slate-100/90 backdrop-blur-xl flex flex-col items-center justify-center transition-opacity duration-500",
                        (isRecording && !showPage) ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}>
                        <div className="bg-white p-6 rounded-2xl shadow-xl text-center max-w-sm mx-4">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                                <EyeOff size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Mode Récitation</h3>
                            <p className="text-slate-500">La page est masquée pour tester votre mémorisation.</p>
                            <button
                                onClick={() => setShowPage(true)}
                                className="mt-6 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium transition-colors"
                            >
                                J'ai besoin de voir (Tricher)
                            </button>
                        </div>
                    </div>

                    {showImamFollower && !isRecording ? (
                        <div className="w-full h-full flex flex-col pt-16 overflow-hidden">
                            <ImamFollower page={page} />
                        </div>
                    ) : (
                        <div className={clsx(
                            "w-full h-full p-4 md:p-12 flex items-center justify-center transition-all duration-500",
                            (isRecording && !showPage) ? "scale-90 blur-sm grayscale opacity-20" : "scale-100 opacity-100"
                        )}>
                            <img
                                src={`http://localhost:8001/api/v1/quran_pages/${page}.jpg`}
                                alt={`Page ${page}`}
                                className="max-w-full max-h-full object-contain shadow-lg rounded-sm"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x600?text=Page+Introuvable';
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Right: Recorder & Sidebar */}
                <div className="w-full md:w-[400px] flex flex-col bg-white">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="text-2xl font-bold font-display text-slate-800">Validation</h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">

                        {/* STATUS SESELECTOR */}
                        <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">État d'avancement</p>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => onStatusChange('mastered')}
                                    className={clsx("p-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all border",
                                        currentStatus === 'mastered' ? "bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm" : "bg-white text-slate-500 border-transparent hover:bg-emerald-50 hover:text-emerald-600"
                                    )}
                                >
                                    <CheckCircle size={14} className={currentStatus === 'mastered' ? "fill-emerald-200" : ""} /> Maîtrisé
                                </button>
                                <button
                                    onClick={() => onStatusChange('revise')}
                                    className={clsx("p-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all border",
                                        currentStatus === 'revise' ? "bg-amber-100 text-amber-700 border-amber-200 shadow-sm" : "bg-white text-slate-500 border-transparent hover:bg-amber-50 hover:text-amber-600"
                                    )}
                                >
                                    <AlertCircle size={14} className={currentStatus === 'revise' ? "fill-amber-200" : ""} /> À Réviser
                                </button>
                                <button
                                    onClick={() => onStatusChange('started')}
                                    className={clsx("p-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all border",
                                        currentStatus === 'started' ? "bg-blue-100 text-blue-700 border-blue-200 shadow-sm" : "bg-white text-slate-500 border-transparent hover:bg-blue-50 hover:text-blue-600"
                                    )}
                                >
                                    <BookOpen size={14} className={currentStatus === 'started' ? "fill-blue-200" : ""} /> En Cours
                                </button>
                                <button
                                    onClick={() => onStatusChange('locked')}
                                    className={clsx("p-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-all border",
                                        currentStatus === 'locked' ? "bg-slate-200 text-slate-700 border-slate-300 shadow-sm" : "bg-white text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-600"
                                    )}
                                >
                                    <Lock size={14} className={currentStatus === 'locked' ? "fill-slate-300" : ""} /> Non Débuté
                                </button>
                            </div>
                        </div>

                        {/* IMAM FOLLOWER TOGGLE */}
                        <button
                            onClick={() => setShowImamFollower(v => !v)}
                            className={clsx(
                                "w-full mb-4 px-4 py-3 rounded-xl border text-sm font-bold flex items-center gap-2 transition-all",
                                showImamFollower
                                    ? "bg-amber-100 text-amber-700 border-amber-200 shadow-sm"
                                    : "bg-slate-50 text-slate-500 border-slate-100 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-100"
                            )}
                        >
                            <span>👁</span>
                            <span>Suivi de l'Imam</span>
                            {showImamFollower && <span className="ml-auto text-[10px] uppercase tracking-wider font-black">Actif</span>}
                        </button>

                        <AudioPlayer page={page} />

                        {/* DIFFICULTY SELECTOR */}
                        <div className="mb-6">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Niveau de l'IA</p>
                            <div className="flex gap-2">
                                {[1, 2, 3].map((lvl) => (
                                    <button
                                        key={lvl}
                                        onClick={() => setDifficulty(lvl)}
                                        className={clsx(
                                            "flex-1 py-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1",
                                            difficulty === lvl
                                                ? "bg-primary/5 border-primary text-primary"
                                                : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                        )}
                                    >
                                        <span className="text-sm font-black">Niv. {lvl}</span>
                                        <span className="text-[9px] uppercase font-bold text-center leading-tight">
                                            {lvl === 1 && "Mémorisation"}
                                            {lvl === 2 && "Tajweed Basique"}
                                            {lvl === 3 && "Sheikh/Ijaza"}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <p className="mt-3 text-[10px] text-slate-400 italic leading-snug">
                                {difficulty === 1 && "Valide si les mots et voyelles sont là. Très indulgent."}
                                {difficulty === 2 && "Vérifie le Qalqalah et la nasalisation. Indulgence modérée."}
                                {difficulty === 3 && "Exigence maximale : prononciation et règles parfaites."}
                            </p>
                        </div>

                        <div className="mb-6 pt-2">
                            <div className="flex justify-between items-center mb-4">
                                <div className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                                    Enregistrement
                                </div>
                                {isRecording && showPage && (
                                    <button
                                        onClick={() => setShowPage(false)}
                                        className="text-xs flex items-center gap-1 text-slate-400 hover:text-primary transition-colors"
                                    >
                                        <EyeOff size={14} /> Cacher la page
                                    </button>
                                )}
                            </div>
                            <QuranRecorder
                                page={page}
                                difficulty={difficulty}
                                onRecordingStart={() => {
                                    setIsRecording(true);
                                    setShowPage(false);
                                    setAnalysisResult(null);
                                }}
                                onRecordingStop={() => {
                                    setIsRecording(false);
                                    setShowPage(true);
                                }}
                                onAnalysisComplete={(result) => {
                                    setAnalysisResult(result);
                                    setHistoryTrigger(prev => prev + 1);
                                    // Optional: Auto-update status based on score
                                    if (result.overall_score >= 0.75) onStatusChange('mastered');
                                    else if (result.overall_score < 0.75 && currentStatus !== 'mastered') onStatusChange('revise');
                                }}
                            />
                        </div>

                        {/* HISTORY SECTION */}
                        <div className="mt-8 border-t border-slate-100 pt-8 pb-12">
                            <RecordingHistory page={page} refreshTrigger={historyTrigger} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
