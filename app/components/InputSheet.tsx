'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Camera,
  Mic,
  Keyboard,
  FolderUp,
  X,
  Check,
  Bell,
  Calendar,
  Heart,
  FileText,
  Send,
  Sparkles,
} from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { useApp } from '@/app/context/AppContext'
import { useRecorder } from '@/app/_shared/_hooks/useRecorder'
import { useUpload } from '@/app/_shared/_hooks/useUpload'
import PriChip from '@/app/_shared/_components/design/PriChip'
import type { PriKind } from '@/app/_shared/_components/design/priorityTokens'
import { getJsonAuthHeaders } from '@/lib/auth/clientAuthHeaders'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'
import { createClient } from '@/lib/supabase/client'
import { subscribePushIfPermitted } from '@/lib/push/subscribePushClient'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'
import { toast, toastRegisterPrompt } from '@/app/components/Toast'
import type { LucideIcon } from 'lucide-react'

export type InputMode = 'camera' | 'voice' | 'text' | 'file'

type SheetPhase = 'input' | 'preview' | 'processing' | 'result'

type ResultItem = {
  key: string
  title: string
  subtitle: string
  priority: PriKind
  Icon: LucideIcon
}

export type InputSheetProps = {
  open: boolean
  onClose: () => void
  mode: InputMode
  onModeChange: (mode: InputMode) => void
}

const SHEET_EASE = [0.16, 1, 0.3, 1] as const
const CLAY = 'var(--clay)'
const FG1 = 'var(--fg1)'
const FG2 = 'var(--fg2)'
const FG3 = 'var(--fg3)'
const JADE = 'var(--jade, #1d9e75)'

function priorityNumToKind(p?: number): PriKind {
  if (p === 3) return 'red'
  if (p === 2) return 'orange'
  return 'yellow'
}

function buildResultItems(tools: unknown[] | undefined): ResultItem[] {
  if (!tools?.length) return []
  return tools.map((raw, i) => {
    const t = raw as { tool?: string; input?: Record<string, unknown> }
    const input = t.input ?? {}
    if (t.tool === 'add_todo') {
      const advice = typeof input.claude_advice === 'string' ? input.claude_advice : ''
      return {
        key: `todo-${i}`,
        title: String(input.title || '待办'),
        subtitle: input.due_date
          ? `截止 ${input.due_date}`
          : advice.slice(0, 48) || '已生成待办',
        priority: priorityNumToKind(input.priority as number | undefined),
        Icon: Bell,
      }
    }
    if (t.tool === 'add_schedule') {
      const date = input.start_date || input.date
      return {
        key: `sched-${i}`,
        title: String(input.title || input.event_name || '日程'),
        subtitle: date ? String(date) : '已加入日历',
        priority: 'yellow',
        Icon: Calendar,
      }
    }
    if (t.tool === 'add_health') {
      return {
        key: `health-${i}`,
        title: String(input.title || input.condition || '健康记录'),
        subtitle: String(input.notes || '已记录'),
        priority: 'orange',
        Icon: Heart,
      }
    }
    return {
      key: `other-${i}`,
      title: String(input.title || t.tool || '已整理'),
      subtitle: '已整理',
      priority: 'grey',
      Icon: FileText,
    }
  })
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function resultSummary(tools: unknown[] | undefined): string {
  const items = tools as { tool?: string }[] | undefined
  if (!items?.length) return '整理完成'
  const todoCount = items.filter((t) => t.tool === 'add_todo').length
  const scheduleCount = items.filter((t) => t.tool === 'add_schedule').length
  const healthCount = items.filter((t) => t.tool === 'add_health').length
  const parts: string[] = []
  if (scheduleCount > 0) parts.push(`${scheduleCount} 个事件`)
  if (todoCount > 0) parts.push(`${todoCount} 项待办`)
  if (healthCount > 0) parts.push(`${healthCount} 条健康记录`)
  return parts.length > 0 ? `已识别 ${parts.join(' · ')}` : '整理完成'
}

const MODE_TABS: { mode: InputMode; Icon: LucideIcon; label: string }[] = [
  { mode: 'camera', Icon: Camera, label: '拍照' },
  { mode: 'voice', Icon: Mic, label: '录音' },
  { mode: 'text', Icon: Keyboard, label: '文字' },
  { mode: 'file', Icon: FolderUp, label: '文件' },
]

export default function InputSheet({ open, onClose, mode, onModeChange }: InputSheetProps) {
  const pathname = usePathname()
  const router = useRouter()
  const {
    userId,
    sync: ctxSync,
    addTempTodo,
    removeTempTodo,
    speak,
    sessionReady,
    processStatus,
    setProcessStatus,
  } = useApp()

  const [phase, setPhase] = useState<SheetPhase>('input')
  const [processingMessage, setProcessingMessage] = useState('根正在整理中…')
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [resultItems, setResultItems] = useState<ResultItem[]>([])
  const [waveBars, setWaveBars] = useState([16, 24, 12])
  const [cancelZone, setCancelZone] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileDropRef = useRef<HTMLInputElement>(null)
  const pointerStartY = useRef(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const uid = useCallback(
    () => userId || (typeof window !== 'undefined' ? localStorage.getItem('app_user_id') : '') || '',
    [userId],
  )

  const requireLogin = useCallback(() => {
    if (userId) return false
    toastRegisterPrompt(
      () => router.push(`/auth?next=${encodeURIComponent(pathname)}`),
      '登录后可保存',
    )
    return true
  }, [userId, router, pathname])

  const resetCapture = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setPendingFile(null)
    setPhase('input')
    setResultItems([])
  }, [previewUrl])

  const handleClose = useCallback(() => {
    resetCapture()
    setInputText('')
    setCancelZone(false)
    setProcessingMessage('根正在整理中…')
    onClose()
  }, [onClose, resetCapture])

  useEffect(() => {
    if (open) {
      setPhase('input')
      setResultItems([])
      setCancelZone(false)
    }
  }, [open, mode])

  useEffect(() => {
    if (!open || !processStatus) return
    if (processStatus.status === 'processing') {
      setPhase('processing')
      if (mode === 'voice') {
        setProcessingMessage('根正在聆听整理中…')
      } else {
        setProcessingMessage('根正在整理中…')
      }
    } else if (processStatus.status === 'done') {
      setPhase('result')
      setResultItems(buildResultItems(processStatus.tools))
    } else if (processStatus.status === 'failed') {
      toast('整理失败，请重试', 'error')
      setPhase('input')
    }
  }, [processStatus, open, mode])

  const { uploading, uploadStatus, upload } = useUpload(uid(), () => {
    ctxSync()
  })

  useEffect(() => {
    if (uploadStatus === 'error' && phase === 'processing') {
      setPhase('input')
      toast('上传失败，请重试', 'error')
    }
  }, [uploadStatus, phase])

  const { isRecording, recordingSeconds, startRecording, stopRecording, cancelRecording } =
    useRecorder(async (blob, filename) => {
      if (!sessionReady) return
      setPhase('processing')
      setProcessingMessage('根正在聆听整理中…')
      setProcessStatus({ status: 'processing', message: '根正在聆听整理中…' })
      await upload(blob, 'audio', filename)
    })

  useEffect(() => {
    if (!isRecording) return
    const id = setInterval(() => {
      setWaveBars([
        8 + Math.random() * 24,
        8 + Math.random() * 24,
        8 + Math.random() * 24,
      ])
    }, 200)
    return () => clearInterval(id)
  }, [isRecording])

  const submitFile = useCallback(
    async (file: File, skipPreview = false) => {
      if (requireLogin()) return
      if (!sessionReady) return
      const category = file.type.startsWith('image/')
        ? 'image'
        : file.type === 'application/pdf'
          ? 'document'
          : 'other'

      if (file.type.startsWith('image/') && !skipPreview && mode === 'camera') {
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setPreviewUrl(URL.createObjectURL(file))
        setPendingFile(file)
        setPhase('preview')
        return
      }

      setPhase('processing')
      setProcessingMessage('根正在整理中…')
      setProcessStatus({ status: 'processing', message: '根正在整理中…' })
      await upload(file, category)
    },
    [requireLogin, sessionReady, mode, previewUrl, upload, setProcessStatus],
  )

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    void submitFile(file, mode === 'file')
  }

  const handlePreviewSubmit = async () => {
    if (!pendingFile) return
    setPhase('processing')
    setProcessingMessage('根正在整理中…')
    setProcessStatus({ status: 'processing', message: '根正在整理中…' })
    const category = pendingFile.type.startsWith('image/') ? 'image' : 'document'
    await upload(pendingFile, category)
  }

  const sendCommand = async () => {
    if (!inputText.trim() || sending) return
    if (requireLogin()) return
    if (!sessionReady) return
    setSending(true)
    const content = inputText.trim()
    const tempId = addTempTodo(content)
    setInputText('')
    speak('已收到，根正在处理')
    setPhase('processing')
    setProcessingMessage('根正在整理中…')
    setProcessStatus({ status: 'processing', message: '根正在整理中…' })

    try {
      const headers = await getJsonAuthHeaders()
      if (!headers.Authorization) {
        toast('登录已过期，请重新登录', 'info')
        window.location.href = '/auth'
        removeTempTodo(tempId)
        setPhase('input')
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
              const {
                data: { session },
              } = await createClient().auth.getSession()
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
        setPhase('input')
      }
    } catch (e) {
      logOrAlertNetworkError(e)
      removeTempTodo(tempId)
      setPhase('input')
    } finally {
      setSending(false)
    }
  }

  const onMicPointerDown = async (e: React.PointerEvent) => {
    if (requireLogin()) return
    if (!sessionReady || isRecording) return
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    pointerStartY.current = e.clientY
    setCancelZone(false)
    await startRecording()
  }

  const onMicPointerMove = (e: React.PointerEvent) => {
    if (!isRecording) return
    setCancelZone(pointerStartY.current - e.clientY > 60)
  }

  const onMicPointerUp = () => {
    if (!isRecording) return
    if (cancelZone) {
      cancelRecording()
      setCancelZone(false)
    } else {
      stopRecording()
    }
  }

  const adjustTextarea = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  const showModeTabs = phase === 'input' || phase === 'preview'
  const sheetBottom = `calc(env(safe-area-inset-bottom, 0px) + var(--keyboard-height, 0px))`

  const renderProcessing = () => (
    <div style={{ padding: '30px 0 36px', textAlign: 'center' }}>
      <div
        className="gc-spin"
        style={{
          width: 46,
          height: 46,
          margin: '0 auto 18px',
          borderRadius: '50%',
          border: '2.5px solid var(--clay-tint)',
          borderTopColor: CLAY,
        }}
      />
      <p style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: 15, color: FG2, margin: 0 }}>
        {processingMessage}
      </p>
    </div>
  )

  const renderResult = () => (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          color: JADE,
          justifyContent: 'center',
          marginBottom: 4,
        }}
      >
        <Check size={17} color={JADE} />
        <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 16, color: FG1 }}>
          根帮你整理好了
        </span>
      </div>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          color: FG3,
          textAlign: 'center',
          margin: '0 0 16px',
        }}
      >
        {resultSummary(processStatus?.tools)}
      </p>
      {resultItems.map((r) => (
        <div
          key={r.key}
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            background: 'var(--paper, #fcfaf7)',
            borderRadius: 15,
            padding: '13px 15px',
            marginBottom: 9,
            boxShadow: '0 4px 18px rgba(45,50,47,0.03)',
          }}
        >
          <span style={{ color: CLAY }}>
            <r.Icon size={19} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: 'var(--font-serif)',
                fontWeight: 500,
                fontSize: 14,
                color: FG1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {r.title}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: FG3, marginTop: 2 }}>
              {r.subtitle}
            </div>
          </div>
          <PriChip kind={r.priority} />
        </div>
      ))}
      {resultItems.length === 0 && (
        <p style={{ textAlign: 'center', fontSize: 13, color: FG2, margin: '8px 0 16px' }}>
          {processStatus?.message || '整理完成'}
        </p>
      )}
      <button
        type="button"
        className="gc-btn"
        onClick={() => {
          ctxSync()
          handleClose()
        }}
        style={{ width: '100%', marginTop: 10 }}
      >
        好的，谢谢根
      </button>
    </>
  )

  const renderCameraInput = () => (
    <div style={{ textAlign: 'center', padding: '8px 0 12px' }}>
      <Camera size={64} color={CLAY} style={{ margin: '0 auto 16px' }} />
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: FG2, margin: '0 0 24px' }}>
        拍学校通知、病历、账单、证件
      </p>
      <div style={{ display: 'flex', gap: 11 }}>
        <button
          type="button"
          className="gc-btn gc-btn--ghost"
          style={{ flex: 1 }}
          disabled={!sessionReady}
          onClick={() => {
            if (requireLogin()) return
            fileInputRef.current?.click()
          }}
        >
          选择照片
        </button>
        <button
          type="button"
          className="gc-btn"
          style={{ flex: 1 }}
          disabled={!sessionReady}
          onClick={() => {
            if (requireLogin()) return
            cameraInputRef.current?.click()
          }}
        >
          拍照
        </button>
      </div>
    </div>
  )

  const renderCameraPreview = () => (
    <>
      {previewUrl && (
        <img
          src={previewUrl}
          alt="预览"
          style={{ width: '100%', borderRadius: 16, display: 'block', marginBottom: 18 }}
        />
      )}
      <div style={{ display: 'flex', gap: 11 }}>
        <button type="button" className="gc-btn gc-btn--ghost" style={{ flex: 1 }} onClick={resetCapture}>
          重拍
        </button>
        <button
          type="button"
          className="gc-btn"
          style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          disabled={uploading || !pendingFile}
          onClick={() => void handlePreviewSubmit()}
        >
          交给根整理 <Sparkles size={15} />
        </button>
      </div>
    </>
  )

  const renderVoice = () => (
    <div style={{ textAlign: 'center', padding: '12px 0 8px', position: 'relative' }}>
      {cancelZone && (
        <div
          style={{
            position: 'absolute',
            top: -8,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(220,38,38,0.12)',
            color: '#dc2626',
            borderRadius: 12,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          🗑️ 松开取消
        </div>
      )}
      {!isRecording ? (
        <>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'var(--clay-tint)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px',
            }}
          >
            <Mic size={36} color={CLAY} />
          </div>
          <p style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 15, color: FG1, margin: '0 0 8px' }}>
            按住说话，松开发送
          </p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: FG3, margin: 0 }}>
            说什么都行，根来帮你整理成待办和日程
          </p>
        </>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: 6,
              height: 40,
              margin: '0 auto 18px',
            }}
          >
            {waveBars.map((h, i) => (
              <div
                key={i}
                style={{
                  width: 8,
                  height: h,
                  borderRadius: 4,
                  background: CLAY,
                  transition: 'height 0.2s ease',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#dc2626',
                display: 'inline-block',
              }}
            />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, color: FG1 }}>
              {formatTimer(recordingSeconds)}
            </span>
          </div>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: FG3, margin: 0 }}>
            松开发送 / 上滑取消
          </p>
        </>
      )}
      <button
        type="button"
        aria-label="按住录音"
        disabled={!sessionReady}
        onPointerDown={(e) => void onMicPointerDown(e)}
        onPointerMove={onMicPointerMove}
        onPointerUp={onMicPointerUp}
        onPointerCancel={onMicPointerUp}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0,
          cursor: sessionReady ? 'pointer' : 'not-allowed',
          touchAction: 'none',
        }}
      />
    </div>
  )

  const renderText = () => (
    <div style={{ position: 'relative', padding: '4px 0 8px' }}>
      <textarea
        ref={textareaRef}
        value={inputText}
        onChange={(e) => {
          setInputText(e.target.value)
          adjustTextarea()
        }}
        onInput={adjustTextarea}
        placeholder="说什么都行，比如：明天孩子要带游泳包…"
        rows={3}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          border: '1px solid rgba(45,50,47,0.1)',
          borderRadius: 16,
          padding: '14px 48px 14px 14px',
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: FG1,
          background: '#fff',
          resize: 'none',
          outline: 'none',
          lineHeight: 1.5,
          minHeight: 88,
        }}
      />
      <button
        type="button"
        aria-label="发送"
        disabled={!inputText.trim() || sending || !sessionReady}
        onClick={() => void sendCommand()}
        style={{
          position: 'absolute',
          right: 10,
          bottom: 18,
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: 'none',
          background: inputText.trim() ? CLAY : 'rgba(45,50,47,0.12)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: inputText.trim() && !sending ? 'pointer' : 'default',
          opacity: inputText.trim() ? 1 : 0.5,
          transition: 'background 0.2s',
        }}
      >
        <Send size={16} />
      </button>
    </div>
  )

  const renderFile = () => (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (requireLogin()) return
        fileDropRef.current?.click()
      }}
      onKeyDown={(e) => e.key === 'Enter' && fileDropRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const file = e.dataTransfer.files?.[0]
        if (file) void submitFile(file, true)
      }}
      style={{
        border: '2px dashed rgba(45,50,47,0.18)',
        borderRadius: 16,
        padding: '36px 20px',
        textAlign: 'center',
        cursor: sessionReady ? 'pointer' : 'not-allowed',
        opacity: sessionReady ? 1 : 0.6,
        margin: '8px 0',
      }}
    >
      <FolderUp size={40} color={CLAY} style={{ margin: '0 auto 12px' }} />
      <p style={{ fontFamily: 'var(--font-serif)', fontSize: 14, fontWeight: 500, color: FG1, margin: '0 0 6px' }}>
        点击上传或拖拽文件
      </p>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: FG3, margin: 0 }}>
        支持 PDF、图片、文档
      </p>
    </div>
  )

  const renderContent = () => {
    if (phase === 'processing') return renderProcessing()
    if (phase === 'result') return renderResult()

    if (mode === 'camera') {
      if (phase === 'preview') return renderCameraPreview()
      return renderCameraInput()
    }
    if (mode === 'voice') return renderVoice()
    if (mode === 'text') return renderText()
    return renderFile()
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
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
      <input
        ref={fileDropRef}
        type="file"
        accept="image/*,application/pdf,.doc,.docx"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        <div
          role="presentation"
          onClick={handleClose}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(45,50,47,0.36)',
            opacity: open ? 1 : 0,
            transition: 'opacity 0.3s',
          }}
        />
        <motion.div
          initial={false}
          animate={{ y: open ? 0 : '100%' }}
          transition={{ duration: 0.42, ease: SHEET_EASE }}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: sheetBottom,
            background: '#fbf9f6',
            borderRadius: '28px 28px 0 0',
            boxShadow: '0 -10px 60px rgba(0,0,0,0.18)',
            padding: '10px 22px 18px',
            maxHeight: '85vh',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              width: 38,
              height: 4,
              borderRadius: 2,
              background: 'rgba(45,50,47,0.16)',
              margin: '0 auto 14px',
            }}
          />

          {phase !== 'processing' && phase !== 'result' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontWeight: 600,
                  fontSize: 18,
                  color: FG1,
                  margin: 0,
                }}
              >
                告诉根
              </h3>
              <button
                type="button"
                aria-label="关闭"
                onClick={handleClose}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  padding: 4,
                  cursor: 'pointer',
                  color: FG3,
                  display: 'flex',
                }}
              >
                <X size={20} />
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={`${mode}-${phase}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>

          {showModeTabs && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center',
                marginTop: 20,
                paddingTop: 14,
                borderTop: '1px solid rgba(45,50,47,0.08)',
              }}
            >
              {MODE_TABS.map(({ mode: m, Icon, label }) => {
                const active = mode === m
                return (
                  <button
                    key={m}
                    type="button"
                    aria-label={label}
                    aria-pressed={active}
                    onClick={() => onModeChange(m)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Icon size={22} color={active ? CLAY : FG3} />
                  </button>
                )
              })}
            </div>
          )}
        </motion.div>
      </div>
    </>
  )
}
