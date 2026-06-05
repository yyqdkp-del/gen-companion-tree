import { useState, useRef, useCallback, useEffect } from 'react'
import { toast } from '@/app/components/Toast'

type RecorderState = {
  isRecording: boolean
  recordingSeconds: number
}

type UseRecorderReturn = RecorderState & {
  startRecording: () => Promise<void>
  stopRecording: () => void
  cancelRecording: () => void
}

export function useRecorder(
  onAudioReady: (blob: Blob, filename: string) => Promise<void>
): UseRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const cancelRef = useRef(false)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      cancelRef.current = false
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      mediaRecorder.onstop = async () => {
        const tracks = streamRef.current?.getTracks() ?? []
        tracks.forEach((t) => t.stop())
        streamRef.current = null
        if (cancelRef.current) {
          cancelRef.current = false
          audioChunksRef.current = []
          return
        }
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await onAudioReady(audioBlob, `voice_${Date.now()}.webm`)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingSeconds(0)
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } catch {
      toast('请允许麦克风权限', 'info')
    }
  }, [onAudioReady])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRecording])

  const cancelRecording = useCallback(() => {
    if (!mediaRecorderRef.current || !isRecording) return
    cancelRef.current = true
    mediaRecorderRef.current.stop()
    setIsRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [isRecording])

  return { isRecording, recordingSeconds, startRecording, stopRecording, cancelRecording }
}
