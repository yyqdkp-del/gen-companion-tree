import { useState, useRef, useCallback } from 'react'

type RecorderState = {
  isRecording: boolean
  recordingSeconds: number
}

type UseRecorderReturn = RecorderState & {
  startRecording: () => Promise<void>
  stopRecording: () => void
}

export function useRecorder(
  onAudioReady: (blob: Blob, filename: string) => Promise<void>
): UseRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        await onAudioReady(audioBlob, `voice_${Date.now()}.webm`)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingSeconds(0)
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } catch {
      alert('请允许麦克风权限')
    }
  }, [onAudioReady])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRecording])

  return { isRecording, recordingSeconds, startRecording, stopRecording }
}
