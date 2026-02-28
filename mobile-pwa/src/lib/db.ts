import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { PageProgress, RecitationResult } from '@/types'

interface CoranDB extends DBSchema {
  progress: {
    key: number
    value: PageProgress
    indexes: { 'by-status': string }
  }
  history: {
    key: number
    value: RecitationResult
    indexes: { 'by-page': number; 'by-date': number }
  }
  settings: {
    key: string
    value: unknown
  }
}

let db: IDBPDatabase<CoranDB> | null = null

async function getDB(): Promise<IDBPDatabase<CoranDB>> {
  if (db) return db
  db = await openDB<CoranDB>('coran-building', 1, {
    upgrade(database) {
      const progressStore = database.createObjectStore('progress', { keyPath: 'page' })
      progressStore.createIndex('by-status', 'status')

      const historyStore = database.createObjectStore('history', {
        keyPath: 'timestamp',
      })
      historyStore.createIndex('by-page', 'pageNumber')
      historyStore.createIndex('by-date', 'timestamp')

      database.createObjectStore('settings', { keyPath: 'key' })
    },
  })
  return db
}

export async function getProgress(): Promise<Record<number, PageProgress>> {
  const database = await getDB()
  const all = await database.getAll('progress')
  const map: Record<number, PageProgress> = {}
  all.forEach((p) => { map[p.page] = p })
  return map
}

export async function setPageStatus(
  page: number,
  status: PageProgress['status']
): Promise<void> {
  const database = await getDB()
  const existing = await database.get('progress', page)
  await database.put('progress', {
    page,
    status,
    lastPracticed: Date.now(),
    recitationCount: (existing?.recitationCount ?? 0) + (status !== existing?.status ? 0 : 0),
  })
}

export async function saveRecitationResult(result: RecitationResult): Promise<void> {
  const database = await getDB()
  await database.put('history', result)
  // Auto-update page status based on score
  if (result.passed) {
    const current = await database.get('progress', result.pageNumber)
    const newStatus = result.overallScore >= 0.8 ? 'mastered' : 'started'
    if (!current || current.status !== 'mastered') {
      await database.put('progress', {
        page: result.pageNumber,
        status: newStatus,
        lastPracticed: Date.now(),
        recitationCount: (current?.recitationCount ?? 0) + 1,
      })
    }
  }
}

export async function getPageHistory(page: number): Promise<RecitationResult[]> {
  const database = await getDB()
  return database.getAllFromIndex('history', 'by-page', page)
}

export async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  const database = await getDB()
  const val = await database.get('settings', key) as { key: string; value: T } | undefined
  return val?.value ?? defaultValue
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const database = await getDB()
  await database.put('settings', { key, value } as { key: string; value: unknown })
}
