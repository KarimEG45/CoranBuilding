'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { TranscriberStatus, WordAnalysis } from '@/types'
import { analyzePage, computeScore } from '@/lib/tajweed'
import { getPageWords } from '@/lib/quran'
import type { QuranPage } from '@/types'

interface QuranRecorderProps {
  page: QuranPage
  level: 1 | 2 | 3
  onResult: (analyses: WordAnalysis[], score: number) => void
}

const MODEL_ID = 'Xenova/whisper-base'

export default function QuranRecorder({ page, level, onResult }: QuranRecorderProps) {
  const [status, setStatus]         = useState<TranscriberStatus>('idle')
  const [loadProgress, setLoadProgress] = useState(0)
  const [statusMsg, setStatusMsg]   = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript]   = useState('')

  const workerRef      = useRef<Worker | null>(null)
  const mediaRecorder  = useRef<MediaRecorder | null>(null)
  const audioChunks    = useRef<Blob[]>([])

  // Initialize Web Worker
  useEffect(() => {
    const worker = new Worker(
      new URL('../../workers/whisper.worker.ts', import.meta.url),
      { type: 'module' }
    )

    worker.onmessage = (e: MessageEvent) => {
      const { type, status: wStatus, message, progress, error, text } = e.data

      if (type === 'status') {
        setStatus(wStatus)
        setStatusMsg(message)
      } else if (type === 'progress') {
        setLoadProgress(Math.round(progress * 100))
      } else if (type === 'result') {
        handleTranscript(text)
      } else if (type === 'error') {
        setStatus('error')
        setStatusMsg(error)
      }
    }

    workerRef.current = worker
    worker.postMessage({ type: 'load', modelId: MODEL_ID })

    return () => worker.terminate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleTranscript = useCallback((text: string) => {
    setTranscript(text)
    setStatus('done')
    setStatusMsg('')

    const expectedWords   = getPageWords(page)
    const transcribedWords = text.split(/\s+/).filter(Boolean)
    const analyses = analyzePage(expectedWords, transcribedWords, level)
    const score    = computeScore(analyses)
    onResult(analyses, score)
  }, [page, level, onResult])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunks.current = []
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.current.push(e.data) }
      recorder.onstop = processAudio
      recorder.start()
      mediaRecorder.current = recorder
      setIsRecording(true)
      setStatus('recording')
      setStatusMsg('Enregistrement...')
    } catch {
      setStatus('error')
      setStatusMsg('Microphone inaccessible.')
    }
  }

  const stopRecording = () => {
    mediaRecorder.current?.stop()
    mediaRecorder.current?.stream.getTracks().forEach((t) => t.stop())
    setIsRecording(false)
  }

  const processAudio = async () => {
    setStatus('transcribing')
    setStatusMsg('Analyse de la récitation...')

    const blob = new Blob(audioChunks.current, { type: 'audio/webm' })
    const arrayBuffer = await blob.arrayBuffer()

    // Decode audio to Float32Array (16kHz mono)
    const audioContext = new AudioContext({ sampleRate: 16000 })
    const decoded = await audioContext.decodeAudioData(arrayBuffer)
    const float32 = decoded.getChannelData(0)

    workerRef.current?.postMessage(
      { type: 'transcribe', audio: float32, language: 'arabic' },
      [float32.buffer]
    )
  }

  const isLoading = status === 'loading'
  const canRecord = status === 'idle' || status === 'done' || status === 'error'

  return (
    <div className="flex flex-col items-center gap-4 p-4">

      {/* Status indicator */}
      <div className="text-center min-h-[3rem] flex flex-col justify-center">
        {isLoading && (
          <div className="flex flex-col items-center gap-2">
            <div className="w-40 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gold-400 transition-all duration-300"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
            <p className="text-slate-400 text-xs">{statusMsg} ({loadProgress}%)</p>
          </div>
        )}
        {status === 'recording' && (
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-red-400 text-sm font-medium">Récitation en cours...</span>
          </div>
        )}
        {status === 'transcribing' && (
          <p className="text-blue-400 text-sm animate-pulse">{statusMsg}</p>
        )}
        {status === 'error' && (
          <p className="text-red-400 text-sm">{statusMsg}</p>
        )}
      </div>

      {/* Record button */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isLoading || status === 'transcribing'}
        className={`
          w-20 h-20 rounded-full border-4 flex items-center justify-center
          text-3xl transition-all active:scale-95 touch-manipulation
          disabled:opacity-40 disabled:cursor-not-allowed
          ${isRecording
            ? 'bg-red-900/50 border-red-500 text-red-400 animate-pulse'
            : canRecord
              ? 'bg-slate-800 border-gold-500/50 text-gold-400 hover:bg-slate-700'
              : 'bg-slate-800 border-slate-600 text-slate-500'
          }
        `}
        aria-label={isRecording ? 'Arrêter la récitation' : 'Commencer la récitation'}
      >
        {isRecording ? '⏹' : '🎤'}
      </button>

      <p className="text-slate-500 text-xs text-center">
        {isRecording
          ? 'Appuyez pour terminer'
          : canRecord
            ? 'Appuyez pour réciter'
            : ''}
      </p>

      {/* Transcript preview */}
      {transcript && (
        <div className="w-full bg-slate-800/50 rounded-lg p-3 border border-slate-700">
          <p className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">Transcription</p>
          <p className="text-slate-200 text-sm text-right font-arabic leading-relaxed" dir="rtl">
            {transcript}
          </p>
        </div>
      )}
    </div>
  )
}
