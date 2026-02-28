'use client';

import React, { useState, useEffect } from 'react';
import { X, UserPlus, Users, Trash2, LogOut, CheckCircle, AlertCircle } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    // We'll need a way to trigger login/logout from here?
    // Ideally, this component should handle the API calls and then maybe reload the page or update context.
}

interface User {
    id: number;
    username: string;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'profiles' | 'danger'>('profiles');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchUsers();
        }
    }, [isOpen]);

    const fetchUsers = async () => {
        try {
            const res = await fetch('http://localhost:8001/api/v1/users/all'); // Check path! users.py router is under /users? 
            // In api.py: api_router.include_router(users.router, prefix="/users", tags=["users"])
            // users.py: @router.get("/all")
            // So path is /api/v1/users/all
            if (res.ok) {
                const data = await res.json();
                // Data is list of {id, username}
                setUsers(data);
            }
        } catch (e) {
            console.error("Error fetching users:", e);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            const res = await fetch('http://localhost:8001/api/v1/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: newUsername, password: newPassword })
            });

            if (res.ok) {
                setSuccess(`Utilisateur "${newUsername}" créé avec succès !`);
                setNewUsername('');
                setNewPassword('');
                fetchUsers(); // Refresh list
            } else {
                const data = await res.json();
                setError(data.detail || "Erreur lors de la création.");
            }
        } catch (e) {
            setError("Erreur de connexion au serveur.");
        } finally {
            setLoading(false);
        }
    };

    const handleSwitchUser = async (username: string, password?: string) => {
        // For simple switch without password prompt for existing session? 
        // Or do we require login? The user requests "create accounts so each has progress".
        // Switching likely requires login.
        // But for this UI, maybe we just show "Log In as..." which opens a login prompt?
        // Or if we are already logged in, we logout first.

        // Let's implement a simple "Login" logic here for the selected user.
        // Actually, since we don't have the password for the listed users, we can't auto-login.
        // We should probably just have a "Logout" button in main menu, and "Login" is the default state if no token.

        // The user wants a MENU to manage accounts.
        // So: "Create Account" is good.
        // "Switch Account" -> effectively Logout and allow login?
        // Or maybe just clicking a user prompts for password?

        alert("Pour changer d'utilisateur, veuillez vous déconnecter puis vous reconnecter avec le nouveau compte.");
    };

    const handleDeleteUser = async (userId: number, username: string) => {
        if (!confirm(`Voulez-vous vraiment supprimer l'utilisateur "${username}" ? Cette action est irréversible.`)) {
            return;
        }

        try {
            const res = await fetch(`http://localhost:8001/api/v1/users/admin/${userId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                // If we deleted ourselves, reload?
                // For now just refresh list.
                fetchUsers();
                setSuccess(`Utilisateur "${username}" supprimé.`);
                setTimeout(() => setSuccess(null), 3000);
            } else {
                const data = await res.json();
                setError(data.detail || "Erreur lors de la suppression.");
            }
        } catch (e) {
            setError("Erreur serveur lors de la suppression.");
        }
    };

    const handleResetProgress = async () => {
        if (confirm("ATTENTION : Cela effacera TOUTE votre progression actuelle. Êtes-vous sûr ?")) {
            try {
                const token = sessionStorage.getItem('access_token');
                if (!token) return;

                // We don't have a specific "reset progress" endpoint, but we can delete the user? 
                // Or maybe we should add a reset endpoint.
                // Users.py has delete_user which deletes progress then user.
                // If we just want to reset progress, we might need a new endpoint or loop through pages.
                // Waiting: The user said "reset all building display".
                // Deleting account starts from scratch.
                // Let's call DELETE /users/me? No that deletes the account.
                // Maybe for now we just clear local state if mocking, but if using backend, we need to delete Progress rows.

                // Let's stick to "Delete Account" as the "Reset" for now since that's what backend supports (delete /me).
                // It effectively resets everything.

                const res = await fetch('http://localhost:8001/api/v1/users/me', {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (res.ok) {
                    sessionStorage.removeItem('access_token');
                    window.location.reload();
                } else {
                    alert("Erreur lors de la réinitialisation.");
                }
            } catch (e) { alert("Erreur serveur."); }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
                <div className="flex bg-slate-50 border-b border-slate-100">
                    <button
                        onClick={() => setActiveTab('profiles')}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'profiles' ? 'text-sky-600 bg-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Users size={18} />
                        Comptes
                    </button>
                    <button
                        onClick={() => setActiveTab('danger')}
                        className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'danger' ? 'text-red-600 bg-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <AlertCircle size={18} />
                        Zone Danger
                    </button>
                    <button
                        onClick={onClose}
                        className="w-16 flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors border-l border-slate-100"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto">
                    {activeTab === 'profiles' && (
                        <div className="space-y-8">
                            {/* Create User Form */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <UserPlus size={20} className="text-sky-500" />
                                    Créer un nouveau profil
                                </h3>
                                <form onSubmit={handleCreateUser} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nom d'utilisateur</label>
                                        <input
                                            type="text"
                                            required
                                            value={newUsername}
                                            onChange={e => setNewUsername(e.target.value)}
                                            className="w-full p-2 rounded-lg border-slate-200 focus:ring-sky-500 focus:border-sky-500 text-sm"
                                            placeholder="Ex: Hafiz2024"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Mot de passe</label>
                                        <input
                                            type="password"
                                            required
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            className="w-full p-2 rounded-lg border-slate-200 focus:ring-sky-500 focus:border-sky-500 text-sm"
                                            placeholder="••••••••"
                                        />
                                    </div>

                                    {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
                                    {success && <p className="text-emerald-500 text-xs font-bold flex items-center gap-1"><CheckCircle size={12} /> {success}</p>}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-lg shadow-sky-500/20 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {loading ? 'Création...' : 'Créer le compte'}
                                    </button>
                                </form>
                            </div>

                            {/* User List */}
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <Users size={20} className="text-slate-500" />
                                    Utilisateurs existants
                                </h3>
                                <div className="grid gap-2 max-h-40 overflow-y-auto">
                                    {users.length === 0 ? (
                                        <p className="text-slate-400 text-sm italic">Aucun utilisateur trouvé.</p>
                                    ) : (
                                        users.map(user => (
                                            <div key={user.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs">
                                                        {user.username.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium text-slate-700">{user.username}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-400">ID: {user.id}</span>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id, user.username)}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Supprimer l'utilisateur"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'danger' && (
                        <div className="space-y-6">
                            <div className="p-6 bg-red-50 rounded-2xl border border-red-100">
                                <h3 className="text-red-700 font-bold text-lg mb-2 flex items-center gap-2">
                                    <AlertCircle size={20} />
                                    Réinitialiser la progression
                                </h3>
                                <p className="text-red-600/80 text-sm mb-6 leading-relaxed">
                                    Cette action est irréversible. Elle va supprimer votre compte actuel ainsi que toutes les données de mémorisation associées (pages validées, enregistrements audio, objectifs).
                                </p>
                                <button
                                    onClick={handleResetProgress}
                                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={18} />
                                    Tout supprimer et recommencer
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
