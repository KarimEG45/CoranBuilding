'use client'

import { useState } from 'react'

interface WelcomeModalProps {
  onConfirm: (name: string) => void
}

export default function WelcomeModal({ onConfirm }: WelcomeModalProps) {
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed) onConfirm(trimmed)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 px-6">

      {/* Icon */}
      <div className="text-6xl mb-6">🕌</div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-white text-center mb-1">
        مبنى القرآن
      </h1>
      <p className="text-slate-400 text-sm text-center mb-8">
        The Coran Building
      </p>

      {/* Bismillah */}
      <p className="text-gold-400 font-arabic text-xl text-center mb-8" dir="rtl">
        بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
      </p>

      {/* Description */}
      <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 mb-8 w-full max-w-sm">
        <p className="text-slate-300 text-sm text-center leading-relaxed">
          Chaque page du Coran mémorisée ajoute un étage à ton immeuble.
          Ta progression est sauvegardée localement sur ton appareil.
        </p>
        <p className="text-slate-500 text-xs text-center mt-2" dir="rtl">
          تقدمك محفوظ محلياً على جهازك — لا حاجة لإنترنت
        </p>
      </div>

      {/* Name form */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4">
        <div>
          <label className="block text-slate-400 text-xs uppercase tracking-wider mb-2">
            Ton prénom (اسمك)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Karim"
            maxLength={30}
            className="
              w-full px-4 py-3 rounded-xl
              bg-slate-800 border border-slate-700
              text-white placeholder-slate-600
              focus:outline-none focus:border-gold-500
              text-lg
            "
            autoFocus
          />
        </div>

        <button
          type="submit"
          disabled={!name.trim()}
          className="
            w-full py-4 rounded-xl font-bold text-lg
            bg-gold-500 text-slate-900
            disabled:opacity-40 disabled:cursor-not-allowed
            active:scale-95 transition-all touch-manipulation
          "
        >
          Commencer — ابدأ
        </button>
      </form>

      {/* Footer */}
      <p className="text-slate-600 text-[10px] text-center mt-8 leading-relaxed">
        صدقة جارية — Application offerte librement pour l&apos;amour d&apos;Allah
      </p>
    </div>
  )
}
