'use client'

import JuzSection from './JuzSection'
import type { PageProgress } from '@/types'

interface BuildingViewProps {
  progress: Record<number, PageProgress>
  onPageClick: (page: number) => void
}

export default function BuildingView({ progress, onPageClick }: BuildingViewProps) {
  const sections = []

  // Toit — Juz 30+ (pages 601-604)
  sections.push(
    <JuzSection
      key="roof"
      juzNumber={31}
      startPage={601}
      endPage={604}
      progress={progress}
      onPageClick={onPageClick}
    />
  )

  // Juz 30 → 1
  for (let juz = 30; juz >= 1; juz--) {
    const end   = juz * 20
    const start = end - 19
    sections.push(
      <JuzSection
        key={juz}
        juzNumber={juz}
        startPage={start}
        endPage={end}
        progress={progress}
        onPageClick={onPageClick}
      />
    )
  }

  return (
    <div className="flex flex-col w-full">

      {/* Sommet */}
      <div className="flex flex-col items-center py-3">
        <div className="w-0.5 h-8 bg-slate-400" />
        <div className="w-10 h-10 rounded-full border-2 border-slate-400 flex items-center justify-center">
          <span className="text-gold-400 text-xs">☽</span>
        </div>
        <div className="w-32 h-4 bg-slate-600 rounded-t-lg mt-1" />
        <span className="text-[10px] text-slate-500 mt-1 tracking-widest uppercase">
          Sommet — الذروة
        </span>
      </div>

      {/* Corps de l'immeuble */}
      <div className="bg-slate-900 border border-slate-700 rounded-t-lg overflow-hidden shadow-2xl">
        {sections}
      </div>

      {/* Fondation */}
      <div className="w-full bg-gradient-to-b from-slate-700 to-slate-900 py-3 px-4 text-center rounded-b-lg">
        <span className="text-slate-400 text-[10px] tracking-widest uppercase font-bold">
          الأساس — سورة الفاتحة
        </span>
      </div>
    </div>
  )
}
