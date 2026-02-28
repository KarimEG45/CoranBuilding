'use client'

import { useState, useEffect } from 'react'
import BuildingView from '@/components/building/BuildingView'
import PageModal from '@/components/modals/PageModal'
import WelcomeModal from '@/components/modals/WelcomeModal'
import { getProgress, getSetting, setSetting } from '@/lib/db'
import type { PageProgress, PageStatus, UserStats } from '@/types'

export default function Home() {
  const [progress, setProgress] = useState<Record<number, PageProgress>>({})
  const [stats, setStats]       = useState<UserStats>({ mastered: 0, started: 0, revise: 0, total: 604, percentage: 0 })
  const [selectedPage, setSelectedPage] = useState<number | null>(null)
  const [loading, setLoading]   = useState(true)
  const [userName, setUserName] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    initApp()
  }, [])

  const initApp = async () => {
    const name = await getSetting<string | null>('userName', null)
    if (!name) {
      setShowWelcome(true)
    } else {
      setUserName(name)
    }
    loadProgress()
  }

  const handleWelcomeConfirm = async (name: string) => {
    await setSetting('userName', name)
    setUserName(name)
    setShowWelcome(false)
  }

  const loadProgress = async () => {
    const data = await getProgress()
    setProgress(data)
    computeStats(data)
    setLoading(false)
  }

  const computeStats = (data: Record<number, PageProgress>) => {
    let mastered = 0, started = 0, revise = 0
    Object.values(data).forEach(({ status }) => {
      if (status === 'mastered') mastered++
      else if (status === 'started') started++
      else if (status === 'revise') revise++
    })
    setStats({
      mastered, started, revise,
      total: 604,
      percentage: Math.round((mastered / 604) * 100),
    })
  }

  const handleStatusChange = (page: number, status: PageStatus) => {
    setProgress((prev) => {
      const updated = {
        ...prev,
        [page]: { ...prev[page], page, status, recitationCount: prev[page]?.recitationCount ?? 0 },
      }
      computeStats(updated)
      return updated
    })
  }

  if (showWelcome) {
    return <WelcomeModal onConfirm={handleWelcomeConfirm} />
  }

  return (
    <div className="flex flex-col min-h-screen">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 safe-area-inset">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-bold text-white">
              مبنى القرآن
              {userName && (
                <span className="text-gold-400 text-xs font-normal ml-2">— {userName}</span>
              )}
            </h1>
            <div className="flex items-center gap-1.5">
              <span className="text-gold-400 text-sm font-bold">{stats.percentage}%</span>
              <span className="text-slate-500 text-xs">محفوظ</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-2 w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-gold-500 transition-all duration-500"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="flex border-t border-slate-800 divide-x divide-slate-800">
          {[
            { label: 'Maîtrisé', labelAr: 'محفوظ', value: stats.mastered, color: 'text-emerald-400' },
            { label: 'En cours', labelAr: 'يُحفظ',  value: stats.started,  color: 'text-blue-400'    },
            { label: 'À réviser',labelAr: 'مراجعة', value: stats.revise,   color: 'text-amber-400'   },
            { label: 'Total',    labelAr: 'المجموع', value: 604,           color: 'text-slate-400'   },
          ].map((s) => (
            <div key={s.label} className="flex-1 py-2 text-center">
              <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
              <p className="text-slate-500 text-[9px] uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 px-2 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-500 text-sm">Chargement...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Legend */}
            <div className="flex flex-wrap gap-2 mb-4 px-1">
              {[
                { label: 'Maîtrisé', color: 'bg-emerald-400' },
                { label: 'À réviser', color: 'bg-amber-400' },
                { label: 'En cours', color: 'bg-blue-400' },
                { label: 'Non débuté', color: 'bg-slate-600' },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${l.color}`} />
                  <span className="text-slate-500 text-[10px]">{l.label}</span>
                </div>
              ))}
            </div>

            <BuildingView progress={progress} onPageClick={setSelectedPage} />

            {/* Bottom hint */}
            <p className="text-center text-slate-600 text-[10px] mt-4 italic">
              Appuyez sur une page pour réciter • اضغط على صفحة للتلاوة
            </p>
          </>
        )}
      </main>

      {/* Page Modal */}
      {selectedPage && (
        <PageModal
          pageNumber={selectedPage}
          currentStatus={progress[selectedPage]?.status ?? 'locked'}
          onClose={() => setSelectedPage(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}
