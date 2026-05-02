'use client'
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, FileText, ShoppingCart, Plane, Pill, Building2, BookOpen, ChevronRight } from 'lucide-react'
import BottomSheet from './_components/BottomSheet'
import { THEME, PRIORITY_CFG } from './_constants/theme'
import type { TodoItem } from './_types'

const catIcon: Record<string, React.ReactNode> = {
  compliance: <FileText size={13} />, medical: <Pill size={13} />,
  education: <BookOpen size={13} />, shopping: <ShoppingCart size={13} />,
  mobility: <Plane size={13} />, estate: <Building2 size={13} />,
}

export default function TodoSheet({ todos, onClose, onAction }: {
  todos: TodoItem[]
  onClose: () => void
  onAction: (t: TodoItem) => void
}) {
  const [filter, setFilter] = useState<'all' | 'today' | 'delegated'>('all')

  const redCount = todos.filter(t => t.priority === 'red').length

  const list = (
    filter === 'today'     ? todos.filter(t => t.due_date === new Date().toISOString().split('T')[0])
    : filter === 'delegated' ? todos.filter(t => t.delegated_to)
    : todos
  ).sort((a, b) => {
    const o: Record<string, number> = { red: 0, orange: 1, yellow: 2, green: 3, blue: 4, grey: 5 }
    return (o[a.priority] ?? 5) - (o[b.priority] ?? 5)
  })

  return (
    <BottomSheet onClose={onClose} title="妈妈待办">
      {redCount > 0 && (
        <div style={{ padding: '10px 14px', borderRadius: 12, marginBottom: 14,
          background: 'rgba(255,100,100,0.09)', border: '1px solid rgba(255,100,100,0.2)',
          fontSize: 13, color: '#CC3333', fontWeight: 600 }}>
          今天有 {redCount} 件必须处理的事
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {(['all', 'today', 'delegated'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 14px', borderRadius: 20,
              border: `1px solid ${filter === f ? THEME.gold : 'rgba(0,0,0,0.1)'}`,
              fontSize: 12, cursor: 'pointer',
              background: filter === f ? 'rgba(176,141,87,0.09)' : 'transparent',
              color: filter === f ? THEME.gold : THEME.muted, fontWeight: 600 }}>
            {{ all: '全部', today: '今天', delegated: '委托中' }[f]}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', opacity: 0.32, padding: '24px 0',
            fontSize: 13, color: THEME.text }}>
            🌸 暂无待办
          </div>
        ) : list.map(todo => {
          const c = PRIORITY_CFG[todo.priority] || PRIORITY_CFG.grey
          return (
            <div key={todo.id} style={{ padding: '12px 14px', borderRadius: 14,
              background: c.bg, borderLeft: `3px solid ${c.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ color: THEME.muted }}>
                      {catIcon[todo.category || ''] || <Clock size={13} />}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: THEME.text }}>
                      {todo.title}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: c.border, fontWeight: 600 }}>
                    {c.label}
                    {todo.due_date     ? ` · ${todo.due_date}`            : ''}
                    {todo.delegated_to ? ` · 委托给${todo.delegated_to}` : ''}
                  </div>
                  {todo.ai_draft && (
                    <div style={{ marginTop: 7, padding: '7px 10px', borderRadius: 8,
                      background: 'rgba(255,255,255,0.55)',
                      border: '1px solid rgba(0,0,0,0.06)',
                      fontSize: 12, color: THEME.muted, fontStyle: 'italic' }}>
                      AI草稿：{todo.ai_draft.substring(0, 50)}…
                    </div>
                  )}
                </div>
                <motion.button whileTap={{ scale: 0.92 }} onClick={() => onAction(todo)}
                  style={{ padding: '7px 13px', borderRadius: 10, border: 'none',
                    background: c.border, color: '#fff', fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  一键办
                </motion.button>
              </div>
            </div>
          )
        })}
      </div>

      <motion.button whileTap={{ scale: 0.97 }}
        onClick={() => window.location.href = '/rian'}
        style={{ width: '100%', marginTop: 18, padding: '13px', borderRadius: 16,
          border: '1px solid rgba(176,141,87,0.25)', background: 'rgba(176,141,87,0.08)',
          fontSize: 13, color: THEME.gold, fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        去日安添加新事项 <ChevronRight size={14} />
      </motion.button>
    </BottomSheet>
  )
}
