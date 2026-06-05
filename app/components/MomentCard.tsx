'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { RootBriefing, BriefingItem } from '@/app/_shared/_components/design'
import {
  type MomentCardData,
  type MomentAction,
  type MomentTier,
  type MomentTheme,
  minutesUntilSchoolEnd,
} from '@/app/_shared/_engine/momentCard'

const TIER_MIN_H: Record<MomentTier, string> = {
  urgent: 'min(50vh, 420px)',
  important: 'min(35vh, 320px)',
  normal: 'min(25vh, 240px)',
}

const TITLE_SIZE: Record<MomentTier, number> = {
  urgent: 26,
  important: 21,
  normal: 18,
}

const THEME_STYLE: Record<MomentTheme, { bg: string; border: string; color: string }> = {
  'warm-orange': {
    bg: 'linear-gradient(145deg, #fff5ee 0%, #fde8d8 100%)',
    border: 'rgba(234, 136, 96, 0.35)',
    color: '#9a4a2a',
  },
  'clay-red': {
    bg: 'linear-gradient(145deg, #fff2f0 0%, #f5ddd8 100%)',
    border: 'rgba(164, 99, 85, 0.45)',
    color: '#7d3f37',
  },
  neutral: {
    bg: '#fff',
    border: 'rgba(45,50,47,0.08)',
    color: '#2d322f',
  },
}

type Props = {
  data: MomentCardData
  now: Date
  onAction: (action: MomentAction) => void
}

function PickupMinutes({ schoolEndTime, now }: { schoolEndTime?: string; now: Date }) {
  const [mins, setMins] = useState(() => minutesUntilSchoolEnd(now, schoolEndTime))

  useEffect(() => {
    setMins(minutesUntilSchoolEnd(new Date(), schoolEndTime))
    const id = setInterval(() => {
      setMins(minutesUntilSchoolEnd(new Date(), schoolEndTime))
    }, 1000)
    return () => clearInterval(id)
  }, [schoolEndTime])

  return (
    <p
      style={{
        fontFamily: 'var(--font-latin)',
        fontSize: 56,
        fontWeight: 300,
        color: '#2d322f',
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
        margin: '14px 0 0',
        textAlign: 'center',
      }}
    >
      {mins ?? 0} 分钟
    </p>
  )
}

function BriefingBody({
  briefing,
  onAction,
}: {
  briefing: RootBriefing
  onAction: (action: MomentAction) => void
}) {
  const hasUrgent = briefing.items.some((i) => i.urgent) || !!briefing.urgentTodoId

  return (
    <>
      {briefing.items.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {briefing.items.map((item: BriefingItem, i) => (
            <button
              key={`${item.text}-${i}`}
              type="button"
              disabled={!(item.todoId || item.href)}
              onClick={() => {
                if (item.todoId) onAction({ type: 'briefing_todo', todoId: item.todoId })
                else if (item.href) onAction({ type: 'briefing_link', href: item.href })
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                background: 'rgba(251,249,246,0.85)',
                borderRadius: 12,
                padding: '10px 12px',
                border: '1px solid rgba(45,50,47,0.06)',
                cursor: item.todoId || item.href ? 'pointer' : 'default',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ flex: 1, fontFamily: 'var(--font-body)', fontSize: 13, color: '#2d322f' }}>
                {item.text}
              </span>
              {item.urgent ? (
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#a46355' }} />
              ) : null}
            </button>
          ))}
        </div>
      ) : (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'rgba(45,50,47,0.45)', margin: '12px 0 0' }}>
          今天暂无特别提醒，根替你盯着呢
        </p>
      )}
      {hasUrgent ? (
        <button
          type="button"
          className="gc-btn"
          style={{ width: '100%', marginTop: 14 }}
          onClick={() => onAction({ type: 'briefing_urgent' })}
        >
          一键办最急的事
        </button>
      ) : null}
    </>
  )
}

export default function MomentCard({ data, now, onAction }: Props) {
  const theme = THEME_STYLE[data.theme]
  const titleSize = TITLE_SIZE[data.tier]

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={data.pulse ? 'moment-card-pulse' : undefined}
      style={{
        margin: '20px 0 24px',
        minHeight: TIER_MIN_H[data.tier],
        background: theme.bg,
        borderRadius: 22,
        border: `1px solid ${theme.border}`,
        boxShadow: '0 8px 32px rgba(45,50,47,0.06)',
        padding: data.tier === 'urgent' ? '28px 24px' : '22px 20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <p className="gc-eyebrow" style={{ margin: '0 0 10px', color: 'rgba(45,50,47,0.45)' }}>
        根对此刻的感知
      </p>

      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 600,
          fontSize: titleSize,
          lineHeight: 1.35,
          color: theme.color,
          margin: 0,
          whiteSpace: 'pre-line',
        }}
      >
        {data.title}
      </h2>

      {data.kind === 'pickup' ? (
        <PickupMinutes schoolEndTime={data.schoolEndTime} now={now} />
      ) : data.subtitle ? (
        <p
          style={{
            fontFamily: data.kind === 'after_school' ? 'var(--font-serif)' : 'var(--font-body)',
            fontSize: data.kind === 'after_school' ? 17 : data.tier === 'urgent' ? 15 : 14,
            fontWeight: data.kind === 'after_school' ? 500 : 400,
            color: data.kind === 'after_school' ? '#2d322f' : 'rgba(45,50,47,0.62)',
            margin: '10px 0 0',
            lineHeight: 1.55,
            whiteSpace: 'pre-line',
          }}
        >
          {data.subtitle}
        </p>
      ) : null}

      {data.bullets && data.bullets.length > 0 ? (
        <ul style={{ margin: '14px 0 0', padding: '0 0 0 18px', listStyle: 'none' }}>
          {data.bullets.map((b) => (
            <li
              key={`${b.item}-${b.context || ''}`}
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: data.tier === 'important' ? 15 : 14,
                color: '#2d322f',
                marginBottom: 8,
                lineHeight: 1.45,
              }}
            >
              · {b.item}
              {b.context ? (
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'rgba(45,50,47,0.45)' }}>
                  {' '}（{b.context}）
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {data.kind === 'overview' && data.briefing ? (
        <BriefingBody briefing={data.briefing} onAction={onAction} />
      ) : null}

      <div style={{ marginTop: 'auto', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.primaryAction ? (
          <button
            type="button"
            className="gc-btn"
            onClick={() => onAction(data.primaryAction!.action)}
            style={{
              width: '100%',
              background: data.theme === 'clay-red' ? '#a46355' : undefined,
            }}
          >
            {data.primaryAction.label}
          </button>
        ) : null}
        {data.secondaryAction ? (
          <button
            type="button"
            className="gc-btn gc-btn--ghost"
            onClick={() => onAction(data.secondaryAction!.action)}
            style={{ width: '100%' }}
          >
            {data.secondaryAction.label}
          </button>
        ) : null}
      </div>

      <style>{`
        @keyframes momentPulse {
          0%, 100% { box-shadow: 0 8px 32px rgba(164,99,85,0.12); }
          50% { box-shadow: 0 8px 40px rgba(164,99,85,0.28); }
        }
        .moment-card-pulse {
          animation: momentPulse 2.4s ease-in-out infinite;
        }
      `}</style>
    </motion.section>
  )
}
