'use client'

import type { PageStatus } from '@/types'

interface PageTileProps {
  pageNumber: number
  status: PageStatus
  onClick: (page: number) => void
}

const STATUS_STYLES: Record<PageStatus, string> = {
  locked:   'bg-slate-800 border-slate-700 text-slate-500',
  started:  'bg-blue-900/60 border-blue-500/50 text-blue-300',
  revise:   'bg-amber-900/60 border-amber-500/50 text-amber-300 animate-pulse',
  mastered: 'bg-emerald-900/60 border-emerald-500/50 text-emerald-300',
}

const STATUS_DOT: Record<PageStatus, string> = {
  locked:   'bg-slate-600',
  started:  'bg-blue-400',
  revise:   'bg-amber-400',
  mastered: 'bg-emerald-400',
}

export default function PageTile({ pageNumber, status, onClick }: PageTileProps) {
  return (
    <button
      onClick={() => onClick(pageNumber)}
      className={`
        relative flex flex-col items-center justify-center
        w-full aspect-square rounded-md border
        text-xs font-mono font-bold
        transition-all active:scale-95 touch-manipulation
        ${STATUS_STYLES[status]}
      `}
      aria-label={`Page ${pageNumber}`}
    >
      <span className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} />
      <span className="text-[10px] leading-none">{pageNumber}</span>
    </button>
  )
}
