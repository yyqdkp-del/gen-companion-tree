'use client'

import { ChevronRight, Plane } from 'lucide-react'
import PriChip from './PriChip'
import type { PriKind } from './priorityTokens'

export type VisaCountdownProps = {
  daysLeft: number
  childName: string
  description?: string
  priorityKind?: PriKind
  onViewClick?: () => void
}

export default function VisaCountdown({
  daysLeft,
  childName,
  description,
  priorityKind = 'orange',
  onViewClick,
}: VisaCountdownProps) {
  const detail =
    description ||
    `${childName} 的学生签即将到期。根已备好续签材料清单，建议本周内预约。`

  return (
    <div
      style={{
        background: 'var(--paper)',
        borderRadius: 22,
        boxShadow: 'var(--sh-soft)',
        padding: '17px 19px',
        marginTop: 22,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--clay)', marginBottom: 10 }}>
        <Plane size={15} />
        <div className="gc-eyebrow" style={{ letterSpacing: '0.3em' }}>
          签证倒计时
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontWeight: 300,
            fontSize: 46,
            color: 'var(--clay-deep)',
            lineHeight: 1,
          }}
        >
          {daysLeft}
        </span>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--fg2)' }}>天后到期</span>
        <span style={{ marginLeft: 'auto' }}>
          <PriChip kind={priorityKind} />
        </span>
      </div>
      <p
        style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 300,
          fontSize: 13.5,
          lineHeight: 1.7,
          color: 'var(--fg2)',
          margin: '10px 0 0',
        }}
      >
        {detail}
      </p>
      <button
        type="button"
        className="warm-tap"
        onClick={onViewClick}
        style={{
          marginTop: 13,
          width: '100%',
          border: 'none',
          background: 'var(--clay-tint)',
          color: 'var(--clay-deep)',
          fontFamily: 'var(--font-body)',
          fontSize: 13.5,
          fontWeight: 600,
          borderRadius: 13,
          padding: '11px 0',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        查看续签清单
        <ChevronRight size={15} />
      </button>
    </div>
  )
}
