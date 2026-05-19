'use client'
import React, { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Camera, Send, Square, Loader, Upload } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useApp } from '@/app/context/AppContext'
import { useRecorder } from '@/app/_shared/_hooks/useRecorder'
import { useUpload, UPLOAD_STATUS_TEXT } from '@/app/_shared/_hooks/useUpload'
import { THEME } from '@/app/_shared/_constants/theme'
import { getJsonAuthHeaders } from '@/lib/auth/clientAuthHeaders'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'
import { createClient } from '@/lib/supabase/client'
import { subscribePushIfPermitted } from '@/lib/push/subscribePushClient'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'
import BottomNav from './BottomNav'

const SHOW_PATHS = ['/', '/rian', '/growth', '/treehouse', '/travel', '/vehicles', '/school']

export default function BottomInput() {
  const pathname  = usePathname()
  const { userId, sync: ctxSync, addTempTodo, removeTempTodo, speak, sessionReady } = useApp()

  const [inputMode, setInputMode] = useState<'none' | 'audio_text' | 'vision_file'>('none')
  const [inputText, setInputText]  = useState('')
  const [sending, setSending]      = useState(false)

  const fileInputRef   = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const isTreehouse = pathname === '/treehouse'

  const uid = useCallback(() =>
    userId || (typeof window !== 'undefined' ? localStorage.getItem('app_user_id') : '') || ''
  , [userId])

  const { uploading, uploadStatus, upload } = useUpload(uid(), () => {
    ctxSync()
    setInputMode('none')
  })

  const { isRecording, recordingSeconds, startRecording, stopRecording } = useRecorder(
    async (blob, filename) => {
      if (!sessionReady) return
      await upload(blob, 'audio', filename)
    }
  )

  const sendCommand = async () => {
    if (!inputText.trim() || sending) return
    if (!sessionReady) return
    setSending(true)
    const content = inputText.trim()
    const tempId  = addTempTodo(content)
    setInputText('')
    setInputMode('none')

    speak('已收到，根正在处理')

    try {
      const headers = await getJsonAuthHeaders()
      if (!headers.Authorization) {
        window.alert('登录已过期，请重新登录')
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
        alert('发送失败，请重试')
      }
    } catch (e) {
      logOrAlertNetworkError(e)
      removeTempTodo(tempId)
    } finally {
      setSending(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!sessionReady) return
    const category = file.type.startsWith('image/') ? 'image'
      : file.type === 'application/pdf' ? 'document' : 'other'
    await upload(file, category)
  }

  if (!SHOW_PATHS.includes(pathname)) return null

  const MicButton = (
    <motion.button whileTap={{ scale: 0.9 }}
      disabled={!sessionReady}
      onClick={() => !isTreehouse && sessionReady && setInputMode(inputMode === 'audio_text' ? 'none' : 'audio_text')}
      style={{ width: 52, height: 46, borderRadius: 23,
        background: inputMode === 'audio_text' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
        border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: isTreehouse || !sessionReady ? 'default' : 'pointer',
        opacity: isTreehouse ? 0.3 : !sessionReady ? 0.45 : 1 }}>
      <Mic size={21} color={inputMode === 'audio_text' ? THEME.gold : THEME.text} />
    </motion.button>
  )

  const CamButton = (
    <motion.button whileTap={{ scale: 0.9 }}
      disabled={!sessionReady}
      onClick={() => !isTreehouse && sessionReady && setInputMode(inputMode === 'vision_file' ? 'none' : 'vision_file')}
      style={{ width: 52, height: 46, borderRadius: 23,
        background: inputMode === 'vision_file' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
        border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: isTreehouse || !sessionReady ? 'default' : 'pointer',
        opacity: isTreehouse ? 0.3 : !sessionReady ? 0.45 : 1 }}>
      <Camera size={21} color={inputMode === 'vision_file' ? THEME.gold : THEME.text} />
    </motion.button>
  )

  return (
    <>
      <input ref={fileInputRef} type="file"
        accept="image/*,application/pdf,audio/*,.doc,.docx"
        style={{ display: 'none' }} onChange={handleFileChange} />
      <input ref={cameraInputRef} type="file"
        accept="image/*" capture="environment"
        style={{ display: 'none' }} onChange={handleFileChange} />

      {/* 展开的输入面板 */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(max(env(safe-area-inset-bottom), 36px) + 78px)',
        left: 0, right: 0, zIndex: 109,
        display: 'flex', justifyContent: 'center', padding: '0 16px',
        pointerEvents: inputMode === 'none' ? 'none' : 'auto',
      }}>
        <AnimatePresence>
          {inputMode !== 'none' && !isTreehouse && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              style={{ width: '100%', maxWidth: 360,
                background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(40px)',
                borderRadius: 28, padding: 18,
                border: '1px solid rgba(255,255,255,0.3)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}>

              {inputMode === 'audio_text' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.6 }}>
                    <Mic size={16} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: THEME.text }}>
                      {!sessionReady ? '会话恢复中…' : isRecording ? `录音中 ${recordingSeconds}s` : '语音录制 / 文字指令'}
                    </span>
                    {!sessionReady ? <Loader size={14} style={{ color: THEME.gold }} /> : null}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {!isRecording ? (
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => sessionReady && startRecording()}
                        disabled={!sessionReady}
                        style={{ width: 52, height: 52, borderRadius: '50%',
                          background: 'rgba(230,168,158,0.22)',
                          border: '2px solid rgba(230,168,158,0.45)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: sessionReady ? 'pointer' : 'not-allowed',
                          opacity: sessionReady ? 1 : 0.5 }}>
                        <Mic size={22} color="#a46355" />
                      </motion.button>
                    ) : (
                      <motion.button whileTap={{ scale: 0.9 }} onClick={stopRecording}
                        animate={{ boxShadow: ['0 0 0 0 rgba(213,128,116,0.32)', '0 0 0 12px rgba(213,128,116,0)', '0 0 0 0 rgba(213,128,116,0)'] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                        style={{ width: 52, height: 52, borderRadius: '50%',
                          background: 'rgba(213,128,116,0.5)',
                          border: '2px solid rgba(213,128,116,0.7)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer' }}>
                        <Square size={18} color="white" />
                      </motion.button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 10,
                    background: 'rgba(255,255,255,0.4)', borderRadius: 14, padding: '10px 14px' }}>
                    <input value={inputText} onChange={e => setInputText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sessionReady && !sending && sendCommand()}
                      placeholder="或输入文字指令..."
                      style={{ flex: 1, background: 'none', border: 'none',
                        fontSize: 14, color: THEME.text, outline: 'none' }} />
                    {!sessionReady || sending
                      ? <Loader size={17} style={{ color: THEME.gold }} />
                      : <motion.div whileTap={{ scale: 0.85 }} onClick={sendCommand}
                          style={{ cursor: 'pointer', opacity: inputText.trim() ? 1 : 0.3 }}>
                          <Send size={17} style={{ color: THEME.gold }} />
                        </motion.div>
                    }
                  </div>
                  {uploadStatus !== 'idle' && (
                    <p style={{ fontSize: 11, textAlign: 'center', margin: 0,
                      color: uploadStatus === 'done' ? '#8ca88d'
                        : uploadStatus === 'error' ? '#d58074' : THEME.gold }}>
                      {UPLOAD_STATUS_TEXT[uploadStatus]}
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.6 }}>
                    <Camera size={16} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: THEME.text }}>
                      拍摄 / 上传文件
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', cursor: sessionReady ? 'pointer' : 'not-allowed', opacity: sessionReady ? 1 : 0.5 }}
                      onClick={() => sessionReady && cameraInputRef.current?.click()}>
                      <motion.div whileTap={{ scale: 0.9 }}
                        style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.4)',
                          borderRadius: 16, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', marginBottom: 6 }}>
                        <Camera size={24} color={THEME.text} />
                      </motion.div>
                      <span style={{ fontSize: 10, opacity: 0.6, color: THEME.text }}>拍摄</span>
                    </div>
                    <div style={{ textAlign: 'center', cursor: sessionReady ? 'pointer' : 'not-allowed', opacity: sessionReady ? 1 : 0.5 }}
                      onClick={() => sessionReady && fileInputRef.current?.click()}>
                      <motion.div whileTap={{ scale: 0.9 }}
                        style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.4)',
                          borderRadius: 16, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', marginBottom: 6 }}>
                        {uploading
                          ? <Loader size={24} color={THEME.gold} />
                          : <Upload size={24} color={THEME.text} />}
                      </motion.div>
                      <span style={{ fontSize: 10, opacity: 0.6, color: THEME.text }}>上传文件</span>
                    </div>
                  </div>
                  {uploadStatus !== 'idle' && (
                    <p style={{ fontSize: 11, textAlign: 'center', margin: 0,
                      color: uploadStatus === 'done' ? '#8ca88d'
                        : uploadStatus === 'error' ? '#d58074' : THEME.gold }}>
                      {UPLOAD_STATUS_TEXT[uploadStatus]}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 导航栏，注入话筒和摄像头按钮 */}
      <BottomNav leftSlot={MicButton} rightSlot={CamButton} />
    </>
  )
}
