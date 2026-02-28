'use client';

import React, { useState, useEffect } from 'react';
import { User, Lock, UserPlus, LogIn, Loader2, AlertCircle } from 'lucide-react';

interface LoginModalProps {
    isOpen: boolean;
    onLoginSuccess: (token: string, user: any) => void;
}

interface UserSummary {
    id: number;
    username: string;
}

export default function LoginModal({ isOpen, onLoginSuccess }: LoginModalProps) {
    const [view, setView] = useState<'login' | 'register'>('login');
    const [users, setUsers] = useState<UserSummary[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch users on mount logic
    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        try {
            const res = await fetch('http://localhost:8001/api/v1/users/all');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
                if (data.length === 0) {
                    setView('register');
                } else if (!selectedUser && data.length > 0) {
                    setSelectedUser(data[0].username);
                }
            }
        } catch (e) {
            console.error("Failed to fetch users", e);
            setError("Impossible de charger les utilisateurs.");
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const formData = new FormData();
            formData.append('username', selectedUser);
            formData.append('password', password);

            const res = await fetch('http://localhost:8001/api/v1/auth/token', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                const token = data.access_token;

                // Fetch full user details
                const userRes = await fetch('http://localhost:8001/api/v1/users/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (userRes.ok) {
                    const userData = await userRes.json();
                    onLoginSuccess(token, userData);
                } else {
                    setError("Erreur lors de la récupération du profil.");
                }
            } else {
                setError("Mot de passe incorrect.");
            }
        } catch (e) {
            setError("Erreur de connexion au serveur.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const res = await fetch('http://localhost:8001/api/v1/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (res.ok) {
                // Auto login after register? Or switch to login?
                // Let's switch to login with new user selected
                await fetchUsers();
                setSelectedUser(username);
                setView('login');
                setPassword('');
                // Alternatively auto-login:
                // But we need to call token endpoint which requires form data.
                // Let's just ask them to log in to be safe/simple.
            } else {
                const data = await res.json();
                setError(data.detail || "Erreur lors de la création.");
            }
        } catch (e) {
            setError("Erreur de connexion.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                <div className="p-8 text-center bg-slate-50 border-b border-slate-100">
                    <div className="w-16 h-16 bg-sky-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-sky-600 shadow-sm transform -rotate-3">
                        <User size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">Bienvenue</h2>
                    <p className="text-slate-500 mt-1">L'Immeuble du Coran</p>
                </div>

                <div className="p-8">
                    {view === 'login' ? (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Choisir un profil</label>
                                <div className="relative">
                                    <select
                                        value={selectedUser}
                                        onChange={(e) => setSelectedUser(e.target.value)}
                                        className="w-full p-3 pl-10 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all appearance-none cursor-pointer"
                                    >
                                        {users.map(u => (
                                            <option key={u.id} value={u.username}>{u.username}</option>
                                        ))}
                                    </select>
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mot de passe</label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full p-3 pl-10 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                                        placeholder="Votre mot de passe"
                                        autoFocus
                                    />
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading || users.length === 0}
                                className="w-full py-3 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-lg shadow-sky-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : <LogIn size={20} />}
                                Se connecter
                            </button>

                            <button
                                type="button"
                                onClick={() => { setView('register'); setError(null); }}
                                className="w-full py-3 text-slate-500 hover:text-sky-600 font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <UserPlus size={18} />
                                Créer un nouveau profil
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nom d'utilisateur</label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                                    placeholder="Ex: Hafiz2024"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mot de passe</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none"
                                    placeholder="••••••••"
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="animate-spin" /> : <UserPlus size={20} />}
                                Créer le compte
                            </button>

                            <button
                                type="button"
                                onClick={() => { setView('login'); setError(null); }}
                                className="w-full py-3 text-slate-500 hover:text-sky-600 font-medium transition-colors"
                            >
                                Retour à la connexion
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
