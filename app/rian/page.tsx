'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import nextDynamic from 'next/dynamic'
import { THEME } from '@/app/_shared/_constants/theme'
import { PAGE_BOTTOM_WITH_FLOAT, SAFE_AREA_TOP } from '@/app/_shared/_constants/layout'
import { useTodoActions } from '@/app/_shared/_hooks/useTodoActions'
import { useDiscoveries } from '@/app/_shared/_hooks/useDiscoveries'
const TodoDetailModal = nextDynamic(() => import('./TodoDetailModal'), { ssr: false })
const WeeklyReportSheet = nextDynamic(() => import('./WeeklyReportSheet'), { ssr: false })
import RootDiscoveries from '@/app/rian/RootDiscoveries'
import TodoGroupCard from '@/app/_shared/_components/TodoGroupCard'
import { useApp } from '@/app/context/AppContext'
import ChildSwitcher from '@/app/_shared/_components/child/ChildSwitcher'
import { useTodoEngine } from '@/app/_shared/_hooks/useTodoEngine'
import type { TodoItem } from '@/app/_shared/_types'
import TourGuide, { type TourStep } from '@/app/components/TourGuide'

type Reminder = {
  id: string
  title: string
  description?: string
  category?: string
  urgency_level: number
  due_date?: string
  status: string
  action_url?: string
  action_label?: string
  ai_action_data?: {
    execution_pack?: unknown
    brain_instruction?: unknown
    prepared_at?: string
  }
}

const RIAN_TOUR: TourStep[] = [
  {
    id: 'discover',
    title: '根的发现',
    desc: '邮件、拍照和对话里整理出的重要信息会出现在这里，可一键加入待办。',
    emoji: '✨',
    position: 'top',
  },
  {
    id: 'todo',
    title: '今日待办',
    desc: '按紧急程度分组，点击「一键办」快速处理。',
    emoji: '📋',
    position: 'center',
  },
  {
    id: 'report',
    title: '成长家书',
    desc: '为国内家人生成温暖的成长家书，可分享图片或链接。',
    emoji: '💌',
    position: 'bottom',
    targetHint: '试试底部右侧相机按钮',
  },
]

const getEnergyColor = (v: number) => (v > 70 ? '#8ca88d' : v > 40 ? '#b88e5e' : '#d58074')

export default function RianPage() {
  const [time, setTime] = useState(new Date())
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null)
  const [mounted, setMounted] = useState(false)
  const [showWeeklyReport, setShowWeeklyReport] = useState(false)

  const { userId, kids: ctxKids, todos: ctxTodos, sync: ctxSync, activeKid } = useApp()

  const todosTyped = ctxTodos as TodoItem[]
  const { groups, advice } = useTodoEngine(todosTyped)

  const tempTodos = useMemo(
    () => todosTyped.filter((t) => t._isTemp),
    [todosTyped],
  )

  const todayWithTemp = useMemo(
    () => [...tempTodos, ...groups.today],
    [tempTodos, groups.today],
  )

  const mapTodoToReminder = (t: TodoItem): Reminder => ({
    id: t.id,
    title: t.title,
    description: (t as { description?: string }).description,
    category: t.category,
    urgency_level: t.priority === 'red' ? 3 : t.priority === 'orange' ? 2 : 1,
    due_date: t.due_date,
    status: t.status,
    ai_action_data: t.ai_action_data,
  })

  const actionReminders = useMemo<Reminder[]>(() => {
    const merged = [...tempTodos, ...groups.today, ...groups.soon]
    const seen = new Set<string>()
    return merged
      .filter((t) => {
        if (!t?.id || seen.has(t.id)) return false
        seen.add(t.id)
        return true
      })
      .map(mapTodoToReminder)
  }, [tempTodos, groups.today, groups.soon])

  const {
    items: discoveries,
    loading: discoveriesLoading,
    dismiss,
    addCalendar: addDiscoveryCalendar,
    addReminder: addDiscoveryReminder,
  } = useDiscoveries(userId)

  const handleAddDiscoveryCalendar = async (item: Parameters<typeof addDiscoveryCalendar>[0]) => {
    await addDiscoveryCalendar(item)
    await ctxSync()
  }

  const handleAddDiscoveryReminder = async (item: Parameters<typeof addDiscoveryReminder>[0]) => {
    await addDiscoveryReminder(item)
    await ctxSync()
  }

  useEffect(() => {
    setMounted(true)
    const ticker = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(ticker)
  }, [])

  const childEnergy = activeKid?.energy != null ? activeKid.energy : null
  const showChildEnergy = childEnergy != null

  const { markDone: markDoneAction, snooze: snoozeAction } = useTodoActions(actionReminders, ctxSync)
  const markDone = async (id: string) => {
    await markDoneAction(id)
    setSelectedReminder(null)
  }
  const snooze = async (id: string) => {
    await snoozeAction(id)
    setSelectedReminder(null)
  }

  const hasTodos = todayWithTemp.length > 0 || groups.soon.length > 0 || groups.later.length > 0

  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100dvh',
        backgroundColor: '#fbf9f6',
        backgroundImage: `
        radial-gradient(at 90% 10%, rgba(245,214,209,0.2) 0px, transparent 50%),
        radial-gradient(at 10% 90%, rgba(217,230,218,0.15) 0px, transparent 50%)
      `,
        overflow: 'hidden',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '12%',
          right: '-3%',
          fontSize: 'clamp(60px, 16vw, 120px)',
          fontWeight: 'bold',
          color: THEME.text,
          opacity: 0.07,
          pointerEvents: 'none',
          fontStyle: 'italic',
          whiteSpace: 'nowrap',
          lineHeight: 1,
        }}
      >
        根·陪伴
      </div>

      {/* 左上角：孩子切换 */}
      <div style={{ position: 'absolute', top: `calc(${SAFE_AREA_TOP} + 5%)`, left: '5%', zIndex: 100 }}>
        <ChildSwitcher mode="dropdown" />
        <div
          style={{
            width: 56,
            height: 3,
            background: 'rgba(255,255,255,0.3)',
            borderRadius: 2,
            margin: '8px auto 0',
            overflow: 'hidden',
          }}
        >
          {showChildEnergy ? (
            <motion.div
              animate={{ width: `${childEnergy}%`, backgroundColor: getEnergyColor(childEnergy) }}
              style={{ height: '100%' }}
            />
          ) : (
            <div style={{ width: '30%', height: '100%', background: 'rgba(45,50,47,0.12)', borderRadius: 2 }} />
          )}
        </div>
        {!showChildEnergy && (
          <p style={{ marginTop: 4, fontSize: 10, color: THEME.muted, textAlign: 'center' }}>—</p>
        )}
      </div>

      <header
        style={{
          position: 'absolute',
          top: `calc(${SAFE_AREA_TOP} + 5%)`,
          right: '5%',
          zIndex: 50,
          textAlign: 'right',
        }}
      >
        <h1
          style={{
            fontSize: 'clamp(48px, 14vw, 72px)',
            fontWeight: 100,
            color: THEME.text,
            opacity: 0.9,
            lineHeight: 1,
            margin: 0,
          }}
        >
          {mounted
            ? `${time.getHours()}:${time.getMinutes() < 10 ? `0${time.getMinutes()}` : time.getMinutes()}`
            : '--:--'}
        </h1>
        <p style={{ fontSize: 10, color: THEME.text, opacity: 0.35, letterSpacing: '0.25em', marginTop: 3 }}>
          日安指挥中心
        </p>
      </header>

      <div
        style={{
          position: 'absolute',
          top: `calc(${SAFE_AREA_TOP} + 18vh)`,
          left: 0,
          right: 0,
          bottom: PAGE_BOTTOM_WITH_FLOAT,
          overflowY: 'auto',
          zIndex: 25,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* 区块1：根的发现 */}
        <RootDiscoveries
          items={discoveries}
          loading={discoveriesLoading}
          onAddCalendar={handleAddDiscoveryCalendar}
          onAddReminder={handleAddDiscoveryReminder}
          onDismiss={dismiss}
        />

        {/* 区块2：今日待办 */}
        <section style={{ padding: '0 16px', marginBottom: 20 }}>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 600,
              fontSize: 16,
              color: '#2d322f',
              margin: '0 0 12px',
            }}
          >
            今日待办
          </h2>
          {hasTodos ? (
            <TodoGroupCard
              today={todayWithTemp}
              soon={groups.soon}
              later={groups.later}
              advice={advice}
              onAction={(t) => setSelectedReminder(mapTodoToReminder(t))}
              onDone={markDone}
            />
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '32px 16px',
                color: 'rgba(45,50,47,0.35)',
                fontSize: 14,
                fontFamily: 'var(--font-body)',
              }}
            >
              今日清闲，说点什么让根记下来？
            </div>
          )}
        </section>

        {/* 区块3：成长家书 */}
        {activeKid && (
          <div style={{ padding: '0 16px 24px' }}>
            <motion.div
              role="button"
              tabIndex={0}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowWeeklyReport(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setShowWeeklyReport(true)
              }}
              style={{
                background: 'linear-gradient(135deg, #d9e6da, #8ca88d)',
                borderRadius: 18,
                padding: '18px 18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                minWidth: 0,
                boxShadow: '0 8px 28px rgba(92,122,94,0.25)',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: 16,
                    fontWeight: 600,
                    color: '#fff',
                    marginBottom: 4,
                  }}
                >
                  成长家书
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.85)',
                    lineHeight: 1.45,
                  }}
                >
                  为国内家人生成温暖的周报
                </div>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                生成 →
              </span>
            </motion.div>
          </div>
        )}
      </div>

      <TodoDetailModal
        reminder={selectedReminder}
        userId={userId || ''}
        onClose={() => setSelectedReminder(null)}
        onDone={markDone}
        onSnooze={snooze}
        onSync={ctxSync}
      />

      <AnimatePresence>
        {showWeeklyReport && (activeKid?.id || ctxKids.length > 1) && (
          <WeeklyReportSheet
            childId={activeKid?.id || ''}
            childName={activeKid?.name || '宝宝'}
            onClose={() => setShowWeeklyReport(false)}
          />
        )}
      </AnimatePresence>

      <TourGuide tourId="rian" steps={RIAN_TOUR} />
    </main>
  )
}
