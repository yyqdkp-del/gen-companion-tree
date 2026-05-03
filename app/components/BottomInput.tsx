'use client'
import React, { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Camera, Send, Square, Loader, Upload } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useApp } from '@/app/context/AppContext'
import { useRecorder } from '@/app/_shared/_hooks/useRecorder'
import { useUpload, UPLOAD_STATUS_TEXT } from '@/app/_shared/_hooks/useUpload'
import { THEME } from '@/app/_shared/_constants/theme'
import BottomNav from './BottomNav'

const SHOW_PATHS = ['/', '/rian', '/growth', '/treehouse']

export default function BottomInput() {
  const pathname  = usePathname()
  const { userId, sync: ctxSync, addTempTodo, removeTempTodo } = useApp()

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
    async (blob, filename) => { await upload(blob, 'audio', filename) }
  )

  const sendCommand = async () => {
    if (!inputText.trim() || sending) return
    const u = uid()
    setSending(true)
    const content = inputText.trim()
    const tempId  = addTempTodo(content)
    setInputText('')
    setInputMode('none')

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const stored = localStorage.getItem('speech_enabled')
      if (stored !== 'false') {
        const u2 = new SpeechSynthesisUtterance('已收到，根正在处理')
        u2.lang = 'zh-CN'; u2.rate = 0.95
        window.speechSynthesis.speak(u2)
      }
    }

    try {
      const res = await fetch('/api/rian/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, input_type: 'text', user_id: u }),
      })
      const result = await res.json()
      if (result.ok) {
        ctxSync()
        removeTempTodo(tempId)
        if (result.todo_ids?.length) {
          result.todo_ids.forEach((todoId: string) => {
            fetch('/api/todo/smart-action', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ todo_id: todoId, user_id: u }),
            }).catch(() => {})
          })
        }
      } else {
        removeTempTodo(tempId)
      }
    } catch (e) {
      console.error(e)
      removeTempTodo(tempId)
    } finally {
      setSending(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const category = file.type.startsWith('image/') ? 'image'
      : file.type === 'application/pdf' ? 'document' : 'other'
    await upload(file, category)
  }

  if (!SHOW_PATHS.includes(pathname)) return null

  const MicButton = (
    <motion.button whileTap={{ scale: 0.9 }}
      onClick={() => !isTreehouse && setInputMode(inputMode === 'audio_text' ? 'none' : 'audio_text')}
      style={{ width: 52, height: 46, borderRadius: 23,
        background: inputMode === 'audio_text' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
        border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: isTreehouse ? 'default' : 'pointer',
        opacity: isTreehouse ? 0.3 : 1 }}>
      <Mic size={21} color={inputMode === 'audio_text' ? THEME.gold : THEME.text} />
    </motion.button>
  )

  const CamButton = (
    <motion.button whileTap={{ scale: 0.9 }}
      onClick={() => !isTreehouse && setInputMode(inputMode === 'vision_file' ? 'none' : 'vision_file')}
      style={{ width: 52, height: 46, borderRadius: 23,
        background: inputMode === 'vision_file' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
        border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: isTreehouse ? 'default' : 'pointer',
        opacity: isTreehouse ? 0.3 : 1 }}>
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
                      {isRecording ? `录音中 ${recordingSeconds}s` : '语音录制 / 文字指令'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {!isRecording ? (
                      <motion.button whileTap={{ scale: 0.9 }} onClick={startRecording}
                        style={{ width: 52, height: 52, borderRadius: '50%',
                          background: 'rgba(255,100,100,0.3)',
                          border: '2px solid rgba(255,100,100,0.5)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer' }}>
                        <Mic size={22} color="#E05050" />
                      </motion.button>
                    ) : (
                      <motion.button whileTap={{ scale: 0.9 }} onClick={stopRecording}
                        animate={{ boxShadow: ['0 0 0 0 rgba(255,80,80,0.4)', '0 0 0 12px rgba(255,80,80,0)', '0 0 0 0 rgba(255,80,80,0)'] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                        style={{ width: 52, height: 52, borderRadius: '50%',
                          background: 'rgba(255,80,80,0.5)',
                          border: '2px solid rgba(255,80,80,0.7)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer' }}>
                        <Square size={18} color="white" />
                      </motion.button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 10,
                    background: 'rgba(255,255,255,0.4)', borderRadius: 14, padding: '10px 14px' }}>
                    <input value={inputText} onChange={e => setInputText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendCommand()}
                      placeholder="或输入文字指令..."
                      style={{ flex: 1, background: 'none', border: 'none',
                        fontSize: 14, color: THEME.text, outline: 'none' }} />
                    {sending
                      ? <Loader size={17} style={{ color: THEME.gold }} />
                      : <motion.div whileTap={{ scale: 0.85 }} onClick={sendCommand}
                          style={{ cursor: 'pointer', opacity: inputText.trim() ? 1 : 0.3 }}>
                          <Send size={17} style={{ color: THEME.gold }} />
                        </motion.div>
                    }
                  </div>
                  {uploadStatus !== 'idle' && (
                    <p style={{ fontSize: 11, textAlign: 'center', margin: 0,
                      color: uploadStatus === 'done' ? '#4ADE80'
                        : uploadStatus === 'error' ? '#FB7185' : THEME.gold }}>
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
                    <div style={{ textAlign: 'center', cursor: 'pointer' }}
                      onClick={() => cameraInputRef.current?.click()}>
                      <motion.div whileTap={{ scale: 0.9 }}
                        style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.4)',
                          borderRadius: 16, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', marginBottom: 6 }}>
                        <Camera size={24} color={THEME.text} />
                      </motion.div>
                      <span style={{ fontSize: 10, opacity: 0.6, color: THEME.text }}>拍摄</span>
                    </div>
                    <div style={{ textAlign: 'center', cursor: 'pointer' }}
                      onClick={() => fileInputRef.current?.click()}>
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
                      color: uploadStatus === 'done' ? '#4ADE80'
                        : uploadStatus === 'error' ? '#FB7185' : THEME.gold }}>
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
