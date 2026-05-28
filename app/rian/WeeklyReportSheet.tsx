'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { X, Copy, Check, Loader } from 'lucide-react'
import { THEME } from '@/app/_shared/_constants/theme'
import { FLOAT_SHEET_BOTTOM } from '@/app/_shared/_constants/layout'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'
import { track } from '@/lib/analytics/track'
import { toast } from '@/app/components/Toast'

type ReportContent = {
  letter?: string
  achievements?: string[]
  week_summary?: string
  child_name?: string
  no_data?: boolean
}

type Props = {
  childId: string
  childName: string
  onClose: () => void
}

export default function WeeklyReportSheet({ childId, childName, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState<ReportContent | null>(null)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [isProUser, setIsProUser] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const limitRes = await fetchWithAuth('/api/pro/status')
      const limitData = await limitRes.json().catch(() => ({}))
      if (limitData.is_pro) {
        setIsProUser(true)
      } else {
        setIsProUser(false)
      }
      const res = await fetchWithAuth('/api/growth/weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId }),
      })
      const data = await res.json()
      if (data.content?.no_data || data.error === 'no_data') {
        setContent(data.content || { no_data: true })
        setShareUrl('')
        return
      }
      if (!res.ok) {
        setError(data.message || data.error || '生成失败，请稍后再试')
        return
      }
      setContent(data.content || null)
      setShareUrl(data.share_url || '')
      void track({
        event_type: 'weekly_report_generated',
        page: '/rian',
        meta: { child_id: childId },
      })
    } catch (e) {
      if (!logOrAlertNetworkError(e)) setError('网络异常，请稍后再试')
    } finally {
      setLoading(false)
    }
  }, [childId])

  useEffect(() => {
    generate()
  }, [generate])

  const handleCopy = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      void track({
        event_type: 'weekly_report_shared',
        page: '/rian',
        meta: { child_id: childId },
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('复制失败，请手动复制链接', 'error')
      try {
        const input = document.createElement('input')
        input.value = shareUrl
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
        setCopied(true)
        void track({
          event_type: 'weekly_report_shared',
          page: '/rian',
          meta: { child_id: childId },
        })
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // keep report visible; user can long-press URL if shown elsewhere
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingBottom: `max(${FLOAT_SHEET_BOTTOM}, max(env(safe-area-inset-bottom), 20px))`,
        background: 'rgba(180,200,210,0.35)',
        backdropFilter: 'blur(6px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 430,
          margin: '0 10px',
          background: 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(40px)',
          borderRadius: '24px 24px 0 0',
          overflow: 'hidden',
          maxHeight: '82dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            height: 4,
            flexShrink: 0,
            background: 'linear-gradient(90deg, rgba(164,99,85,0.6), rgba(92,122,94,0.5))',
          }}
        />
        <div
          style={{
            width: 32,
            height: 4,
            background: 'rgba(0,0,0,0.1)',
            borderRadius: 2,
            margin: '10px auto 0',
          }}
        />

        <div
          style={{
            padding: '12px 16px 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: THEME.text,
              fontFamily: 'serif',
            }}
          >
            成长周报
          </span>
          <motion.button
            type="button"
            whileTap={{ scale: 0.86 }}
            onClick={onClose}
            style={{
              cursor: 'pointer',
              padding: 4,
              border: 'none',
              background: 'transparent',
            }}
          >
            <X size={18} color={THEME.muted} />
          </motion.button>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          padding: '14px 16px 0',
          display: 'flex',
          flexDirection: 'column',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          whiteSpace: 'pre-wrap',
        }}
        >
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: THEME.muted }}>
              <Loader
                size={28}
                style={{
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 12px',
                }}
              />
              <div style={{ fontSize: 13 }}>根正在写本周成长故事…</div>
            </div>
          )}

          {!loading && error && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontSize: 13, color: '#7d3f37', marginBottom: 12 }}>{error}</p>
              <button
                type="button"
                onClick={generate}
                style={{
                  padding: '8px 16px',
                  borderRadius: 20,
                  border: 'none',
                  background: '#8a7355',
                  color: '#fff',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                重试
              </button>
            </div>
          )}

          {!loading && !error && content?.no_data && (
            <motion.div style={{ textAlign: 'center', padding: '32px 12px' }}>
              <p style={{ fontSize: 14, color: THEME.text, marginBottom: 8, lineHeight: 1.6 }}>
                本周暂无记录，先去学一个汉字或完成一个待办吧
              </p>
              <p style={{ fontSize: 12, color: THEME.muted }}>
                记录孩子的学习和生活后，根会帮你写成长周报
              </p>
            </motion.div>
          )}

          {!loading && !error && content && !content.no_data && (
            <>
              <p style={{ fontSize: 12, color: THEME.muted, marginBottom: 10 }}>
                {content.week_summary || `${childName}本周的成长记录`}
              </p>
              <div
                style={{
                  background: 'rgba(164,99,85,0.06)',
                  borderRadius: 14,
                  padding: '14px 16px',
                  marginBottom: 14,
                  border: '1px solid rgba(164,99,85,0.12)',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: '#a46355',
                    marginBottom: 8,
                    letterSpacing: '0.15em',
                  }}
                >
                  💌 妈妈说
                </div>
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.9,
                    color: THEME.text,
                    margin: 0,
                    fontFamily: 'serif',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {content.letter?.trim() || '本周暂无信件内容'}
                </p>
              </div>

              {content.achievements && content.achievements.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#a46355',
                      marginBottom: 8,
                      letterSpacing: '0.15em',
                    }}
                  >
                    这周的小高光
                  </div>
                  {content.achievements.map((a, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 14,
                        color: THEME.text,
                        marginBottom: 6,
                        display: 'flex',
                        gap: 8,
                        minWidth: 0,
                      }}
                    >
                      <span style={{ flexShrink: 0, color: '#a46355' }}>·</span>
                      <span style={{ wordBreak: 'break-word', overflowWrap: 'break-word', minWidth: 0 }}>{a}</span>
                    </div>
                  ))}
                </div>
              )}

            </>
          )}
        </div>

        {shareUrl && !loading && !error && content && (
          <div style={{
            padding: '12px 16px',
            paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
            borderTop: '1px solid rgba(45,50,47,0.06)',
            background: '#fbf9f6',
            flexShrink: 0,
          }}>
            {isProUser ? (
              <>
                <button
                  type="button"
                  onClick={handleCopy}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: 18,
                    border: 'none',
                    background: '#a46355',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? '链接已复制' : '复制微信分享链接'}
                </button>
                <p
                  style={{
                    fontSize: 11,
                    color: THEME.muted,
                    textAlign: 'center',
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  复制后粘贴到微信发给爷爷奶奶，链接 7 天内有效
                </p>
              </>
            ) : (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(164,99,85,0.06)',
                borderRadius: 14,
                border: '1px solid rgba(164,99,85,0.15)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 13, color: '#a46355', fontFamily: 'sans-serif', marginBottom: 8 }}>
                  升级 Pro 解锁分享功能
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/upgrade')}
                  style={{
                    padding: '8px 20px',
                    background: '#a46355',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 13,
                    cursor: 'pointer',
                    fontFamily: "'Noto Serif SC', serif",
                  }}
                >
                  免费试用30天 →
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  )
}
