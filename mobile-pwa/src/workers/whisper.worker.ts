/**
 * Web Worker — Transcription Whisper via @huggingface/transformers
 * Tourne dans un thread séparé pour ne pas bloquer l'interface.
 */
import { pipeline, env } from '@huggingface/transformers'

// Empêche de chercher les modèles en local (on les télécharge depuis HuggingFace)
env.allowLocalModels = false

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let transcriber: any = null

async function loadModel(modelId: string) {
  self.postMessage({ type: 'status', status: 'loading', message: 'Chargement du modèle Whisper...' })
  transcriber = await pipeline(
    'automatic-speech-recognition',
    modelId,
    {
      dtype: 'q8',  // Quantification 8-bit pour économiser la mémoire
      progress_callback: (progress: { status: string; progress?: number; name?: string }) => {
        if (progress.status === 'downloading') {
          self.postMessage({
            type: 'progress',
            progress: progress.progress ?? 0,
            name: progress.name ?? '',
          })
        }
      },
    }
  )
  self.postMessage({ type: 'status', status: 'ready', message: 'Modèle prêt.' })
}

self.addEventListener('message', async (event: MessageEvent) => {
  const { type, audio, modelId, language } = event.data

  if (type === 'load') {
    try {
      await loadModel(modelId ?? 'Xenova/whisper-base')
    } catch (err) {
      self.postMessage({ type: 'error', error: String(err) })
    }
    return
  }

  if (type === 'transcribe') {
    if (!transcriber) {
      self.postMessage({ type: 'error', error: 'Modèle non chargé.' })
      return
    }
    try {
      self.postMessage({ type: 'status', status: 'transcribing', message: 'Transcription en cours...' })

      // audio: Float32Array
      const result = await transcriber(audio as Float32Array, {
        language: language ?? 'arabic',
        task: 'transcribe',
        return_timestamps: false,
      }) as { text: string }

      self.postMessage({ type: 'result', text: result.text.trim() })
    } catch (err) {
      self.postMessage({ type: 'error', error: String(err) })
    }
  }
})
