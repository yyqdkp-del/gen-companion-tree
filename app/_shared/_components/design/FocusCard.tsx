'use client'

import { ChevronRight } from 'lucide-react'
import type { Priority } from '@/app/_shared/_types'
import { priorityToKind } from './priorityTokens'

export type FocusCardItem = {
  id: string
  title: string
  subtitle: string
  priority?: Priority | string
}

export type BriefingItem = {
  icon: string
  text: string
  urgent?: boolean
  todoId?: string
  href?: string
}

export type RootBriefing = {
  greeting: string
  items: BriefingItem[]
  urgentTodoId?: string
}

export type FocusCardProps = {
  items?: FocusCardItem[]
  remainingCount?: number
  fallback?: { headline: string; detail: string }
  onItemClick?: (id: string) => void
  briefing?: RootBriefing
  onUrgentAction?: () => void
  onBriefingAction?: (item: BriefingItem) => void
}

export default function FocusCard({
  items = [],
  remainingCount = 0,
  fallback,
  onItemClick,
  briefing,
  onUrgentAction,
  onBriefingAction,
}: FocusCardProps) {
  if (briefing) {
    const hasUrgent = briefing.items.some((i) => i.urgent) || !!briefing.urgentTodoId
    return (
      <div style={{ margin: '26px 4px 12px' }}>
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 600,
            fontSize: 18,
            color: 'var(--fg1)',
            margin: '0 0 14px',
            lineHeight: 1.35,
          }}
        >
          {briefing.greeting}
        </p>
        {briefing.items.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {briefing.items.map((item, i) => {
              const clickable = !!(item.todoId || item.href || onBriefingAction)
              return (
                <button
                  key={`${item.text}-${i}`}
                  type="button"
                  disabled={!clickable}
                  onClick={() => {
                    if (item.todoId && onItemClick) onItemClick(item.todoId)
                    else onBriefingAction?.(item)
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    background: '#fff',
                    borderRadius: 13,
                    padding: '11px 13px',
                    boxShadow: '0 3px 14px rgba(45,50,47,0.03)',
                    border: item.urgent ? '1px solid rgba(164,99,85,0.18)' : '1px solid transparent',
                    cursor: clickable ? 'pointer' : 'default',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
                  <span
                    style={{
                      flex: 1,
                      fontFamily: 'var(--font-body)',
                      fontSize: 13.5,
                      color: 'var(--fg1)',
                      lineHeight: 1.4,
                    }}
                  >
                    {item.text}
                  </span>
                  {item.urgent ? (
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: 'var(--clay, #a46355)',
                        flexShrink: 0,
                      }}
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
        ) : (
          <div
            style={{
              background: '#fff',
              borderRadius: 13,
              padding: '13px 15px',
              boxShadow: '0 3px 14px rgba(45,50,47,0.03)',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'var(--fg3)',
            }}
          >
            今天暂无特别提醒，根替你盯着呢
          </div>
        )}
        {hasUrgent && onUrgentAction ? (
          <button
            type="button"
            onClick={onUrgentAction}
            className="gc-btn"
            style={{ width: '100%', marginTop: 12 }}
          >
            一键办最急的事
          </button>
        ) : null}
      </div>
    )
  }

  const displayItems = items.slice(0, 3)

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          margin: '26px 4px 12px',
        }}
      >
        <h3
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 500,
            fontSize: 16,
            color: 'var(--fg1)',
            margin: 0,
          }}
        >
          今日焦点
        </h3>
        {remainingCount > 0 && (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--fg3)' }}>
            还有 {remainingCount} 件
          </span>
        )}
      </div>
      {displayItems.length > 0 ? (
        displayItems.map((item) => {
          const kind = priorityToKind(item.priority)
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onItemClick?.(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 13,
                width: '100%',
                background: 'var(--paper)',
                borderRadius: 16,
                padding: '13px 15px',
                marginBottom: 9,
                boxShadow: '0 4px 18px rgba(45,50,47,0.03)',
                border: 'none',
                cursor: onItemClick ? 'pointer' : 'default',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  background: `var(--pri-${kind}-dot)`,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontWeight: 500,
                    fontSize: 14.5,
                    color: 'var(--fg1)',
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 11.5,
                    color: 'var(--fg3)',
                    marginTop: 2,
                  }}
                >
                  {item.subtitle}
                </div>
              </div>
              <ChevronRight size={16} color="var(--fg3)" style={{ flexShrink: 0 }} />
            </button>
          )
        })
      ) : fallback ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 13,
            background: 'var(--paper)',
            borderRadius: 16,
            padding: '13px 15px',
            marginBottom: 9,
            boxShadow: '0 4px 18px rgba(45,50,47,0.03)',
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: 'var(--pri-grey-dot)',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 14.5, color: 'var(--fg1)' }}>
              {fallback.headline}
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: 11.5, color: 'var(--fg3)', marginTop: 2 }}>
              {fallback.detail}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
