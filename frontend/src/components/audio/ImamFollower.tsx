'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface Ayah {
    number: number;
    text: string;
    surah: { number: number; name: string; englishName: string };
    numberInSurah: number;
}

interface ImamFollowerProps {
    page: number;
}

const RECITERS = [
    { id: 'Alafasy_128kbps', name: 'Mishary Alafasy' },
    { id: 'Husary_128kbps', name: 'Al-Husary' },
    { id: 'Abdul_Basit_Murattal_64kbps', name: 'Abdul Basit' },
    { id: 'Ghamadi_40kbps', name: 'Al-Ghamdi' },
    { id: 'Minshawy_Murattal_128kbps', name: 'El-Minshawi' },
];

function ayahUrl(reciterId: string, surahNum: number, ayahNum: number): string {
    const s = String(surahNum).padStart(3, '0');
    const a = String(ayahNum).padStart(3, '0');
    return `https://everyayah.com/data/${reciterId}/${s}${a}.mp3`;
}

export default function ImamFollower({ page }: ImamFollowerProps) {
    const [ayahs, setAyahs] = useState<Ayah[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    const [reciter, setReciter] = useState(RECITERS[0].id);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const ayahRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Fetch ayahs when page changes
    useEffect(() => {
        setCurrentIndex(-1);
        setIsPlaying(false);
        setAyahs([]);
        setError(null);

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
        }

        setIsLoading(true);
        fetch(`https://api.alquran.cloud/v1/page/${page}/quran-uthmani`)
            .then((r) => r.json())
            .then((data) => {
                if (data.code === 200) {
                    setAyahs(data.data.ayahs);
                } else {
                    setError('Impossible de charger les ayahs.');
                }
            })
            .catch(() => setError('Erreur réseau lors du chargement.'))
            .finally(() => setIsLoading(false));
    }, [page]);

    // Auto-scroll when currentIndex changes
    useEffect(() => {
        if (currentIndex >= 0 && ayahRefs.current[currentIndex]) {
            ayahRefs.current[currentIndex]!.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    }, [currentIndex]);

    const playIndex = useCallback(
        (index: number) => {
            if (index < 0 || index >= ayahs.length) {
                setIsPlaying(false);
                setCurrentIndex(-1);
                return;
            }

            const ayah = ayahs[index];
            const url = ayahUrl(reciter, ayah.surah.number, ayah.numberInSurah);

            if (!audioRef.current) {
                audioRef.current = new Audio();
            }

            const audio = audioRef.current;
            audio.pause();
            audio.src = url;

            audio.onended = () => {
                setCurrentIndex((prev) => {
                    const next = prev + 1;
                    if (next >= ayahs.length) {
                        setIsPlaying(false);
                        return -1;
                    }
                    return next;
                });
            };

            audio.onerror = () => {
                setCurrentIndex((prev) => {
                    const next = prev + 1;
                    if (next >= ayahs.length) {
                        setIsPlaying(false);
                        return -1;
                    }
                    return next;
                });
            };

            setCurrentIndex(index);
            setIsPlaying(true);
            audio.play().catch(() => setIsPlaying(false));
        },
        [ayahs, reciter]
    );

    // When currentIndex changes due to onended callback, play the new index
    const prevIndexRef = useRef(-1);
    useEffect(() => {
        if (currentIndex >= 0 && currentIndex !== prevIndexRef.current && isPlaying) {
            // Only auto-advance (not on user-initiated clicks that already call playIndex)
            if (prevIndexRef.current >= 0 && currentIndex === prevIndexRef.current + 1) {
                playIndex(currentIndex);
            }
        }
        prevIndexRef.current = currentIndex;
    }, [currentIndex, isPlaying, playIndex]);

    const handlePlayPause = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            if (currentIndex === -1) {
                playIndex(0);
            } else {
                audioRef.current.play().catch(() => setIsPlaying(false));
                setIsPlaying(true);
            }
        }
    };

    const handleSkipBack = () => {
        const target = Math.max(0, currentIndex <= 0 ? 0 : currentIndex - 1);
        playIndex(target);
    };

    const handleSkipForward = () => {
        const target = currentIndex + 1;
        if (target < ayahs.length) playIndex(target);
    };

    const handleReciterChange = (newReciter: string) => {
        setReciter(newReciter);
        if (isPlaying && currentIndex >= 0) {
            // Restart current ayah with new reciter
            setTimeout(() => playIndex(currentIndex), 0);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
            }
        };
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                <Loader2 size={32} className="animate-spin text-amber-400" />
                <p className="text-sm">Chargement des ayahs...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-red-400 gap-2 px-6 text-center">
                <p className="text-sm font-medium">{error}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Controls bar */}
            <div className="flex-shrink-0 px-4 py-3 bg-amber-50/80 border-b border-amber-100 flex items-center gap-3">
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleSkipBack}
                        disabled={ayahs.length === 0}
                        className="p-1.5 rounded-full hover:bg-amber-100 text-amber-600 disabled:opacity-40 transition-colors"
                        title="Ayah précédente"
                    >
                        <SkipBack size={16} />
                    </button>
                    <button
                        onClick={handlePlayPause}
                        disabled={ayahs.length === 0}
                        className="p-2 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow disabled:opacity-40 transition-colors"
                        title={isPlaying ? 'Pause' : 'Lecture'}
                    >
                        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                    <button
                        onClick={handleSkipForward}
                        disabled={ayahs.length === 0 || currentIndex >= ayahs.length - 1}
                        className="p-1.5 rounded-full hover:bg-amber-100 text-amber-600 disabled:opacity-40 transition-colors"
                        title="Ayah suivante"
                    >
                        <SkipForward size={16} />
                    </button>
                </div>

                <div className="flex-1 flex items-center gap-1.5">
                    <Volume2 size={13} className="text-amber-500 flex-shrink-0" />
                    <select
                        value={reciter}
                        onChange={(e) => handleReciterChange(e.target.value)}
                        className="flex-1 text-xs rounded-lg border-amber-200 bg-white text-slate-700 py-1 px-2 focus:ring-amber-400 focus:border-amber-400 min-w-0"
                    >
                        {RECITERS.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.name}
                            </option>
                        ))}
                    </select>
                </div>

                {currentIndex >= 0 && (
                    <span className="text-[11px] text-amber-600 font-bold flex-shrink-0">
                        {currentIndex + 1}/{ayahs.length}
                    </span>
                )}
            </div>

            {/* Ayahs list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-hide">
                {ayahs.map((ayah, index) => (
                    <div
                        key={ayah.number}
                        ref={(el) => { ayahRefs.current[index] = el; }}
                        onClick={() => playIndex(index)}
                        className={clsx(
                            'p-3 rounded-xl cursor-pointer transition-all duration-300 border select-none',
                            index === currentIndex
                                ? 'ring-2 ring-amber-400 bg-amber-50 shadow-md scale-[1.01] border-amber-200'
                                : 'border-transparent hover:bg-slate-50 hover:border-slate-100'
                        )}
                    >
                        <div className="flex items-start gap-2">
                            <span className={clsx(
                                'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold mt-1 transition-colors',
                                index === currentIndex
                                    ? 'bg-amber-400 text-white'
                                    : 'bg-slate-100 text-slate-400'
                            )}>
                                {ayah.numberInSurah}
                            </span>
                            <p
                                dir="rtl"
                                className={clsx(
                                    'flex-1 text-right font-arabic leading-loose transition-colors',
                                    index === currentIndex
                                        ? 'text-slate-900 text-lg'
                                        : 'text-slate-600 text-base'
                                )}
                                style={{ fontFamily: "'Amiri Quran', 'Amiri', serif" }}
                            >
                                {ayah.text}
                            </p>
                        </div>
                        {index === currentIndex && (
                            <div className="mt-1.5 flex items-center gap-1.5 pl-8">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                <span className="text-[10px] text-amber-600 font-semibold">
                                    {ayah.surah.name} — {ayah.surah.englishName}
                                </span>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
