'use client'

import { useEffect, useState } from 'react'
import { Camera, ChevronDown } from 'lucide-react'
import nextDynamic from 'next/dynamic'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'
import { CARD, SectionTitle } from './growthShared'
import type { InputMode } from '@/app/components/InputSheet'

const InputSheet = nextDynamic(() => import('@/app/components/InputSheet'), { ssr: false })

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

export default function SchoolNotificationHistory() {
  const [history, setHistory] = useState<SchoolHistoryRecord[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetMode, setSheetMode] = useState<InputMode>('camera')

  useEffect(() => {
    fetchWithAuth('/api/school/history')
      .then((r) => r.json())
      .then((data) => setHistory(data.records || []))
      .catch((e) => console.warn('silent catch:', e))
  }, [])

  const openCamera = () => {
    setSheetMode('camera')
    setSheetOpen(true)
  }

  return (
    <>
      <section style={CARD}>
        <SectionTitle>学校通知历史</SectionTitle>
        <button
          type="button"
          onClick={openCamera}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '14px 16px',
            borderRadius: 14,
            border: 'none',
            background: 'var(--clay)',
            color: '#fff',
            fontFamily: 'var(--font-serif)',
            fontSize: 15,
            fontWeight: 500,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(164,99,85,0.25)',
            marginBottom: history.length > 0 ? 16 : 0,
          }}
        >
          <Camera size={18} />
          拍照上传学校通知
        </button>

        {history.length === 0 ? (
          <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--fg3)', lineHeight: 1.6 }}>
            还没有解析记录，拍一张学校通知试试吧
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                    background: 'var(--canvas-light)',
                    borderRadius: 14,
                    padding: '14px 16px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: 'var(--fg1)',
                        fontFamily: 'var(--font-serif)',
                        marginBottom: 4,
                      }}>
                        {record.subject || '学校通知'}
                      </div>
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 12,
                        fontSize: 12,
                        color: 'var(--fg3)',
                        fontFamily: 'var(--font-body)',
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
                        color: 'var(--fg3)',
                        flexShrink: 0,
                        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </div>
                  {expanded ? (
                    <div style={{
                      marginTop: 12,
                      paddingTop: 12,
                      borderTop: '1px solid rgba(45,50,47,0.08)',
                      fontSize: 13,
                      lineHeight: 1.75,
                      color: 'var(--fg2)',
                      fontFamily: 'var(--font-body)',
                    }}>
                      {record.from_email ? (
                        <p style={{ margin: '0 0 6px' }}>来源：{record.from_email}</p>
                      ) : null}
                      <p style={{ margin: '0 0 6px' }}>
                        渠道：{SOURCE_LABELS[record.source || ''] || record.source || '未知'}
                      </p>
                      <p style={{ margin: 0 }}>
                        {record.processed_at
                          ? `处理时间：${new Date(record.processed_at).toLocaleString('zh-CN')}`
                          : null}
                      </p>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {sheetOpen ? (
        <InputSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          mode={sheetMode}
          onModeChange={setSheetMode}
        />
      ) : null}
    </>
  )
}
