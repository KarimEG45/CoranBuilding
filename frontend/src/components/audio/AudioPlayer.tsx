'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Volume2 } from 'lucide-react';

interface AudioPlayerProps {
    page: number;
}

const RECITERS = [
    { id: 'Alafasy_128kbps', name: 'Mishary Rashid Alafasy' },
    { id: 'Husary_128kbps', name: 'Mahmoud Khalil Al-Husary' },
    { id: 'Abdul_Basit_Murattal_64kbps', name: 'Abdul Basit (Murattal)' },
    { id: 'Ghamadi_40kbps', name: 'Saad Al-Ghamdi' },
    { id: 'Minshawy_Murattal_128kbps', name: 'Mohamed Siddiq El-Minshawi' }
];

export default function AudioPlayer({ page }: AudioPlayerProps) {
    const [selectedReciter, setSelectedReciter] = useState(RECITERS[0].id);
    const audioRef = useRef<HTMLAudioElement>(null);

    const paddedPage = String(page).padStart(3, '0');
    const audioSrc = `https://everyayah.com/data/${selectedReciter}/PageMp3s/Page${paddedPage}.mp3`;

    // Auto-load new source when page changes (but don't auto-play to avoid annoyance)
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.load();
        }
    }, [page, selectedReciter]);

    return (
        <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
                <Volume2 size={16} className="text-sky-600" />
                <label htmlFor="reciter-select" className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                    Récitateur
                </label>
            </div>

            <select
                id="reciter-select"
                value={selectedReciter}
                onChange={(e) => setSelectedReciter(e.target.value)}
                className="w-full text-sm rounded-lg border-slate-200 mb-3 bg-white text-slate-700 py-2 focus:ring-sky-500 focus:border-sky-500"
            >
                {RECITERS.map((reciter) => (
                    <option key={reciter.id} value={reciter.id}>
                        {reciter.name}
                    </option>
                ))}
            </select>

            <audio
                ref={audioRef}
                controls
                src={audioSrc}
                className="w-full h-8 block rounded-lg accent-sky-600"
                onError={(e) => {
                    console.error("Error loading audio:", e);
                    // Optionally handle error
                }}
            >
                Votre navigateur ne supporte pas l'élément audio.
            </audio>

            <div className="mt-2 text-[10px] text-slate-400 text-center">
                Source: EveryAyah.com
            </div>
        </div>
    );
}
