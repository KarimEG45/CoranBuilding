"use client";

import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
    page: number;
    difficulty?: number;
    onRecordingStart?: () => void;
    onRecordingStop?: () => void;
    onAnalysisComplete: (result: any) => void;
}

export const QuranRecorder: React.FC<Props> = ({
    page,
    difficulty = 1,
    onRecordingStart,
    onRecordingStop,
    onAnalysisComplete
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);

    // Modal disclaimer state
    const [showDisclaimer, setShowDisclaimer] = useState(true);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Determine supported MIME type
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            mediaRecorder.current = new MediaRecorder(stream, { mimeType });
            audioChunks.current = [];

            mediaRecorder.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.current.push(event.data);
                }
            };

            mediaRecorder.current.onstop = handleAudioBlob;
            mediaRecorder.current.start();
            setIsRecording(true);
            if (onRecordingStart) onRecordingStart();
            setError(null);
        } catch (err) {
            console.error("Recording error:", err);
            setError("Impossible d'accéder au micro. Vérifiez les permissions de votre navigateur.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
            mediaRecorder.current.stop();
            mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
            if (onRecordingStop) onRecordingStop();
        }
    };

    const handleAudioBlob = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });

        const formData = new FormData();
        formData.append('audio', audioBlob, 'recitation.webm');
        formData.append('page_id', page.toString());
        formData.append('difficulty_level', difficulty.toString());

        try {
            const token = sessionStorage.getItem('access_token');
            const response = await fetch('http://localhost:8001/api/v1/recitation/analyze', {
                method: 'POST',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Échec de l'analyse IA");
            }

            const result = await response.json();
            onAnalysisComplete(result);
        } catch (err: any) {
            setError(err.message || "Erreur lors de l'envoi de l'analyse.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (showDisclaimer) {
        return (
            <div className="p-6 bg-blue-50 dark:bg-slate-800 rounded-3xl border border-blue-100 dark:border-slate-700 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100 mb-1">Disclaimer État de l'Art</h3>
                        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed mb-4">
                            Ceci est un outil d'apprentissage assisté par Intelligence Artificielle. Bien que nous utilisions
                            des modèles de pointe pour l'analyse du Tajweed et de la phonétique, cet outil ne remplace pas
                            l'enseignement d'un professeur certifié.
                        </p>
                        <button
                            onClick={() => setShowDisclaimer(false)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" /> J'ai compris, commencer
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-white/5 w-full max-w-sm">
            <div className="relative mb-6">
                {isRecording && (
                    <>
                        <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
                        <div className="absolute -inset-4 bg-red-500/10 rounded-full animate-pulse blur-xl" />
                    </>
                )}

                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                    className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${isRecording
                        ? 'bg-red-500 shadow-xl shadow-red-500/40 scale-95 hover:scale-100'
                        : 'bg-gradient-to-br from-blue-600 to-indigo-700 hover:shadow-2xl hover:shadow-blue-500/40 hover:-translate-y-1'
                        } ${isProcessing && 'opacity-50 cursor-not-allowed grayscale'}`}
                >
                    {isProcessing ? (
                        <Loader2 className="w-12 h-12 text-white animate-spin" />
                    ) : isRecording ? (
                        <Square className="w-10 h-10 text-white fill-current" />
                    ) : (
                        <Mic className="w-12 h-12 text-white" />
                    )}
                </button>
            </div>

            <div className="text-center space-y-1">
                <h4 className="text-lg font-black text-slate-800 dark:text-white tracking-tight">
                    {isProcessing ? "Analyse IA..." : isRecording ? "Récitation en cours" : "Prêt à réciter"}
                </h4>
                <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">
                    {isRecording ? "Appuyez pour terminer l'analyse" : "Appuyez pour démarrer l'enregistrement"}
                </p>
            </div>

            {error && (
                <div className="mt-6 p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20 flex items-center gap-2 text-red-600 dark:text-red-400 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Waveform placeholder for a "Senior" vibe */}
            <div className="mt-8 flex items-center gap-1 h-8">
                {[...Array(12)].map((_, i) => (
                    <div
                        key={i}
                        className={`w-1 rounded-full transition-all duration-300 ${isRecording ? 'bg-red-400 animate-pulse' : 'bg-slate-200 dark:bg-slate-800'}`}
                        style={{
                            height: isRecording ? `${Math.random() * 100}%` : '20%',
                            animationDelay: `${i * 0.1}s`
                        }}
                    />
                ))}
            </div>
        </div>
    );
};
