'use client';

import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface TajweedWord {
    text: string;
    valid: boolean;
    confidence: number;
    tajweed_rules: Array<{ rule: string; status: string; confidence: number }>;
    feedback?: string;
}

interface TajweedTextProps {
    analysis: {
        words: TajweedWord[];
    };
}

export default function TajweedText({ analysis }: TajweedTextProps) {
    if (!analysis || !analysis.words) return null;

    return (
        <div className="w-full h-full p-8 bg-white/40 backdrop-blur-sm rounded-3xl flex flex-wrap justify-center gap-x-4 gap-y-6 dir-rtl text-right overflow-y-auto custom-scrollbar">
            {analysis.words.map((word, idx) => (
                <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                        delay: idx * 0.03,
                        type: "spring",
                        stiffness: 260,
                        damping: 20
                    }}
                    className="group relative"
                >
                    <span
                        className={clsx(
                            "text-4xl md:text-6xl font-quran leading-[1.8] transition-all duration-500 block px-2 rounded-xl",
                            word.valid
                                ? "text-slate-800 hover:bg-emerald-50 hover:text-emerald-700"
                                : "text-rose-500 bg-rose-50/50 decoration-rose-200 decoration-wavy underline underline-offset-8"
                        )}
                        dir="rtl"
                    >
                        {word.text}
                    </span>

                    {/* Advanced Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-6 w-64 p-4 bg-white/95 backdrop-blur shadow-2xl rounded-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 border border-slate-100 scale-95 group-hover:scale-100 translate-y-2 group-hover:translate-y-0">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-lg font-quran font-bold text-slate-800">{word.text}</span>
                            <div className={clsx(
                                "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                word.valid ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600"
                            )}>
                                {word.valid ? "Correct" : "Erreur"}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                <span>Confiance IA</span>
                                <span>{Math.round(word.confidence * 100)}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                                <div
                                    className={clsx("h-full transition-all duration-1000", word.valid ? "bg-emerald-400" : "bg-rose-400")}
                                    style={{ width: `${word.confidence * 100}%` }}
                                />
                            </div>
                        </div>

                        {word.tajweed_rules.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-50 space-y-2">
                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none">Règles de Tajweed</p>
                                {word.tajweed_rules.map((rule, rIdx) => (
                                    <div key={rIdx} className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-700">{rule.rule}</span>
                                        <span className="text-[10px] text-emerald-500 font-medium lowercase">✓ {rule.status}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {word.feedback && (
                            <div className="mt-3 p-2 bg-rose-50/50 rounded-lg border border-rose-100/50">
                                <p className="text-[11px] text-rose-700 leading-snug font-medium italic">
                                    "{word.feedback}"
                                </p>
                            </div>
                        )}

                        {/* Tooltip arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white" />
                    </div>
                </motion.div>
            ))}

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
}
