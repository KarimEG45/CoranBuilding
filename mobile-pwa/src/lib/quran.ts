import type { QuranPage } from '@/types'

const BASE_URL = 'https://api.alquran.cloud/v1'
const EDITION = 'ar.uthmani'

// Simple in-memory cache to avoid repeated requests
const pageCache = new Map<number, QuranPage>()

export async function fetchQuranPage(page: number): Promise<QuranPage> {
  if (pageCache.has(page)) return pageCache.get(page)!

  const res = await fetch(`${BASE_URL}/page/${page}/${EDITION}`)
  if (!res.ok) throw new Error(`AlQuran API error: ${res.status}`)

  const data = await res.json()
  const ayahs = data.data.ayahs

  const result: QuranPage = {
    number: page,
    ayahs: ayahs.map((a: { number: number; text: string; surah: { number: number; name: string; englishName: string } }) => ({
      number: a.number,
      text: a.text,
      surah: { number: a.surah.number, name: a.surah.name, englishName: a.surah.englishName },
    })),
    surahName: ayahs[0]?.surah?.name ?? '',
  }

  pageCache.set(page, result)
  return result
}

export function getPageText(page: QuranPage): string {
  return page.ayahs.map((a) => a.text).join(' ')
}

export function getPageWords(page: QuranPage): string[] {
  return getPageText(page)
    .split(/\s+/)
    .filter((w) => w.length > 0)
}

/**
 * Normalize Arabic text for comparison.
 * Removes diacritics and standardizes letters.
 */
export function normalizeArabic(text: string): string {
  return text
    // Remove diacritics (harakat)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Normalize alef variants → ا
    .replace(/[أإآٱ]/g, 'ا')
    // Normalize hamza on waw
    .replace(/ؤ/g, 'و')
    // Normalize hamza on ya (without dots)
    .replace(/ئ/g, 'ي')
    // Normalize ta marbuta
    .replace(/ة/g, 'ه')
    // Remove tatweel
    .replace(/ـ/g, '')
    .trim()
}
