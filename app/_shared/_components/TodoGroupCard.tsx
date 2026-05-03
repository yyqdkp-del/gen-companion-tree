'use client'
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, FileText, ShoppingCart, Plane, Pill, Building2, BookOpen } from 'lucide-react'
import Accordion from './Accordion'
import { THEME, PRIORITY_CFG } from '../_constants/theme'
import type { TodoItem } from '../_types'

const catIcon: Record<string, React.ReactNode> = {
  compliance: <FileText size={13} />, medical: <Pill size={13} />,
  education:  <BookOpen size={13} />, shopping: <ShoppingCart size={13} />,
  mobility:   <Plane size={13} />,   estate:   <Building2 size={13} />,
}

type Props = {
  today: TodoItem[]
  soon:  TodoItem[]
  later: TodoItem[]
  advice: string
  onAction: (t: TodoItem) => void
  onDone: (id: string) => void
}

function TodoRow({ todo, onAction, onDone }: {
  todo: TodoItem
  onAction: (t: TodoItem) => void
  onDone: (id: string) => void
}) {
  const c = PRIORITY_CFG[todo.priority] || PRIORITY_CFG.grey

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.25 } }}
      style={{ padding: '10px 12px', borderRadius: 12, marginBottom: 8,
        background: c.bg, borderLeft: `3px solid ${c.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ color: THEME.muted }}>
              {catIcon[todo.category || ''] || <Clock size={13} />}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>
              {todo.title}
            </span>
          </div>
          <div style={{ fontSize: 10, color: c.border, fontWeight: 600 }}>
            {c.label}
            {todo.due_date     ? ` · ${todo.due_date}`            : ''}
            {todo.delegated_to ? ` · 委托给${todo.delegated_to}` : ''}
          </div>
          {todo.ai_draft && (
            <div style={{ marginTop: 6, padding: '5px 8px', borderRadius: 7,
              background: 'rgba(255,255,255,0.55)',
              border: '1px solid rgba(0,0,0,0.06)',
              fontSize: 11, color: THEME.muted, fontStyle: 'italic' }}>
              AI草稿：{todo.ai_draft.substring(0, 50)}…
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flexShrink: 0 }}>
          <motion.button whileTap={{ scale: 0.92 }} onClick={() => onAction(todo)}
            style={{ padding: '6px 12px', borderRadius: 9, border: 'none',
              background: c.border, color: '#fff', fontSize: 11,
              fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            一键办
          </motion.button>
          <motion.button whileTap={{ scale: 0.92 }} onClick={() => onDone(todo.id)}
            style={{ padding: '6px 12px', borderRadius: 9,
              border: `0.5px solid ${c.border}`,
              background: 'transparent', color: c.border,
              fontSize: 11, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            已完成
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

export default function TodoGroupCard({ today, soon, later, advice, onAction, onDone }: Props) {
  return (
    <div>
      {/* 给妈妈的建议 */}
      {advice && (
        <div style={{ padding: '8px 12px', borderRadius: 10, marginBottom: 12,
          background: 'rgba(176,141,87,0.07)',
          border: '0.5px solid rgba(176,141,87,0.2)',
          fontSize: 12, color: THEME.gold, fontWeight: 500, lineHeight: 1.5 }}>
          {advice}
        </div>
      )}

      {/* 今天必须办 — 默认展开 */}
      <Accordion
        title="⚡ 今天必须办"
        count={today.length}
        defaultOpen={true}
        badge={today.some(t => t.priority === 'red') ? '紧急' : undefined}>
        {today.length === 0 ? (
          <div style={{ fontSize: 12, color: THEME.muted, opacity: 0.5,
            textAlign: 'center', padding: '8px 0' }}>
            今天没有紧急事项 🌸
          </div>
        ) : (
          <AnimatePresence>
            {today.map(t => (
              <TodoRow key={t.id} todo={t} onAction={onAction} onDone={onDone} />
            ))}
          </AnimatePresence>
        )}
      </Accordion>

      {/* 近期跟进 — 默认折叠 */}
      <Accordion
        title="🕐 近期跟进"
        count={soon.length}
        defaultOpen={false}>
        {soon.length === 0 ? (
          <div style={{ fontSize: 12, color: THEME.muted, opacity: 0.5,
            textAlign: 'center', padding: '8px 0' }}>
            3天内没有待跟进事项
          </div>
        ) : (
          <AnimatePresence>
            {soon.map(t => (
              <TodoRow key={t.id} todo={t} onAction={onAction} onDone={onDone} />
            ))}
          </AnimatePresence>
        )}
      </Accordion>

      {/* 放心里 — 默认折叠 */}
      <Accordion
        title="📋 放心里"
        count={later.length}
        defaultOpen={false}>
        {later.length === 0 ? (
          <div style={{ fontSize: 12, color: THEME.muted, opacity: 0.5,
            textAlign: 'center', padding: '8px 0' }}>
            本月没有其他事项
          </div>
        ) : (
          <AnimatePresence>
            {later.map(t => (
              <TodoRow key={t.id} todo={t} onAction={onAction} onDone={onDone} />
            ))}
          </AnimatePresence>
        )}
      </Accordion>
    </div>
  )
}
