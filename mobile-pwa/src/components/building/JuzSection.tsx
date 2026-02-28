'use client'

import PageTile from './PageTile'
import type { PageProgress, PageStatus } from '@/types'

interface JuzSectionProps {
  juzNumber: number
  startPage: number
  endPage: number
  progress: Record<number, PageProgress>
  onPageClick: (page: number) => void
}

export default function JuzSection({
  juzNumber,
  startPage,
  endPage,
  progress,
  onPageClick,
}: JuzSectionProps) {
  const pages = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => endPage - i  // reversed: highest page first
  )

  const label = juzNumber > 30 ? 'Toit' : `Juz' ${String(juzNumber).padStart(2, '0')}`

  return (
    <div className="flex items-stretch border-b border-slate-700/50 last:border-0">
      {/* Juz label - vertical, left side */}
      <div
        className="flex-shrink-0 w-6 bg-slate-800/50 flex items-center justify-center"
        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
      >
        <span className="text-[9px] font-bold text-slate-500 tracking-widest uppercase">
          {label}
        </span>
      </div>

      {/* Pages grid - responsive columns */}
      <div className="flex-1 grid grid-cols-5 sm:grid-cols-10 md:grid-cols-20 gap-1 p-1">
        {pages.map((pageNumber) => (
          <PageTile
            key={pageNumber}
            pageNumber={pageNumber}
            status={(progress[pageNumber]?.status as PageStatus) ?? 'locked'}
            onClick={onPageClick}
          />
        ))}
      </div>
    </div>
  )
}
