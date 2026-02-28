'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Trash2, History, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface RecordingHistoryProps {
    page: number;
    refreshTrigger?: number;
}

interface Recording {
    id: number;
    url: string;
    timestamp: string;
    score: number;
    feedback: string;
}

export default function RecordingHistory({ page, refreshTrigger }: RecordingHistoryProps) {
    const [history, setHistory] = useState<Recording[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [playingId, setPlayingId] = useState<number | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            const token = sessionStorage.getItem('access_token');
            const response = await fetch(`http://localhost:8001/api/v1/recitation/history/${page}`, {
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            if (response.ok) {
                const data = await response.json();
                setHistory(data);
            }
        } catch (err) {
            console.error("Failed to fetch history:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [page, refreshTrigger]);

    const playRecording = (rec: Recording) => {
        if (playingId === rec.id) {
            audioRef.current?.pause();
            setPlayingId(null);
        } else {
            if (!audioRef.current) {
                audioRef.current = new Audio();
                audioRef.current.onended = () => setPlayingId(null);
            }
            audioRef.current.src = `http://localhost:8001${rec.url}`;
            audioRef.current.play();
            setPlayingId(rec.id);
        }
    };

    const deleteRecording = async (id: number) => {
        if (!confirm("Supprimer cet enregistrement ?")) return;

        try {
            const response = await fetch(`http://localhost:8001/api/v1/recitation/recording/${id}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                setHistory(history.filter(r => r.id !== id));
            }
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    if (isLoading && history.length === 0) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400 font-medium">Aucun historique pour cette page</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Mes Récitations</h3>
            {history.map((rec) => (
                <div key={rec.id} className="group p-3 bg-white border border-slate-100 rounded-2xl hover:border-primary/20 hover:shadow-sm transition-all">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => playRecording(rec)}
                            className={clsx(
                                "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                                playingId === rec.id ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                        >
                            {playingId === rec.id ? <Pause size={18} fill="currentColor" /> : <Play size={18} className="ml-1" fill="currentColor" />}
                        </button>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className={clsx(
                                    "text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                                    rec.score >= 80 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                )}>
                                    {rec.score}% PRÉCIS
                                </span>
                                <span className="text-[10px] text-slate-300 font-medium">
                                    {new Date(rec.timestamp).toLocaleDateString()} • {new Date(rec.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 truncate italic">"{rec.feedback}"</p>
                        </div>

                        <button
                            onClick={() => deleteRecording(rec.id)}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
