'use client'

import { useState, useEffect, useCallback } from 'react'
import QuranRecorder from '@/components/recorder/QuranRecorder'
import { fetchQuranPage } from '@/lib/quran'
import { setPageStatus, saveRecitationResult } from '@/lib/db'
import type { QuranPage, WordAnalysis, PageStatus, RecitationResult } from '@/types'

interface PageModalProps {
  pageNumber: number
  currentStatus: PageStatus
  onClose: () => void
  onStatusChange: (page: number, status: PageStatus) => void
}

const LEVEL_LABELS: Record<number, string> = {
  1: 'Mémorisation',
  2: 'Tajweed Fondamental',
  3: 'Ijaza Hafs',
}

const STATUS_CONFIG: { value: PageStatus; label: string; labelAr: string; color: string }[] = [
  { value: 'locked',   label: 'Non débuté',  labelAr: 'لم يبدأ',    color: 'bg-slate-700 text-slate-300' },
  { value: 'started',  label: 'En cours',    labelAr: 'في التعلم',  color: 'bg-blue-900 text-blue-300'   },
  { value: 'revise',   label: 'À réviser',   labelAr: 'للمراجعة',   color: 'bg-amber-900 text-amber-300' },
  { value: 'mastered', label: 'Maîtrisé',    labelAr: 'محفوظ',      color: 'bg-emerald-900 text-emerald-300' },
]

export default function PageModal({
  pageNumber,
  currentStatus,
  onClose,
  onStatusChange,
}: PageModalProps) {
  const [quranPage, setQuranPage] = useState<QuranPage | null>(null)
  const [loading, setLoading]     = useState(true)
  const [level, setLevel]         = useState<1 | 2 | 3>(1)
  const [tab, setTab]             = useState<'page' | 'practice'>('page')
  const [analyses, setAnalyses]   = useState<WordAnalysis[] | null>(null)
  const [score, setScore]         = useState<number | null>(null)
  const [imgError, setImgError]   = useState(false)

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

  useEffect(() => {
    setLoading(true)
    fetchQuranPage(pageNumber)
      .then(setQuranPage)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [pageNumber])

  const handleResult = useCallback(async (wordAnalyses: WordAnalysis[], pageScore: number) => {
    setAnalyses(wordAnalyses)
    setScore(pageScore)

    const result: RecitationResult = {
      pageNumber,
      level,
      words: wordAnalyses,
      overallScore: pageScore,
      passed: pageScore >= (level === 1 ? 0.15 : level === 2 ? 0.5 : 0.8),
      timestamp: Date.now(),
    }
    await saveRecitationResult(result)

    if (result.passed && currentStatus === 'locked') {
      await setPageStatus(pageNumber, 'started')
      onStatusChange(pageNumber, 'started')
    }
  }, [pageNumber, level, currentStatus, onStatusChange])

  const handleStatusClick = async (status: PageStatus) => {
    await setPageStatus(pageNumber, status)
    onStatusChange(pageNumber, status)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 safe-area-inset">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
        <button
          onClick={onClose}
          className="text-slate-400 text-2xl leading-none touch-manipulation"
          aria-label="Fermer"
        >
          ←
        </button>
        <div className="text-center">
          <p className="text-white font-bold text-sm">Page {pageNumber}</p>
          {quranPage && (
            <p className="text-gold-400 text-xs font-arabic" dir="rtl">
              {quranPage.surahName}
            </p>
          )}
        </div>
        <div className="w-8" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-900">
        {(['page', 'practice'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium transition-colors touch-manipulation ${
              tab === t ? 'text-gold-400 border-b-2 border-gold-400' : 'text-slate-500'
            }`}
          >
            {t === 'page' ? '📖 Page' : '🎤 Récitation'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {tab === 'page' && (
          <div className="flex flex-col gap-4 p-4">
            {/* Page image */}
            <div className="rounded-lg overflow-hidden border border-slate-700 bg-white">
              {!imgError ? (
                <img
                  src={`${basePath}/quran_pages/Quran_Page_${String(pageNumber).padStart(3, '0')}.jpg`}
                  alt={`Page ${pageNumber} du Coran`}
                  className="w-full object-contain"
                  loading="lazy"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="flex items-center justify-center h-48 bg-slate-100">
                  <p className="text-slate-400 text-sm text-center px-4">
                    Image non disponible pour la page {pageNumber}
                  </p>
                </div>
              )}
            </div>

            {/* Arabic text */}
            {loading ? (
              <div className="animate-pulse bg-slate-800 rounded-lg h-24" />
            ) : quranPage ? (
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-3">Texte Uthmani</p>
                <p
                  className="text-slate-100 text-lg leading-loose text-right font-arabic"
                  dir="rtl"
                >
                  {quranPage.ayahs.map((a) => a.text).join(' ')}
                </p>
              </div>
            ) : null}

            {/* Status buttons */}
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
              <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-3">Statut de mémorisation</p>
              <div className="grid grid-cols-2 gap-2">
                {STATUS_CONFIG.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => handleStatusClick(s.value)}
                    className={`py-3 px-3 rounded-lg text-sm font-medium transition-all active:scale-95 touch-manipulation border ${
                      currentStatus === s.value
                        ? `${s.color} border-current`
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}
                  >
                    <span className="block">{s.label}</span>
                    <span className="block text-xs opacity-60 font-arabic" dir="rtl">{s.labelAr}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'practice' && (
          <div className="flex flex-col gap-4 p-4">
            {/* Level selector */}
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
              <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-3">Niveau</p>
              <div className="flex gap-2">
                {([1, 2, 3] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all touch-manipulation ${
                      level === l
                        ? 'bg-gold-500 text-slate-900'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    N{l}
                    <span className="block font-normal text-[9px] opacity-70 mt-0.5">
                      {LEVEL_LABELS[l]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recorder */}
            {quranPage && (
              <div className="bg-slate-900 rounded-lg border border-slate-700">
                <QuranRecorder page={quranPage} level={level} onResult={handleResult} />
              </div>
            )}

            {/* Results */}
            {score !== null && analyses && (
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-slate-400 text-[10px] uppercase tracking-wider">Résultats</p>
                  <span className={`text-lg font-bold ${score >= 0.8 ? 'text-emerald-400' : score >= 0.5 ? 'text-amber-400' : 'text-red-400'}`}>
                    {Math.round(score * 100)}%
                  </span>
                </div>

                {/* Score bar */}
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      score >= 0.8 ? 'bg-emerald-400' : score >= 0.5 ? 'bg-amber-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${score * 100}%` }}
                  />
                </div>

                {/* Word by word */}
                <div className="flex flex-wrap gap-1 justify-end" dir="rtl">
                  {analyses.slice(0, 20).map((w, i) => (
                    <span
                      key={i}
                      className={`px-2 py-1 rounded text-sm font-arabic ${
                        w.valid ? 'bg-emerald-900/50 text-emerald-300' : 'bg-red-900/50 text-red-300'
                      }`}
                      title={`${Math.round(w.confidence * 100)}%`}
                    >
                      {w.expected}
                    </span>
                  ))}
                  {analyses.length > 20 && (
                    <span className="text-slate-500 text-xs self-center">
                      +{analyses.length - 20} mots...
                    </span>
                  )}
                </div>

                {/* Tajweed rules */}
                {analyses.some((a) => a.rules.length > 0) && (
                  <div className="mt-4 space-y-2">
                    <p className="text-slate-400 text-[10px] uppercase tracking-wider">Règles Tajweed</p>
                    {analyses
                      .filter((a) => a.rules.length > 0)
                      .slice(0, 5)
                      .map((a, i) =>
                        a.rules.map((r, j) => (
                          <div key={`${i}-${j}`} className={`flex items-start gap-2 text-xs p-2 rounded ${
                            r.status === 'correct' ? 'bg-emerald-900/30' : 'bg-red-900/30'
                          }`}>
                            <span>{r.status === 'correct' ? '✓' : '✗'}</span>
                            <span className={r.status === 'correct' ? 'text-emerald-400' : 'text-red-400'}>
                              {r.feedback}
                            </span>
                          </div>
                        ))
                      )
                    }
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
