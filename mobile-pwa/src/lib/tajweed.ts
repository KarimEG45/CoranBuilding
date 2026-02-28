/**
 * Moteur Tajweed — Port TypeScript du backend Python tajweed_engine.py
 * Même logique, même règles, sans dépendances externes.
 */
import { normalizeArabic } from './quran'
import type { TajweedRule, TajweedRuleResult, WordAnalysis } from '@/types'

// ── Diacritiques arabes (Unicode) ─────────────────────────────────────────────
const FATHA    = '\u064E'
const DAMMA    = '\u064F'
const KASRA    = '\u0650'
const SUKOON   = '\u0652'
const SHADDA   = '\u0651'
const FATHATAN = '\u064B'
const DAMMATAN = '\u064C'
const KASRATAN = '\u064D'

const TANWEEN  = new Set([FATHATAN, DAMMATAN, KASRATAN])

const ALL_DIACRITICS = new Set([
  FATHA, DAMMA, KASRA, SUKOON, SHADDA,
  FATHATAN, DAMMATAN, KASRATAN, '\u0653', '\u0670',
  '\u0654', '\u0655', '\u0656', '\u065F',
])

// ── Groupes de lettres ────────────────────────────────────────────────────────
const QALQALAH_LETTERS  = new Set([...'قطبجد'])
const THROAT_LETTERS    = new Set([...'ءهعحغخ'])
const IDGHAM_GHUNNAH    = new Set([...'ينمو'])
const IDGHAM_NO_GHUNNAH = new Set([...'لر'])
const IQLAB_LETTER      = new Set(['ب'])
const HAMZA_LETTERS     = new Set([...'ءأإئؤآ'])
const NOON = 'ن'
const MEEM = 'م'

// ── Utilitaires ───────────────────────────────────────────────────────────────
function isDiacritic(char: string): boolean {
  return ALL_DIACRITICS.has(char)
}

function firstLetter(word: string): string {
  for (const char of word) {
    if (!isDiacritic(char)) return char
  }
  return ''
}

// ── Détecteurs de règles ──────────────────────────────────────────────────────

function detectQalqalah(word: string): TajweedRule[] {
  const rules: TajweedRule[] = []
  const chars = [...word]

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]
    if (!QALQALAH_LETTERS.has(char)) continue

    let hasSukoon = false
    let j = i + 1
    while (j < chars.length && isDiacritic(chars[j])) {
      if (chars[j] === SUKOON) hasSukoon = true
      j++
    }
    const isLastLetter = j >= chars.length

    if (hasSukoon || isLastLetter) {
      const subtype = hasSukoon ? 'Sughra' : 'Kubra'
      rules.push({
        rule: 'Qalqalah',
        subtype,
        letter: char,
        feedbackCorrect: `Qalqalah ${subtype} bien appliquée sur '${char}'.`,
        feedbackMissing: `Appliquez le rebond (Qalqalah ${subtype}) sur '${char}'.`,
      })
    }
  }
  return rules
}

function classifyNoonRule(nextWord?: string): string {
  if (!nextWord) return 'Izhar'
  const first = firstLetter(nextWord)
  if (!first) return 'Izhar'
  if (THROAT_LETTERS.has(first)) return 'Izhar'
  if (IQLAB_LETTER.has(first)) return 'Iqlab'
  if (IDGHAM_GHUNNAH.has(first)) return 'Idgham avec Ghunnah'
  if (IDGHAM_NO_GHUNNAH.has(first)) return 'Idgham sans Ghunnah'
  return 'Ikhfa'
}

function detectNoonSakinah(word: string, nextWord?: string): TajweedRule[] {
  const rules: TajweedRule[] = []
  const chars = [...word]

  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === NOON && i + 1 < chars.length && chars[i + 1] === SUKOON) {
      const ruleType = classifyNoonRule(nextWord)
      rules.push({
        rule: 'Noon Sakinah',
        subtype: ruleType,
        letter: NOON,
        feedbackCorrect: `Noon Sakinah (${ruleType}) bien appliquée.`,
        feedbackMissing: `Appliquez la règle ${ruleType} sur le Noon Sakinah.`,
      })
    }
  }

  if ([...chars].some((c) => TANWEEN.has(c))) {
    const ruleType = classifyNoonRule(nextWord)
    rules.push({
      rule: 'Tanween',
      subtype: ruleType,
      letter: '',
      feedbackCorrect: `Tanween (${ruleType}) bien appliqué.`,
      feedbackMissing: `Appliquez la règle ${ruleType} sur le Tanween.`,
    })
  }

  return rules
}

function classifyMeemRule(nextWord?: string): string {
  if (!nextWord) return 'Izhar Shafawi'
  const first = firstLetter(nextWord)
  if (first === MEEM) return 'Idgham Shafawi'
  if (IQLAB_LETTER.has(first)) return 'Ikhfa Shafawi'
  return 'Izhar Shafawi'
}

function detectMeemSakinah(word: string, nextWord?: string): TajweedRule[] {
  const rules: TajweedRule[] = []
  const chars = [...word]

  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === MEEM && i + 1 < chars.length && chars[i + 1] === SUKOON) {
      const ruleType = classifyMeemRule(nextWord)
      rules.push({
        rule: 'Meem Sakinah',
        subtype: ruleType,
        letter: MEEM,
        feedbackCorrect: `Meem Sakinah (${ruleType}) bien appliquée.`,
        feedbackMissing: `Appliquez la règle ${ruleType} sur le Meem Sakinah.`,
      })
    }
  }
  return rules
}

function detectGhunnah(word: string): TajweedRule[] {
  const rules: TajweedRule[] = []
  const chars = [...word]

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i]
    if (char !== NOON && char !== MEEM) continue
    let hasShadda = false
    let j = i + 1
    while (j < chars.length && isDiacritic(chars[j])) {
      if (chars[j] === SHADDA) hasShadda = true
      j++
    }
    if (hasShadda) {
      const letterName = char === NOON ? 'Noon' : 'Meem'
      rules.push({
        rule: 'Ghunnah Mushaddada',
        subtype: letterName,
        letter: char,
        feedbackCorrect: `Ghunnah bien nasalisée sur le ${letterName} Mushaddad (2 temps).`,
        feedbackMissing: `Nasalisez le ${letterName} avec Shadda (Ghunnah 2 temps).`,
      })
    }
  }
  return rules
}

function detectMadd(word: string, nextWord?: string): TajweedRule[] {
  const rules: TajweedRule[] = []
  const chars = [...word]

  for (let i = 1; i < chars.length; i++) {
    const char = chars[i]
    const prev = chars[i - 1]
    let isMadd = false

    if (char === 'ا' && prev === FATHA) isMadd = true
    else if (char === 'و' && prev === DAMMA) isMadd = true
    else if (char === 'ي' && prev === KASRA) isMadd = true

    if (!isMadd) continue

    const remaining = chars.slice(i + 1).filter((c) => !isDiacritic(c))
    const hasInternalHamza = remaining.some((c) => HAMZA_LETTERS.has(c))

    let maddType: string
    if (hasInternalHamza) {
      maddType = 'Madd Wajib Muttasil (4-5 temps)'
    } else if (nextWord && HAMZA_LETTERS.has(firstLetter(nextWord))) {
      maddType = 'Madd Jaiz Munfasil (2-4 temps)'
    } else {
      maddType = 'Madd Tabii (2 temps)'
    }

    rules.push({
      rule: 'Madd',
      subtype: maddType,
      letter: char,
      feedbackCorrect: `${maddType} bien respecté.`,
      feedbackMissing: `Allongez correctement : ${maddType}.`,
    })
  }
  return rules
}

// ── Correspondance textuelle (Levenshtein ratio) ───────────────────────────────
function similarity(a: string, b: string): number {
  if (!a && !b) return 1
  if (!a || !b) return 0
  const la = a.length, lb = b.length
  const dp: number[][] = Array.from({ length: la + 1 }, (_, i) =>
    Array.from({ length: lb + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return 1 - dp[la][lb] / Math.max(la, lb)
}

// ── Moteur principal ──────────────────────────────────────────────────────────

const LEVEL_CONFIG = {
  1: { threshold: 0.15, enforceTajweed: false },
  2: { threshold: 0.50, enforceTajweed: true  },
  3: { threshold: 0.80, enforceTajweed: true  },
} as const

export function analyzeWord(
  wordExpected: string,
  wordTranscribed: string,
  level: 1 | 2 | 3 = 1,
  nextWord?: string
): WordAnalysis {
  const config = LEVEL_CONFIG[level]

  const normExpected    = normalizeArabic(wordExpected)
  const normTranscribed = normalizeArabic(wordTranscribed || '')
  const textSim         = similarity(normExpected, normTranscribed)
  let isValid           = textSim >= config.threshold

  const rulesResults: TajweedRuleResult[] = []

  if (config.enforceTajweed) {
    const rawRules: TajweedRule[] = [
      ...detectQalqalah(wordExpected),
      ...detectNoonSakinah(wordExpected, nextWord),
      ...detectMeemSakinah(wordExpected, nextWord),
      ...detectGhunnah(wordExpected),
      ...(level >= 3 ? detectMadd(wordExpected, nextWord) : []),
    ]

    for (const rule of rawRules) {
      // Without audio, assume rule is respected if word was pronounced
      const success = !!wordTranscribed
      const confidence = success ? 0.6 : 0.0

      if (!success && level === 3) isValid = false

      rulesResults.push({
        rule: rule.rule,
        subtype: rule.subtype,
        status: success ? 'correct' : 'absent',
        confidence,
        feedback: success ? rule.feedbackCorrect : rule.feedbackMissing,
      })
    }
  }

  return {
    expected: wordExpected,
    transcribed: wordTranscribed || '',
    valid: isValid,
    confidence: Math.round(textSim * 1000) / 1000,
    rules: rulesResults,
  }
}

export function analyzePage(
  expectedWords: string[],
  transcribedWords: string[],
  level: 1 | 2 | 3 = 1
): WordAnalysis[] {
  return expectedWords.map((word, i) =>
    analyzeWord(
      word,
      transcribedWords[i] ?? '',
      level,
      expectedWords[i + 1]
    )
  )
}

export function computeScore(analyses: WordAnalysis[]): number {
  if (!analyses.length) return 0
  const valid = analyses.filter((a) => a.valid).length
  return valid / analyses.length
}
