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

export type FocusCardProps = {
  items: FocusCardItem[]
  remainingCount: number
  fallback?: { headline: string; detail: string }
  onItemClick?: (id: string) => void
}

export default function FocusCard({ items, remainingCount, fallback, onItemClick }: FocusCardProps) {
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
