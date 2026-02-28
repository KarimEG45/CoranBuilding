'use client';

import React, { useState, useEffect } from 'react';
import { User, Activity, Settings, BookOpen, LogOut, Play, Flame, Sparkles, Share2 } from 'lucide-react';
import InspirationModal from './InspirationModal';
import SettingsModal from './SettingsModal';

type PageStatus = 'locked' | 'started' | 'revise' | 'mastered';

const getJuzForPage = (page: number): number => {
    if (page >= 601) return 31;
    if (page <= 20) return 1;
    return Math.ceil(page / 20);
};

export default function DashboardLayout({
    children,
    stats = { mastered: 0, total: 604, percentage: 0, streak: 0 },
    user,
    onShare,
    progress = {}
}: {
    children: React.ReactNode,
    stats?: { mastered: number, total: number, percentage: number, streak: number },
    user?: { username: string, mushaf_type?: string },
    onShare?: () => void,
    progress?: Record<number, PageStatus>
}) {
    const [showInspiration, setShowInspiration] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const nonLockedPages = Object.entries(progress)
        .filter(([, status]) => status !== 'locked')
        .map(([page]) => parseInt(page));
    const lastWorkedPage = nonLockedPages.reduce((max, p) => Math.max(max, p), 0);
    const lastWorkedJuz = lastWorkedPage > 0 ? getJuzForPage(lastWorkedPage) : null;

    const handleResume = () => {
        if (!lastWorkedJuz) return;
        const el = document.getElementById(`juz-section-${lastWorkedJuz}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };



    useEffect(() => {
        // Initial heartbeat
        const sendHeartbeat = () => {
            fetch('http://localhost:8001/api/v1/system/heartbeat', { method: 'POST' })
                .catch(() => { }); // Ignore errors
        };

        sendHeartbeat();
        const interval = setInterval(sendHeartbeat, 30000); // Every 30s

        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        sessionStorage.removeItem('access_token');
        window.location.reload();
    };

    // Calculate stroke offset for the circle
    // r=48 -> circumference ~ 301.59
    const circumference = 301.59;
    const strokeDashoffset = circumference - (stats.percentage / 100) * circumference;

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-display">
            {/* Sidebar */}
            <aside className="w-80 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col z-20 shadow-xl">
                <div className="p-8 text-center border-b border-slate-100">
                    <div className="relative inline-block mb-4">
                        <div className="w-24 h-24 rounded-full border-4 border-sky-100 p-1">
                            {/* Profile Image - Could make dynamic later */}
                            <img
                                alt="Profile"
                                className="w-full h-full rounded-full object-cover"
                                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDNb_1L2ZGq52ytL5dMNsAoAJqsuoQzh6cTzKzxuG9hhvw-PKPSJVNiM-5KCTKNRmmX9B60KkDF4Ygwhqttsb7a5Y7gNifEEL3pFFnOcMmshAfm3FJ5YFqxsdguTmYGipicF3wa-zelWXT3fXQq1V-nwVqFwqeuk9PxWZBP_C6oZ_aGdKuuAEJNUQDEkVFL4rrHib0iXWQOWRO2kT4EXeGgWMrNvaVB-HAtfFhCIJfjbCzhlgNflgW3ZPzD-NoMUuA8PdzQOhIAK-0i"
                            />
                        </div>
                        <span className="absolute bottom-1 right-1 bg-emerald-500 w-5 h-5 rounded-full border-2 border-white"></span>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-800">
                        {user ? user.username : "Invité"}
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Étudiant</p>
                </div>

                {/* Gauge Section */}
                <div className="px-8 py-6 border-b border-slate-100">
                    <div className="bg-slate-50 rounded-2xl p-6 relative overflow-hidden group border border-slate-100">
                        <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:rotate-12 transition-transform">
                            <Activity size={48} className="text-sky-600" />
                        </div>
                        <div className="relative flex flex-col items-center">
                            <div className="relative flex items-center justify-center mb-2">
                                <svg className="w-28 h-28 transform -rotate-90">
                                    <circle className="text-slate-200" cx="56" cy="56" fill="transparent" r="48" stroke="currentColor" strokeWidth="8"></circle>
                                    <circle
                                        className="text-sky-500 transition-all duration-1000 ease-out"
                                        cx="56" cy="56"
                                        fill="transparent"
                                        r="48"
                                        stroke="currentColor"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeDashoffset}
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                    ></circle>
                                </svg>
                                <span className="absolute text-xl font-bold text-sky-600">{stats.percentage.toFixed(1)}%</span>
                            </div>
                            <p className="text-xs uppercase tracking-widest font-semibold text-slate-400">Progression Globale</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-hide">
                    <a href="#" className="flex items-center gap-3 px-4 py-3 bg-sky-600 text-white rounded-xl shadow-lg shadow-sky-600/20">
                        <BookOpen size={20} />
                        <span className="font-medium">Immeuble (Tableau de bord)</span>
                    </a>

                    <button
                        onClick={() => setShowInspiration(true)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-sky-600 rounded-xl transition-colors text-left"
                    >
                        <Sparkles size={20} className="text-amber-500" />
                        <span className="font-medium">Inspirations</span>
                    </button>

                    <button
                        onClick={() => setShowSettings(true)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-sky-600 rounded-xl transition-colors text-left"
                    >
                        <Settings size={20} />
                        <span className="font-medium">Paramètres</span>
                    </button>
                </nav>

                <div className="p-6 border-t border-slate-100">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 py-3 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                        <LogOut size={18} />
                        <span className="font-medium">Déconnexion</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative overflow-hidden bg-day-sky">
                {/* Background Elements (Clouds) */}
                <div className="absolute top-20 left-20 w-32 h-12 bg-white/20 rounded-full blur-xl pointer-events-none"></div>
                <div className="absolute top-40 right-40 w-48 h-16 bg-white/30 rounded-full blur-xl pointer-events-none"></div>
                <div className="absolute bottom-20 left-1/3 w-64 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

                {/* Header */}
                <header className="h-20 bg-white/90 backdrop-blur-md border-b border-white/20 flex items-center justify-between px-8 z-30 shadow-sm flex-shrink-0">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-sky-600">
                                <BookOpen size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-semibold uppercase">Pages Maîtrisées</p>
                                <p className="font-bold text-lg text-slate-800">{stats.mastered} / <span className="text-slate-400 font-normal text-sm">{stats.total}</span></p>
                            </div>
                        </div>
                        <div className="h-8 w-px bg-slate-200"></div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center">
                                <Flame size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-semibold uppercase">Série Actuelle</p>
                                <p className="font-bold text-lg text-slate-800">{stats.streak} Jours</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-200 shadow-sm">
                            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                            <span className="text-xs font-bold text-slate-600 mr-2">Maîtrisé</span>
                            <span className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
                            <span className="text-xs font-bold text-slate-600 mr-2">À Réviser</span>
                            <span className="w-3 h-3 rounded-full bg-slate-700 shadow-[0_0_8px_rgba(51,65,85,0.5)]"></span>
                            <span className="text-xs font-bold text-slate-600">Non Débuté</span>
                        </div>
                        {onShare && (
                            <button
                                onClick={onShare}
                                className="flex items-center gap-2 border border-sky-200 text-sky-600 px-5 py-2.5 rounded-full font-semibold hover:bg-sky-50 transition-all hover:-translate-y-0.5 active:scale-95"
                            >
                                <Share2 size={16} />
                                Partager
                            </button>
                        )}
                        {lastWorkedJuz && (
                            <button
                                onClick={handleResume}
                                className="bg-sky-600 hover:bg-sky-700 text-white px-6 py-2 rounded-full font-semibold shadow-lg shadow-sky-500/30 transition-all hover:-translate-y-0.5 active:scale-95 flex items-center gap-2"
                            >
                                <Play size={16} className="fill-white" />
                                <span className="flex flex-col items-start leading-tight">
                                    <span className="text-sm font-bold">Reprendre</span>
                                    <span className="text-[10px] font-medium opacity-75">Juz' {lastWorkedJuz > 30 ? '30+' : lastWorkedJuz}</span>
                                </span>
                            </button>
                        )}
                    </div>
                </header>

                {/* Scrollable Content Area */}
                <div id="building-scroll-container" className="flex-1 overflow-y-auto relative scroll-smooth">
                    {children}
                </div>

                {/* Global Modals */}
                <InspirationModal
                    isOpen={showInspiration}
                    onClose={() => setShowInspiration(false)}
                />

                <SettingsModal
                    isOpen={showSettings}
                    onClose={() => setShowSettings(false)}
                />
            </main>
        </div>
    );
}
