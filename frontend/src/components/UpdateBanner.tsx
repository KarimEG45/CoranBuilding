"use client";

import { useEffect, useRef, useState } from "react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const DISMISS_KEY = "update_banner_dismissed";

interface UpdateState {
  frontend_updated: boolean;
  exe_downloading: boolean;
  exe_progress: number;
  exe_ready: boolean;
  last_check: number | null;
  error: string | null;
}

export default function UpdateBanner() {
  const [state, setState] = useState<UpdateState | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [applying, setApplying] = useState(false);
  const reloadedRef = useRef(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/v1/update/status`);
      if (!res.ok) return;
      const data: UpdateState = await res.json();
      setState(data);
    } catch {
      // Backend may not be reachable — ignore silently
    }
  };

  // Poll on mount, then every 5 minutes
  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Auto-reload when frontend is updated (new static served by backend)
  useEffect(() => {
    if (state?.frontend_updated && !reloadedRef.current) {
      reloadedRef.current = true;
      // Small delay so the state write can flush
      setTimeout(() => window.location.reload(), 800);
    }
  }, [state?.frontend_updated]);

  // Restore dismissed flag from localStorage
  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  const handleRestart = async () => {
    setApplying(true);
    try {
      await fetch(`${BASE_URL}/api/v1/update/apply-exe`, { method: "POST" });
    } catch {
      // Expected — the process exits immediately
    }
  };

  if (!state) return null;

  // ── exe downloading → compact progress bar (bottom-right, always visible) ──
  if (state.exe_downloading) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-72 rounded-xl bg-slate-800 text-white shadow-xl p-4">
        <p className="text-sm font-medium mb-2">Mise à jour en cours…</p>
        <div className="w-full bg-slate-600 rounded-full h-2">
          <div
            className="bg-emerald-400 h-2 rounded-full transition-all duration-500"
            style={{ width: `${state.exe_progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-400 mt-1 text-right">{state.exe_progress}%</p>
      </div>
    );
  }

  // ── exe ready → restart banner (dismissable) ──
  if (state.exe_ready && !dismissed) {
    return (
      <div className="fixed bottom-4 right-4 z-50 w-80 rounded-xl bg-amber-50 border border-amber-300 shadow-xl p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-amber-800">Mise à jour prête</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Redémarrez l'application pour appliquer la nouvelle version.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-amber-500 hover:text-amber-700 text-lg leading-none mt-0.5"
            aria-label="Ignorer"
          >
            ✕
          </button>
        </div>
        <button
          onClick={handleRestart}
          disabled={applying}
          className="mt-3 w-full rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-sm font-medium py-1.5 transition-colors"
        >
          {applying ? "Redémarrage…" : "Redémarrer"}
        </button>
      </div>
    );
  }

  return null;
}
