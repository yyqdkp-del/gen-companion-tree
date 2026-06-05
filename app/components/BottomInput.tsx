'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Camera, Send, Square, Loader, Upload } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useApp } from '@/app/context/AppContext'
import { useRecorder } from '@/app/_shared/_hooks/useRecorder'
import { useUpload, UPLOAD_STATUS_TEXT } from '@/app/_shared/_hooks/useUpload'
import { FLOAT_INPUT_BOTTOM, TAB_BAR_HEIGHT_PX } from '@/app/_shared/_constants/layout'
import { THEME } from '@/app/_shared/_constants/theme'
import { getJsonAuthHeaders } from '@/lib/auth/clientAuthHeaders'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'
import { createClient } from '@/lib/supabase/client'
import { subscribePushIfPermitted } from '@/lib/push/subscribePushClient'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'
import { toast, toastRegisterPrompt } from '@/app/components/Toast'

const CAMERA_PAGES = ['/', '/rian']
const FLOAT_CHROME_PAGES = ['/rian']

const FLOAT_BTN: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 24,
  background: 'rgba(251,249,246,0.92)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '0.5px solid rgba(45,50,47,0.12)',
  boxShadow: '0 2px 12px rgba(45,50,47,0.12)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: 0,
}

export default function BottomInput() {
  const pathname = usePathname()
  const router = useRouter()
  const { userId, sync: ctxSync, addTempTodo, removeTempTodo, speak, sessionReady } = useApp()

  const requireRianLogin = useCallback(() => {
    if (pathname !== '/rian' || userId) return false
    toastRegisterPrompt(
      () => router.push('/auth?next=/rian'),
      '登录后可保存待办和日程',
    )
    return true
  }, [pathname, userId, router])

  const [inputMode, setInputMode] = useState<'none' | 'audio_text' | 'vision_file'>('none')
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleOpenCamera = () => {
      if (pathname === '/') {
        if (sessionReady) cameraInputRef.current?.click()
        return
      }
      setInputMode('vision_file')
    }
    window.addEventListener('openCamera', handleOpenCamera)
    return () => window.removeEventListener('openCamera', handleOpenCamera)
  }, [pathname, sessionReady])

  const uid = useCallback(
    () => userId || (typeof window !== 'undefined' ? localStorage.getItem('app_user_id') : '') || '',
    [userId],
  )

  const { uploading, uploadStatus, upload } = useUpload(uid(), () => {
    ctxSync()
    setInputMode('none')
  })

  const { isRecording, recordingSeconds, startRecording, stopRecording } = useRecorder(
    async (blob, filename) => {
      if (!sessionReady) return
      await upload(blob, 'audio', filename)
    },
  )

  const sendCommand = async () => {
    if (!inputText.trim() || sending) return
    if (requireRianLogin()) return
    if (!sessionReady) return
    setSending(true)
    const content = inputText.trim()
    const tempId = addTempTodo(content)
    setInputText('')
    setInputMode('none')

    speak('已收到，根正在处理')

    try {
      const headers = await getJsonAuthHeaders()
      if (!headers.Authorization) {
        toast('登录已过期，请重新登录', 'info')
        window.location.href = '/auth'
        removeTempTodo(tempId)
        return
      }
      const res = await fetchWithAuth('/api/rian/process', {
        method: 'POST',
        body: JSON.stringify({ content, input_type: 'text' }),
      })
      const result = await res.json()
      if (result.ok) {
        ctxSync()
        removeTempTodo(tempId)
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
          if (!localStorage.getItem('push_prompted_after_send')) {
            localStorage.setItem('push_prompted_after_send', '1')
            void Notification.requestPermission().then(async (p) => {
              if (p !== 'granted') return
              const { data: { session } } = await createClient().auth.getSession()
              if (session) await subscribePushIfPermitted(session)
            })
          }
        }
        if (result.todo_ids?.length) {
          result.todo_ids.forEach((todoId: string) => {
            fetchWithAuth('/api/todo/smart-action', {
              method: 'POST',
              body: JSON.stringify({ todo_id: todoId }),
            }).catch(logOrAlertNetworkError)
          })
        }
      } else {
        removeTempTodo(tempId)
        toast('发送失败，请重试', 'error')
      }
    } catch (e) {
      logOrAlertNetworkError(e)
      removeTempTodo(tempId)
    } finally {
      setSending(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (requireRianLogin()) return
    const file = e.target.files?.[0]
    if (!file) return
    if (!sessionReady) return
    const category = file.type.startsWith('image/')
      ? 'image'
      : file.type === 'application/pdf'
        ? 'document'
        : 'other'
    await upload(file, category)
  }

  if (!CAMERA_PAGES.includes(pathname)) return null

  const showFloatChrome = FLOAT_CHROME_PAGES.includes(pathname)
  const floatBottom = `calc(${FLOAT_INPUT_BOTTOM} + var(--keyboard-height, 0px))`
  const panelBottom = `calc(${TAB_BAR_HEIGHT_PX}px + env(safe-area-inset-bottom, 0px) + 16px + 104px + 12px + var(--keyboard-height, 0px))`

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,audio/*,.doc,.docx"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {showFloatChrome && (
      <div
        style={{
          position: 'fixed',
          bottom: panelBottom,
          left: 16,
          right: 16,
          zIndex: 98,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: inputMode === 'none' ? 'none' : 'auto',
        }}
      >
        <AnimatePresence>
          {inputMode !== 'none' && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              style={{
                width: '100%',
                maxWidth: 400,
                background: 'rgba(255,255,255,0.94)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                borderRadius: 20,
                padding: 16,
                border: '0.5px solid rgba(45,50,47,0.1)',
                boxShadow: '0 8px 32px rgba(45,50,47,0.12)',
              }}
            >
              {inputMode === 'audio_text' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.7 }}>
                    <Mic size={16} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: THEME.text }}>
                      {!sessionReady ? '会话恢复中…' : isRecording ? `录音中 ${recordingSeconds}s` : '语音 / 文字指令'}
                    </span>
                    {!sessionReady ? <Loader size={14} style={{ color: THEME.gold }} /> : null}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {!isRecording ? (
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        onClick={() => sessionReady && startRecording()}
                        disabled={!sessionReady}
                        style={{
                          ...FLOAT_BTN,
                          width: 52,
                          height: 52,
                          borderRadius: 26,
                          background: 'rgba(164,99,85,0.12)',
                          border: '1.5px solid rgba(164,99,85,0.35)',
                          opacity: sessionReady ? 1 : 0.5,
                          cursor: sessionReady ? 'pointer' : 'not-allowed',
                        }}
                      >
                        <Mic size={22} color="#a46355" />
                      </motion.button>
                    ) : (
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        onClick={stopRecording}
                        style={{
                          ...FLOAT_BTN,
                          width: 52,
                          height: 52,
                          borderRadius: 26,
                          background: 'rgba(213,128,116,0.45)',
                          border: '1.5px solid rgba(213,128,116,0.7)',
                        }}
                      >
                        <Square size={18} color="white" />
                      </motion.button>
                    )}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      background: 'rgba(45,50,47,0.04)',
                      borderRadius: 12,
                      padding: '10px 12px',
                    }}
                  >
                    <input
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sessionReady && !sending && void sendCommand()}
                      placeholder="或输入文字指令…"
                      style={{
                        flex: 1,
                        background: 'none',
                        border: 'none',
                        fontSize: 14,
                        color: THEME.text,
                        outline: 'none',
                      }}
                    />
                    {!sessionReady || sending ? (
                      <Loader size={17} style={{ color: THEME.gold }} />
                    ) : (
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.85 }}
                        onClick={() => void sendCommand()}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          opacity: inputText.trim() ? 1 : 0.35,
                          padding: 0,
                          display: 'flex',
                        }}
                      >
                        <Send size={17} color={THEME.gold} />
                      </motion.button>
                    )}
                  </div>
                  {uploadStatus !== 'idle' && (
                    <p
                      style={{
                        fontSize: 11,
                        textAlign: 'center',
                        margin: 0,
                        color:
                          uploadStatus === 'done' ? '#8ca88d' : uploadStatus === 'error' ? '#d58074' : THEME.gold,
                      }}
                    >
                      {UPLOAD_STATUS_TEXT[uploadStatus]}
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.7 }}>
                    <Camera size={16} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: THEME.text }}>
                      拍摄 / 上传文件
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => sessionReady && cameraInputRef.current?.click()}
                      disabled={!sessionReady}
                      style={{
                        background: 'none',
                        border: 'none',
                        textAlign: 'center',
                        cursor: sessionReady ? 'pointer' : 'not-allowed',
                        opacity: sessionReady ? 1 : 0.5,
                        padding: 0,
                      }}
                    >
                      <div style={{ ...FLOAT_BTN, margin: '0 auto 6px' }}>
                        <Camera size={22} color={THEME.text} />
                      </div>
                      <span style={{ fontSize: 10, color: THEME.muted }}>拍摄</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => sessionReady && fileInputRef.current?.click()}
                      disabled={!sessionReady}
                      style={{
                        background: 'none',
                        border: 'none',
                        textAlign: 'center',
                        cursor: sessionReady ? 'pointer' : 'not-allowed',
                        opacity: sessionReady ? 1 : 0.5,
                        padding: 0,
                      }}
                    >
                      <div style={{ ...FLOAT_BTN, margin: '0 auto 6px' }}>
                        {uploading ? <Loader size={22} color={THEME.gold} /> : <Upload size={22} color={THEME.text} />}
                      </div>
                      <span style={{ fontSize: 10, color: THEME.muted }}>上传</span>
                    </button>
                  </div>
                  {uploadStatus !== 'idle' && (
                    <p
                      style={{
                        fontSize: 11,
                        textAlign: 'center',
                        margin: 0,
                        color:
                          uploadStatus === 'done' ? '#8ca88d' : uploadStatus === 'error' ? '#d58074' : THEME.gold,
                      }}
                    >
                      {UPLOAD_STATUS_TEXT[uploadStatus]}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      )}

      {showFloatChrome && (
      <div
        style={{
          position: 'fixed',
          bottom: floatBottom,
          right: 16,
          zIndex: 99,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <motion.button
          type="button"
          aria-label="拍照或上传"
          whileTap={{ scale: 0.92 }}
          disabled={!sessionReady}
          onClick={() => {
            if (requireRianLogin()) return
            if (sessionReady) setInputMode(inputMode === 'vision_file' ? 'none' : 'vision_file')
          }}
          style={{
            ...FLOAT_BTN,
            border: inputMode === 'vision_file' ? '1.5px solid rgba(164,99,85,0.4)' : FLOAT_BTN.border,
            opacity: !sessionReady ? 0.45 : 1,
            cursor: sessionReady ? 'pointer' : 'default',
          }}
        >
          <Camera size={21} color={inputMode === 'vision_file' ? THEME.gold : THEME.text} />
        </motion.button>
        <motion.button
          type="button"
          aria-label="语音与文字"
          whileTap={{ scale: 0.92 }}
          disabled={!sessionReady}
          onClick={() => {
            if (requireRianLogin()) return
            if (sessionReady) setInputMode(inputMode === 'audio_text' ? 'none' : 'audio_text')
          }}
          style={{
            ...FLOAT_BTN,
            border: inputMode === 'audio_text' ? '1.5px solid rgba(164,99,85,0.4)' : FLOAT_BTN.border,
            opacity: !sessionReady ? 0.45 : 1,
            cursor: sessionReady ? 'pointer' : 'default',
          }}
        >
          <Mic size={21} color={inputMode === 'audio_text' ? THEME.gold : THEME.text} />
        </motion.button>
      </div>
      )}
    </>
  )
}
