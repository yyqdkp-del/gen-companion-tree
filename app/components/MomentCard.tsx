'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, MapPin, Check } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
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

const THEME_COLOR: Record<MomentTheme, string> = {
  'warm-orange': '#9a4a2a',
  'clay-red': '#7d3f37',
  neutral: '#2d322f',
}

type Props = {
  data: MomentCardData
  now: Date
  onAction: (action: MomentAction) => void
  onOpenChild: () => void
  onOpenInput: (prefill?: string) => void
  onOneTap: (todoId: string) => void
}

function CornerHint({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        top: 18,
        right: 18,
        opacity: 0.4,
        pointerEvents: 'none',
        transition: 'opacity 200ms ease',
      }}
    >
      <Icon size={18} color="var(--clay)" strokeWidth={2} />
    </div>
  )
}

function MomentEyebrow({ children, night }: { children: string; night?: boolean }) {
  return (
    <p
      style={{
        margin: '0 0 10px',
        fontFamily: 'var(--font-body)',
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: night ? 'rgba(230,168,158,0.85)' : 'var(--clay)',
      }}
    >
      {children}
    </p>
  )
}

function PickupCountdown({ schoolEndTime, now }: { schoolEndTime?: string; now: Date }) {
  const [mins, setMins] = useState(() => minutesUntilSchoolEnd(now, schoolEndTime))

  useEffect(() => {
    setMins(minutesUntilSchoolEnd(new Date(), schoolEndTime))
    const id = setInterval(() => {
      setMins(minutesUntilSchoolEnd(new Date(), schoolEndTime))
    }, 1000)
    return () => clearInterval(id)
  }, [schoolEndTime])

  return (
    <div style={{ marginTop: 14, textAlign: 'center' }}>
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 56,
          fontWeight: 300,
          color: 'var(--clay)',
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        {mins ?? 0}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 16,
          color: 'var(--fg2)',
          marginTop: 8,
        }}
      >
        分钟后
      </div>
    </div>
  )
}

function AfterSchoolBody({ data }: { data: MomentCardData }) {
  return (
    <>
      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 500,
          fontSize: 22,
          lineHeight: 1.35,
          color: '#2d322f',
          margin: 0,
          paddingRight: 24,
        }}
      >
        {data.title}
      </h2>
      {data.nextClass ? (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--fg2)',
            margin: '12px 0 0',
            lineHeight: 1.55,
          }}
        >
          ⏰ 下一节：{data.nextClass.name}
          {data.nextClass.time ? ` ${data.nextClass.time}` : ''}
        </p>
      ) : null}
      {data.showRainTip ? (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--clay)',
            margin: '10px 0 0',
            lineHeight: 1.5,
          }}
        >
          🌧 今天有雨，记得带伞
        </p>
      ) : null}
    </>
  )
}

function PackingBody({
  data,
  onPackReady,
}: {
  data: MomentCardData
  onPackReady: () => void
}) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set())
  const [celebrating, setCelebrating] = useState(false)

  const toggleItem = (key: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleAllReady = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (celebrating) return
    setCelebrating(true)
    window.setTimeout(() => {
      onPackReady()
    }, 1200)
  }

  return (
    <>
      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 500,
          fontSize: 20,
          lineHeight: 1.35,
          color: '#2d322f',
          margin: 0,
        }}
      >
        {data.title}
      </h2>
      {data.bullets && data.bullets.length > 0 ? (
        <ul style={{ margin: '16px 0 0', padding: 0, listStyle: 'none' }}>
          {data.bullets.map((b) => {
            const key = `${b.item}-${b.context || ''}`
            const done = checked.has(key)
            return (
              <li key={key} style={{ marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={() => toggleItem(key)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      border: done ? 'none' : '1.5px solid rgba(164,99,85,0.45)',
                      background: done ? 'var(--clay)' : 'transparent',
                      flexShrink: 0,
                      marginTop: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 200ms ease, border-color 200ms ease',
                    }}
                  >
                    {done ? <Check size={12} color="#fff" strokeWidth={3} /> : null}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: 15,
                        color: done ? 'var(--fg3)' : '#2d322f',
                        lineHeight: 1.45,
                        textDecoration: done ? 'line-through' : 'none',
                        transition: 'color 200ms ease',
                      }}
                    >
                      {b.item}
                    </div>
                    {b.context ? (
                      <div
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: 11,
                          color: 'var(--fg3)',
                          marginTop: 2,
                          textDecoration: done ? 'line-through' : 'none',
                        }}
                      >
                        {b.context}
                      </div>
                    ) : null}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
      <div style={{ marginTop: 'auto', paddingTop: 18 }}>
        <motion.button
          type="button"
          className="gc-btn gc-btn--ghost"
          whileTap={{ scale: 0.97 }}
          onClick={handleAllReady}
          animate={
            celebrating
              ? { backgroundColor: '#4a9b6e', color: '#fff', borderColor: '#4a9b6e' }
              : { backgroundColor: 'transparent', color: 'var(--clay-deep)', borderColor: 'rgba(164,99,85,0.35)' }
          }
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ width: '100%' }}
        >
          {celebrating ? '太棒了！' : '✓ 都准备好了'}
        </motion.button>
      </div>
    </>
  )
}

function PickupBody({ data, now }: { data: MomentCardData; now: Date }) {
  const locationLine = [data.kidName, data.pickupLocation].filter(Boolean).join(' · ')

  return (
    <>
      <PickupCountdown schoolEndTime={data.schoolEndTime} now={now} />
      {locationLine ? (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'var(--fg3)',
            margin: '14px 0 0',
            textAlign: 'center',
            lineHeight: 1.5,
            paddingRight: 20,
          }}
        >
          {locationLine}
        </p>
      ) : null}
    </>
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
              onClick={(e) => {
                e.stopPropagation()
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
          onClick={(e) => {
            e.stopPropagation()
            onAction({ type: 'briefing_urgent' })
          }}
        >
          一键办最急的事
        </button>
      ) : null}
    </>
  )
}

function DefaultBody({ data }: { data: MomentCardData }) {
  const titleSize = TITLE_SIZE[data.tier]
  const isNight = data.kind === 'night'
  const color = isNight ? '#E8DDD0' : THEME_COLOR[data.theme]

  return (
    <>
      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 600,
          fontSize: titleSize,
          lineHeight: 1.35,
          color,
          margin: 0,
          whiteSpace: 'pre-line',
          paddingRight: data.kind === 'visa' || data.kind === 'todo' ? 24 : 0,
        }}
      >
        {data.title}
      </h2>
      {data.subtitle ? (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: data.tier === 'urgent' ? 15 : 14,
            color: isNight ? 'rgba(230,221,208,0.72)' : 'rgba(45,50,47,0.62)',
            margin: '10px 0 0',
            lineHeight: 1.55,
            whiteSpace: 'pre-line',
          }}
        >
          {data.subtitle}
        </p>
      ) : null}
    </>
  )
}

function getCardInteraction(data: MomentCardData): {
  clickable: boolean
  cornerIcon?: LucideIcon
  onCardClick?: () => void
  tapScale: number
  breathe?: boolean
  pulse?: boolean
} {
  switch (data.kind) {
    case 'after_school':
      return { clickable: true, cornerIcon: ChevronRight, tapScale: 0.98 }
    case 'pickup':
      return { clickable: true, cornerIcon: MapPin, tapScale: 0.97 }
    case 'todo':
      return { clickable: true, cornerIcon: ChevronRight, tapScale: 0.97 }
    case 'visa':
      return { clickable: true, cornerIcon: ChevronRight, tapScale: 0.97, pulse: true }
    case 'night':
      return { clickable: false, tapScale: 0.97, breathe: true }
    default:
      return { clickable: false, tapScale: 0.97 }
  }
}

export default function MomentCard({
  data,
  now,
  onAction,
  onOpenChild,
  onOpenInput,
  onOneTap,
}: Props) {
  const [hovered, setHovered] = useState(false)
  const eyebrow = data.eyebrow || '根对此刻的感知'
  const isNightCard = data.kind === 'night'
  const isPacking = data.kind === 'packing'
  const isPickup = data.kind === 'pickup'
  const isAfterSchool = data.kind === 'after_school'
  const interaction = getCardInteraction(data)
  const pulse = interaction.pulse ?? data.pulse

  const handleCardClick = () => {
    switch (data.kind) {
      case 'after_school':
        onOpenChild()
        break
      case 'pickup': {
        const q = data.pickupLocation || data.kidName || ''
        if (q) {
          window.open(`https://maps.google.com/?q=${encodeURIComponent(q)}`, '_blank', 'noopener,noreferrer')
        }
        break
      }
      case 'todo':
        if (data.todoId) onOneTap(data.todoId)
        break
      case 'visa':
        onAction({ type: 'visa' })
        break
      default:
        break
    }
  }

  const showFooterActions = !isPacking && (data.primaryAction || data.secondaryAction)

  return (
    <motion.section
      role={interaction.clickable ? 'button' : undefined}
      tabIndex={interaction.clickable ? 0 : undefined}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileTap={interaction.clickable ? { scale: interaction.tapScale } : undefined}
      onClick={interaction.clickable ? handleCardClick : undefined}
      onKeyDown={
        interaction.clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleCardClick()
              }
            }
          : undefined
      }
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={[
        pulse ? 'moment-card-pulse' : '',
        interaction.breathe ? 'moment-card-breathe' : '',
        isNightCard ? 'moment-card-night' : '',
      ].filter(Boolean).join(' ') || undefined}
      style={{
        position: 'relative',
        background: isNightCard
          ? 'linear-gradient(145deg, #1A1F35 0%, #101326 48%, #121a29 100%)'
          : '#fff',
        borderRadius: 22,
        boxShadow: hovered && interaction.clickable ? 'var(--sh-lift)' : 'var(--sh-warm)',
        margin: '0 0 16px',
        border: isNightCard ? '1px solid rgba(230,168,158,0.14)' : 'none',
        minHeight: TIER_MIN_H[data.tier],
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        cursor: interaction.clickable ? 'pointer' : 'default',
        transition: 'box-shadow 200ms ease',
      }}
    >
      {interaction.cornerIcon ? <CornerHint icon={interaction.cornerIcon} /> : null}

      <MomentEyebrow night={isNightCard}>{isNightCard ? '深夜 · 根在此刻' : eyebrow}</MomentEyebrow>

      {isAfterSchool ? (
        <AfterSchoolBody data={data} />
      ) : isPacking ? (
        <PackingBody
          data={data}
          onPackReady={() => onAction({ type: 'pack_ready' })}
        />
      ) : isPickup ? (
        <PickupBody data={data} now={now} />
      ) : (
        <DefaultBody data={data} />
      )}

      {data.kind === 'overview' && data.briefing ? (
        <BriefingBody briefing={data.briefing} onAction={onAction} />
      ) : null}

      {showFooterActions ? (
        <div style={{ marginTop: 'auto', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.primaryAction ? (
            <button
              type="button"
              className="gc-btn"
              onClick={(e) => {
                e.stopPropagation()
                if (data.kind === 'sick') {
                  onOpenChild()
                  return
                }
                if (data.kind === 'night') {
                  onAction({ type: 'treehouse' })
                  return
                }
                if (data.primaryAction!.action.type === 'one_tap' && data.todoId) {
                  onOneTap(data.todoId)
                  return
                }
                onAction(data.primaryAction!.action)
              }}
              style={{
                width: '100%',
                background: data.theme === 'clay-red' ? '#a46355' : undefined,
              }}
            >
              {data.primaryAction.label}
            </button>
          ) : null}
          {data.kind === 'sick' ? (
            <button
              type="button"
              className="gc-btn gc-btn--ghost"
              onClick={(e) => {
                e.stopPropagation()
                onOpenInput('帮我给老师写一封请假信')
              }}
              style={{ width: '100%' }}
            >
              需要请假吗？
            </button>
          ) : data.secondaryAction ? (
            <button
              type="button"
              className="gc-btn gc-btn--ghost"
              onClick={(e) => {
                e.stopPropagation()
                if (data.secondaryAction!.action.type === 'one_tap' && data.todoId) {
                  onOneTap(data.todoId)
                  return
                }
                onAction(data.secondaryAction!.action)
              }}
              style={{ width: '100%' }}
            >
              {data.secondaryAction.label}
            </button>
          ) : null}
        </div>
      ) : null}

      <style>{`
        @keyframes momentPulse {
          0%, 100% { box-shadow: var(--sh-warm); }
          50% { box-shadow: 0 12px 40px rgba(164,99,85,0.22); }
        }
        .moment-card-pulse {
          animation: momentPulse 2.4s ease-in-out infinite;
        }
        @keyframes momentBreathe {
          0%, 100% { box-shadow: var(--sh-warm); }
          50% { box-shadow: 0 14px 44px rgba(164,99,85,0.12); }
        }
        .moment-card-breathe {
          animation: momentBreathe 3.2s ease-in-out infinite;
        }
        @keyframes momentNightBreathe {
          0%, 100% {
            box-shadow: 0 8px 32px rgba(0,0,0,0.35), 0 0 0 rgba(230,168,158,0);
          }
          50% {
            box-shadow: 0 14px 48px rgba(0,0,0,0.42), 0 0 36px rgba(230,168,158,0.18);
          }
        }
        .moment-card-night.moment-card-breathe {
          animation: momentNightBreathe 3.2s ease-in-out infinite;
        }
      `}</style>
    </motion.section>
  )
}
