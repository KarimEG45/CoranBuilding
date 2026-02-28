'use client';

import React, { useState, useEffect } from 'react';
import { Quote, X, RefreshCw, Share2 } from 'lucide-react';

interface InspirationModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const INSPIRATIONS = [
    {
        ar: "خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ",
        fr: "Le meilleur d'entre vous est celui qui apprend le Coran et l'enseigne.",
        src: "Hadith - Al-Bukhari"
    },
    {
        ar: "مَنْ قَرَأَ حَرْفًا مِنْ كِتَابِ اللَّهِ فَلَهُ بِهِ حَسَنَةٌ وَالْحَسَنَةُ بِعَشْرِ أَمْثَالِهَا",
        fr: "Celui qui récite une lettre du Livre d'Allah obtient une bonne action, et la bonne action est multipliée par dix.",
        src: "Hadith - At-Tirmidhi"
    },
    {
        ar: "يُقَالُ لِصَاحِبِ الْقُرْآنِ اقْرَأْ وَارْتَقِ وَرَتِّلْ كَمَا كُنْتَ تُرَتِّلُ فِي الدُّنْيَا فَإِنَّ مَنْزِلَتَكَ عِنْدَ آخِرِ آيَةٍ تَقْرَأُ بِهَا",
        fr: "Il sera dit au compagnon du Coran : Lis et monte, et récite comme tu récitais dans le bas-monde, car ta demeure sera au dernier verset que tu réciteras.",
        src: "Hadith - Abu Dawood"
    },
    {
        ar: "وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ",
        fr: "En effet, Nous avons rendu le Coran facile pour la méditation. Y a-t-il quelqu'un pour réfléchir ?",
        src: "Sourate Al-Qamar - Verset 17"
    },
    {
        ar: "لَا حَسَدَ إِلاَّ فِي اثْنَتَيْنِ رَجُلٌ آتَاهُ اللَّهُ الْقُرْآنَ فَهُوَ يَتْلُوهُ آنَاءَ اللَّيْلِ وَآنَاءَ النَّهَارِ",
        fr: "Il n'y a d'envie permise que dans deux cas : un homme à qui Allah a donné le Coran et qui le récite nuit et jour...",
        src: "Hadith - Muslim"
    },
    {
        ar: "الْمَاهِرُ بِالْقُرْآنِ مَعَ السَّفَرَةِ الْكِرَامِ الْبَرَرَةِ",
        fr: "Celui qui excelle dans la récitation du Coran sera avec les nobles anges messagers obéissants.",
        src: "Hadith - Muslim"
    },
    {
        ar: "إِنَّ اللَّهَ يَرْفَعُ بِهَذَا الْكِتَابِ أَقْوَامًا وَيَضَعُ بِهِ آخَرِينَ",
        fr: "Certes, Allah élève par ce Livre des peuples et en abaisse d'autres.",
        src: "Hadith - Muslim"
    }
];

export default function InspirationModal({ isOpen, onClose }: InspirationModalProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (isOpen) {
            // Pick a random quote on open
            setCurrentIndex(Math.floor(Math.random() * INSPIRATIONS.length));
        }
    }, [isOpen]);

    const nextInspiration = () => {
        setCurrentIndex((prev) => (prev + 1) % INSPIRATIONS.length);
    };

    if (!isOpen) return null;

    const current = INSPIRATIONS[currentIndex];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-50 rounded-full transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-50 rounded-2xl flex items-center justify-center text-amber-500 mb-6 shadow-sm border border-amber-100 transform -rotate-3">
                        <Quote size={32} className="fill-current" />
                    </div>

                    <h3 className="text-xl font-bold font-display text-slate-800 mb-1">Inspiration du Jour</h3>
                    <p className="text-sm text-slate-400 mb-8">Une dose de motivation pour votre mémorisation</p>

                    <div className="mb-8 w-full">
                        <p className="text-2xl font-serif text-slate-800 mb-4 leading-relaxed dir-rtl" style={{ direction: 'rtl', fontFamily: 'Traditional Arabic, sans-serif' }}>
                            {current.ar}
                        </p>
                        <div className="h-px w-24 bg-slate-100 mx-auto mb-4"></div>
                        <p className="text-slate-600 italic leading-relaxed text-lg">
                            "{current.fr}"
                        </p>
                        <p className="text-xs font-bold text-sky-600 mt-4 uppercase tracking-wider bg-sky-50 py-1 px-3 rounded-full inline-block">
                            {current.src}
                        </p>
                    </div>

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={nextInspiration}
                            className="flex-1 py-3 px-4 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 group"
                        >
                            <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                            Nouvelle Inspiration
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
