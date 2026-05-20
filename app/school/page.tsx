'use client'

import { useEffect, useState } from 'react'
import { BookOpen, Camera, ChevronDown, FileText, Sparkles } from 'lucide-react'
import { CHINESE_THEME as T } from '@/app/_shared/_constants/chineseTheme'
import { NAV_HEIGHT_CSS, PAGE_TOP_PADDING } from '@/app/_shared/_constants/layout'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'

const GLASS_CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.8)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderRadius: 18,
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 4px 20px rgba(45,50,47,0.04)',
  padding: '16px 18px',
  marginBottom: 10,
}

type SchoolHistoryRecord = {
  id: string
  subject: string | null
  processed_at: string | null
  todos_created: number | null
  events_created?: number | null
  email_type: string | null
  source?: string | null
  from_email?: string | null
}

const SOURCE_LABELS: Record<string, string> = {
  school_upload: '拍照 / 上传',
  make: '邮件同步',
  mcp_scan: '邮箱扫描',
}

export default function SchoolPage() {
  const [history, setHistory] = useState<SchoolHistoryRecord[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetchWithAuth('/api/school/history')
      .then((r) => r.json())
      .then((data) => setHistory(data.records || []))
      .catch((e) => console.warn('silent catch:', e))
  }, [])

  return (
    <main style={{
      minHeight: '100dvh',
      padding: `${PAGE_TOP_PADDING} 20px ${NAV_HEIGHT_CSS}`,
      backgroundColor: T.bg,
      backgroundImage: `
        radial-gradient(at 80% 10%, rgba(228,237,228,0.35) 0px, transparent 50%),
        radial-gradient(at 15% 85%, rgba(245,214,209,0.25) 0px, transparent 50%)
      `,
      color: T.text,
      fontFamily: 'sans-serif',
    }}>
      <section style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          borderRadius: 999,
          background: 'rgba(164,99,85,0.08)',
          border: '1px solid rgba(164,99,85,0.12)',
          color: T.red,
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 18,
          letterSpacing: '0.05em',
        }}>
          <BookOpen size={15} />
          学校通知整理
        </div>

        <h1 style={{
          margin: '0 0 10px',
          fontSize: 32,
          lineHeight: 1.25,
          letterSpacing: '0.02em',
          color: T.text,
          fontFamily: "'Noto Serif SC', serif",
          fontWeight: 500,
        }}>
          拍一下学校通知，根来帮你拆成待办和校历。
        </h1>

        <p style={{
          margin: '0 0 26px',
          fontSize: 15,
          lineHeight: 1.85,
          color: T.textDim,
        }}>
          适合处理学校邮件截图、纸质通知、校历图片、缴费单和活动单。点击底部右侧相机按钮拍照或上传图片，识别完成后会自动进入日安待办、校历和解析历史。
        </p>

        <div style={{ display: 'grid', gap: 12 }}>
          {[
            { icon: <Camera size={22} />, title: '拍照识别', desc: '用底部右侧相机按钮拍学校通知或校历。' },
            { icon: <FileText size={22} />, title: '自动拆解', desc: '校历事件进孩子日程，需要妈妈行动的事项进待办。' },
            { icon: <Sparkles size={22} />, title: '留下历史', desc: '解析摘要会记录到处理历史，方便之后回看。' },
          ].map((item) => (
            <div key={item.title} style={{
              ...GLASS_CARD,
              display: 'flex',
              gap: 14,
              alignItems: 'flex-start',
              padding: 16,
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'rgba(164,99,85,0.08)',
                border: '1px solid rgba(164,99,85,0.12)',
                color: T.red,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {item.icon}
              </div>
              <div>
                <h2 style={{
                  margin: '2px 0 5px',
                  fontSize: 16,
                  color: T.text,
                  fontFamily: "'Noto Serif SC', serif",
                  fontWeight: 500,
                }}>{item.title}</h2>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: T.textDim }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {history.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{
              fontSize: 10,
              letterSpacing: 3,
              color: '#a46355',
              marginBottom: 12,
              fontFamily: 'sans-serif',
              textTransform: 'uppercase',
            }}>
              📋 解析历史
            </div>
            {history.map((record) => {
              const expanded = expandedId === record.id
              const todos = record.todos_created ?? 0
              const events = record.events_created ?? 0
              return (
                <div
                  key={record.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpandedId(expanded ? null : record.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setExpandedId(expanded ? null : record.id)
                    }
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.8)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 14,
                    padding: '14px 16px',
                    marginBottom: 10,
                    border: '1px solid rgba(255,255,255,0.6)',
                    boxShadow: '0 4px 16px rgba(45,50,47,0.04)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#2d322f',
                        fontFamily: "'Noto Serif SC', serif",
                        marginBottom: 4,
                      }}>
                        {record.subject || '学校通知'}
                      </div>
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 12,
                        fontSize: 12,
                        color: 'rgba(45,50,47,0.5)',
                        fontFamily: 'sans-serif',
                      }}>
                        <span>
                          {record.processed_at
                            ? new Date(record.processed_at).toLocaleDateString('zh-CN')
                            : '—'}
                        </span>
                        {todos > 0 && <span>生成了 {todos} 个待办</span>}
                        {events > 0 && <span>写入 {events} 个校历</span>}
                      </div>
                    </div>
                    <ChevronDown
                      size={18}
                      style={{
                        color: 'rgba(45,50,47,0.35)',
                        flexShrink: 0,
                        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </div>
                  {expanded && (
                    <div style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: '1px solid rgba(164,99,85,0.1)',
                      fontSize: 13,
                      lineHeight: 1.75,
                      color: 'rgba(45,50,47,0.65)',
                    }}>
                      {record.from_email && (
                        <p style={{ margin: '0 0 6px' }}>来源：{record.from_email}</p>
                      )}
                      <p style={{ margin: '0 0 6px' }}>
                        渠道：{SOURCE_LABELS[record.source || ''] || record.source || '未知'}
                      </p>
                      <p style={{ margin: 0 }}>
                        {record.processed_at
                          ? `处理时间：${new Date(record.processed_at).toLocaleString('zh-CN')}`
                          : null}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
