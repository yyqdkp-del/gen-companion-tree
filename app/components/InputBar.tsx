'use client'
import React, { useState, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Home as HomeIcon, Mic, Camera, Send, Square, Loader, Upload } from 'lucide-react'
import { useApp } from '@/app/context/AppContext'
import { useRecorder } from '@/app/_shared/_hooks/useRecorder'
import { useUpload, UPLOAD_STATUS_TEXT } from '@/app/_shared/_hooks/useUpload'
import SettingsButton from '@/app/components/SettingsButton'

import { THEME } from '@/app/_shared/_constants/theme'

const PAGE_MAP: Record<string, string> = {
  '/': '基地',
  '/rian': '日安',
  '/growth': '根·中文',
  '/treehouse': '日栖',
}

const NAV_ITEMS = [
  { label: '基地', path: '/' },
  { label: '日安', path: '/rian' },
  { label: '根·中文', path: '/growth' },
  { label: '日栖', path: '/treehouse' },
]



export default function InputBar() {
  const router = useRouter()
  const pathname = usePathname()
 const { userId, sync: ctxSync, addTempTodo, removeTempTodo, modalOpen } = useApp()

  const [inputMode, setInputMode] = useState<'none' | 'audio_text' | 'vision_file'>('none')
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)

  const [showMenu, setShowMenu] = useState(false)


  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const currentPage = PAGE_MAP[pathname] || '根·陪伴'
const isTreehouse = pathname === '/treehouse'

// ── uid 获取，永远不会空 ──
const getUid = useCallback(() => {
  return userId || (typeof window !== 'undefined' ? localStorage.getItem('app_user_id') : '') || ''
}, [userId])

  const uid = getUid()

  const { uploading, uploadStatus, upload } = useUpload(uid, () => {
    ctxSync()
    setInputMode('none')
  })

  const { isRecording, recordingSeconds, startRecording, stopRecording } = useRecorder(
    async (blob, filename) => { await upload(blob, 'audio', filename) }
  )

const SHOW_PATHS = ['/', '/rian', '/growth', '/treehouse']
if (!SHOW_PATHS.includes(pathname)) return null

  // ── 文字发送 ──
 const sendCommand = async () => {
  if (!inputText.trim() || sending) return
  const uid = getUid()
  if (!uid) { router.push('/auth'); return }
  setSending(true)
  const content = inputText.trim()
  const tempId = addTempTodo(content)
  setInputText('')
  setInputMode('none')

  if (typeof window !== 'undefined' && window.speechSynthesis) {
    const stored = localStorage.getItem('speech_enabled')
    if (stored !== 'false') {
      const u = new SpeechSynthesisUtterance('已收到，根正在处理')
      u.lang = 'zh-CN'
      u.rate = 0.95
      window.speechSynthesis.speak(u)
    }
  }

  try {
    const res = await fetch('/api/rian/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, input_type: 'text', user_id: uid }),
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
            body: JSON.stringify({ todo_id: todoId, user_id: uid }),
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

  return (
    <>
      {/* 隐藏文件输入 */}
      <input ref={fileInputRef} type="file" accept="image/*,application/pdf,audio/*,.doc,.docx" style={{ display: 'none' }} onChange={handleFileChange} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileChange} />

      <footer style={{
        position: 'fixed',
        bottom: 'calc(max(env(safe-area-inset-bottom), 36px) + var(--keyboard-height, 0px))',
        left: 0, right: 0, zIndex: 110,
        display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 16px',
        transition: 'bottom 0.15s ease-out, opacity 0.2s ease, transform 0.2s ease',
        opacity: modalOpen ? 0 : 1,
        transform: modalOpen ? 'translateY(100%)' : 'translateY(0)',
        pointerEvents: modalOpen ? 'none' : 'auto',
      }}>

        {/* 展开的输入面板 */}
        <AnimatePresence>
          {inputMode !== 'none' && !isTreehouse && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              style={{ marginBottom: 16, width: '100%', maxWidth: 360, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(40px)', borderRadius: 28, padding: 18, border: '1px solid rgba(255,255,255,0.3)', boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}
            >
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
                        style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,100,100,0.3)', border: '2px solid rgba(255,100,100,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <Mic size={22} color="#E05050" />
                      </motion.button>
                    ) : (
                      <motion.button whileTap={{ scale: 0.9 }} onClick={stopRecording}
                        animate={{ boxShadow: ['0 0 0 0 rgba(255,80,80,0.4)', '0 0 0 12px rgba(255,80,80,0)', '0 0 0 0 rgba(255,80,80,0)'] }}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                        style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,80,80,0.5)', border: '2px solid rgba(255,80,80,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <Square size={18} color="white" />
                      </motion.button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 10, background: 'rgba(255,255,255,0.4)', borderRadius: 14, padding: '10px 14px' }}>
                    <input
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendCommand()}
                      placeholder="或输入文字指令..."
                      style={{ flex: 1, background: 'none', border: 'none', fontSize: 14, color: THEME.text, outline: 'none' }}
                    />
                    {sending ? (
                      <Loader size={17} style={{ color: THEME.gold }} />
                    ) : (
                      <motion.div whileTap={{ scale: 0.85 }} onClick={sendCommand} style={{ cursor: 'pointer', opacity: inputText.trim() ? 1 : 0.3 }}>
                        <Send size={17} style={{ color: THEME.gold }} />
                      </motion.div>
                    )}
                  </div>
                  {uploadStatus !== 'idle' && (
                    <p style={{ fontSize: 11, textAlign: 'center', margin: 0, color: uploadStatus === 'done' ? '#4ADE80' : uploadStatus === 'error' ? '#FB7185' : THEME.gold }}>
                      {UPLOAD_STATUS_TEXT[uploadStatus]}
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.6 }}>
                    <Camera size={16} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: THEME.text }}>拍摄 / 上传文件</span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => cameraInputRef.current?.click()}>
                      <motion.div whileTap={{ scale: 0.9 }}
                        style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.4)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                        <Camera size={24} color={THEME.text} />
                      </motion.div>
                      <span style={{ fontSize: 10, opacity: 0.6, color: THEME.text }}>拍摄</span>
                    </div>
                    <div style={{ textAlign: 'center', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
                      <motion.div whileTap={{ scale: 0.9 }}
                        style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.4)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                        {uploading ? <Loader size={24} color={THEME.gold} /> : <Upload size={24} color={THEME.text} />}
                      </motion.div>
                      <span style={{ fontSize: 10, opacity: 0.6, color: THEME.text }}>上传文件</span>
                    </div>
                  </div>
                  {uploadStatus !== 'idle' && (
                    <p style={{ fontSize: 11, textAlign: 'center', margin: 0, color: uploadStatus === 'done' ? '#4ADE80' : uploadStatus === 'error' ? '#FB7185' : THEME.gold }}>
                      {UPLOAD_STATUS_TEXT[uploadStatus]}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 页面切换菜单 */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              style={{ marginBottom: 12, display: 'flex', gap: 10 }}
            >
              {NAV_ITEMS.map(item => (
                <motion.button key={item.path} whileTap={{ scale: 0.95 }}
                  onClick={() => { router.push(item.path); setShowMenu(false) }}
                  style={{
                    padding: '8px 18px', borderRadius: 14,
                    background: pathname === item.path ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
                    border: 'none', fontSize: 11, fontWeight: 700, color: THEME.text,
                    backdropFilter: 'blur(10px)', cursor: 'pointer',
                  }}>
                  {item.label}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 底部胶囊导航栏 */}
        <div style={{
          width: '100%', maxWidth: 360, height: 62,
          background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(30px)',
          border: '1px solid rgba(255,255,255,0.2)', borderRadius: 31,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px',
        }}>
          {/* 话筒按钮 */}
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={() => !isTreehouse && setInputMode(inputMode === 'audio_text' ? 'none' : 'audio_text')}
            style={{
              width: 52, height: 46, borderRadius: 23,
              background: inputMode === 'audio_text' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: isTreehouse ? 'default' : 'pointer',
              opacity: isTreehouse ? 0.3 : 1,
            }}>
            <Mic size={21} color={inputMode === 'audio_text' ? THEME.gold : THEME.text} />
          </motion.button>

          {/* 中间页面名 + 导航触发 */}
          <motion.button whileTap={{ scale: 0.95 }}
            onClick={() => setShowMenu(!showMenu)}
            style={{ display: 'flex', alignItems: 'center', gap: 7, border: 'none', background: 'none', cursor: 'pointer' }}>
            <HomeIcon size={19} color={showMenu ? THEME.gold : THEME.text} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.3em', color: showMenu ? THEME.gold : THEME.text }}>
              {currentPage}
            </span>
          </motion.button>

          {/* 摄像头按钮 */}
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={() => !isTreehouse && setInputMode(inputMode === 'vision_file' ? 'none' : 'vision_file')}
            style={{
              width: 52, height: 46, borderRadius: 23,
              background: inputMode === 'vision_file' ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)',
              border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: isTreehouse ? 'default' : 'pointer',
              opacity: isTreehouse ? 0.3 : 1,
            }}>
            <Camera size={21} color={inputMode === 'vision_file' ? THEME.gold : THEME.text} />
          </motion.button>
        </div>
        {/* 设置按钮 */}
<SettingsButton />
      </footer>
    </>
  )
}
