export type PageStatus = 'locked' | 'started' | 'revise' | 'mastered'

export interface PageProgress {
  page: number
  status: PageStatus
  lastPracticed?: number // timestamp
  recitationCount: number
}

export interface UserStats {
  mastered: number
  started: number
  revise: number
  total: number
  percentage: number
  lastSession?: number
}

export interface TajweedRule {
  rule: string
  subtype: string
  letter: string
  feedbackCorrect: string
  feedbackMissing: string
}

export interface WordAnalysis {
  expected: string
  transcribed: string
  valid: boolean
  confidence: number
  rules: TajweedRuleResult[]
}

export interface TajweedRuleResult {
  rule: string
  subtype: string
  status: 'correct' | 'absent'
  confidence: number
  feedback: string
}

export interface RecitationResult {
  pageNumber: number
  level: number
  words: WordAnalysis[]
  overallScore: number
  passed: boolean
  timestamp: number
}

export interface QuranVerse {
  number: number
  text: string
  surah: { number: number; name: string; englishName: string }
}

export interface QuranPage {
  number: number
  ayahs: QuranVerse[]
  surahName: string
}

export type TranscriberStatus =
  | 'idle'
  | 'loading'
  | 'recording'
  | 'transcribing'
  | 'done'
  | 'error'
