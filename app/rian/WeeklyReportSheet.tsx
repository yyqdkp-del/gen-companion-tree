'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Check, Loader, ChevronDown, ImageIcon } from 'lucide-react'
import { FLOAT_SHEET_BOTTOM } from '@/app/_shared/_constants/layout'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'
import { exportLetterShareImage, shareOrDownloadLetterImage } from '@/lib/growth/exportLetterImage'
import { track } from '@/lib/analytics/track'
import { toast } from '@/app/components/Toast'
import { useApp } from '@/app/context/AppContext'

type ReportContent = {
  letter?: string
  achievements?: string[]
  week_summary?: string
  week_label?: string
  child_name?: string
  no_data?: boolean
  family?: boolean
}

type Props = {
  childId: string
  childName: string
  onClose: () => void
}

const PAPER = 'var(--canvas-mist)'
const CLAY = 'var(--clay, #a46355)'
const INK = 'var(--fg1)'
const LETTER_STAMP = '根陪伴 · 成长家书'
const FOOTER_TAGLINE = '根陪伴 · 陪你在异乡'

export default function WeeklyReportSheet({
  childId,
  childName,
  onClose,
}: Props) {
  const { kids } = useApp()
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState<ReportContent | null>(null)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [reportMode, setReportMode] = useState<'child' | 'family'>('child')
  const [momentsOpen, setMomentsOpen] = useState(false)

  const handleGenerate = useCallback(async (opts?: { family?: boolean }) => {
    const family = opts?.family === true
    if (!family && !childId) {
      setError('请先选择孩子')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setReportMode(family ? 'family' : 'child')
    setMomentsOpen(false)

    try {
      const res = await fetchWithAuth('/api/growth/weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          family ? { family: true } : { child_id: childId },
        ),
      })
      const data = await res.json()
      if (data.content?.no_data || data.error === 'no_data') {
        setContent(data.content || { no_data: true, family })
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
        page: '/growth',
        meta: { child_id: family ? undefined : childId, family },
      })
    } catch (e) {
      if (!logOrAlertNetworkError(e)) setError('网络异常，请稍后再试')
    } finally {
      setLoading(false)
    }
  }, [childId])

  useEffect(() => {
    if (childId) void handleGenerate({ family: false })
    else if (kids.length > 1) void handleGenerate({ family: true })
  }, [childId, kids.length, handleGenerate])

  const displayName = reportMode === 'family'
    ? (content?.child_name || '家人')
    : childName

  const weekLabel = content?.week_label || ''

  const handleCopy = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      void track({
        event_type: 'weekly_report_shared',
        page: '/growth',
        meta: { child_id: reportMode === 'family' ? undefined : childId, family: reportMode === 'family', method: 'link' },
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('复制失败，请手动复制链接', 'error')
    }
  }

  const handleExportImage = async () => {
    if (!content?.letter?.trim()) return
    setExporting(true)
    try {
      const blob = await exportLetterShareImage({
        childName: displayName,
        weekLabel,
        letter: content.letter,
        achievements: content.achievements,
      })
      const filename = `成长家书-${displayName}-${Date.now()}.png`
      await shareOrDownloadLetterImage(blob, filename)
      void track({
        event_type: 'weekly_report_shared',
        page: '/growth',
        meta: { child_id: reportMode === 'family' ? undefined : childId, family: reportMode === 'family', method: 'image' },
      })
      toast('分享图片已生成', 'success')
    } catch (e) {
      if (!logOrAlertNetworkError(e)) toast('图片生成失败，请重试', 'error')
    } finally {
      setExporting(false)
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
        background: 'rgba(45,50,47,0.32)',
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
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 430,
          margin: '0 10px',
          background: PAPER,
          borderRadius: '28px 28px 0 0',
          overflow: 'hidden',
          maxHeight: '88dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{
          height: 4,
          flexShrink: 0,
          background: 'linear-gradient(90deg, #e6a89e, #8ca88d)',
        }} />

        <div style={{
          padding: '14px 18px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 17,
            fontWeight: 600,
            color: INK,
            fontFamily: 'var(--font-serif)',
            letterSpacing: '0.04em',
          }}>
            成长家书
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {kids.length > 1 && !loading && (
              <button
                type="button"
                onClick={() => void handleGenerate({ family: true })}
                style={{
                  background: 'rgba(164,99,85,0.08)',
                  color: CLAY,
                  border: '1px solid rgba(164,99,85,0.2)',
                  borderRadius: 12,
                  padding: '6px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                }}
              >
                全家版
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="关闭" style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}>
              <X size={18} color="var(--fg3)" />
            </button>
          </div>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          padding: '16px 18px 0',
        }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--fg3)' }}>
              <Loader size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
              <div style={{ fontSize: 13, fontFamily: 'var(--font-body)' }}>根正在写成长家书…</div>
            </div>
          )}

          {!loading && error && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <p style={{ fontSize: 13, color: CLAY, marginBottom: 12 }}>{error}</p>
              <button type="button" className="gc-btn" onClick={() => void handleGenerate({ family: reportMode === 'family' })}>
                重试
              </button>
            </div>
          )}

          {!loading && !error && content?.no_data && (
            <div style={{ textAlign: 'center', padding: '32px 12px' }}>
              <p style={{ fontSize: 14, color: 'var(--fg2)', marginBottom: 8, lineHeight: 1.6, fontFamily: 'var(--font-body)' }}>
                本周暂无记录，先去学一个汉字或完成一个待办吧
              </p>
              <p style={{ fontSize: 12, color: 'var(--fg3)', fontFamily: 'var(--font-body)' }}>
                记录孩子的学习和生活后，根会帮你写成长家书
              </p>
            </div>
          )}

          {!loading && !error && content && !content.no_data && (
            <>
              <div style={{
                background: '#fff',
                borderRadius: 'var(--r-xl)',
                padding: 24,
                boxShadow: 'var(--sh-warm)',
                marginBottom: 14,
              }}>
                <div style={{
                  textAlign: 'center',
                  fontSize: 11,
                  letterSpacing: '0.2em',
                  color: CLAY,
                  marginBottom: 6,
                  fontFamily: 'var(--font-body)',
                }}>
                  {LETTER_STAMP}
                </div>
                {weekLabel ? (
                  <div style={{
                    textAlign: 'center',
                    fontFamily: 'var(--font-serif)',
                    fontSize: 12,
                    color: 'var(--fg3)',
                    marginBottom: 20,
                  }}>
                    {weekLabel}
                  </div>
                ) : null}
                <p style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 16,
                  fontWeight: 300,
                  lineHeight: 2.0,
                  color: INK,
                  letterSpacing: '0.05em',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {content.letter?.trim() || '本周暂无家书内容'}
                </p>
              </div>

              {content.achievements && content.achievements.length > 0 ? (
                <div style={{ marginBottom: 8 }}>
                  <button
                    type="button"
                    onClick={() => setMomentsOpen((v) => !v)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      border: 'none',
                      background: 'transparent',
                      padding: '8px 4px',
                      cursor: 'pointer',
                    }}
                  >
                    <span className="gc-eyebrow" style={{ margin: 0, color: CLAY }}>这周的小瞬间</span>
                    <ChevronDown
                      size={16}
                      color="var(--fg3)"
                      style={{
                        transform: momentsOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {momentsOpen ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '4px 4px 12px' }}>
                          {content.achievements.map((a, i) => (
                            <div key={i} style={{
                              display: 'flex',
                              gap: 10,
                              alignItems: 'flex-start',
                              marginBottom: 8,
                              fontFamily: 'var(--font-body)',
                              fontSize: 14,
                              color: 'var(--fg2)',
                              lineHeight: 1.55,
                            }}>
                              <span style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: CLAY,
                                flexShrink: 0,
                                marginTop: 8,
                              }} />
                              <span>{a}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              ) : null}

              <p style={{
                fontSize: 11,
                color: 'var(--fg3)',
                textAlign: 'center',
                lineHeight: 1.6,
                margin: '8px 0 0',
                fontFamily: 'var(--font-body)',
                letterSpacing: '0.12em',
              }}>
                {FOOTER_TAGLINE}
              </p>
            </>
          )}
        </div>

        {shareUrl && !loading && !error && content && !content.no_data && (
          <div style={{
            padding: '12px 18px',
            paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
            borderTop: '1px solid var(--line)',
            flexShrink: 0,
          }}>
            <button
              type="button"
              disabled={exporting}
              onClick={() => void handleExportImage()}
              className="gc-btn"
              style={{
                width: '100%',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: exporting ? 0.75 : 1,
                cursor: exporting ? 'wait' : 'pointer',
              }}
            >
              {exporting ? <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <ImageIcon size={18} />}
              {exporting ? '生成中…' : '生成分享图片'}
            </button>
            <button
              type="button"
              className="gc-btn gc-btn--ghost"
              onClick={() => void handleCopy()}
              style={{ width: '100%', marginBottom: 8 }}
            >
              {copied ? <Check size={16} style={{ marginRight: 6 }} /> : <Copy size={16} style={{ marginRight: 6 }} />}
              {copied ? '链接已复制' : '复制链接'}
            </button>
            <p style={{
              fontSize: 11,
              color: 'var(--fg3)',
              textAlign: 'center',
              lineHeight: 1.6,
              margin: 0,
              fontFamily: 'var(--font-body)',
            }}>
              链接7天有效，爷奶无需登录
            </p>
          </div>
        )}
      </motion.div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  )
}
