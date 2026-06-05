'use client'

import { PRI_LABEL, priCssVars, type PriKind } from './priorityTokens'

export type PriChipProps = {
  kind?: PriKind
  children?: React.ReactNode
}

export default function PriChip({ kind = 'orange', children }: PriChipProps) {
  const p = priCssVars(kind)
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 9,
        background: p.background,
        border: p.border,
        color: p.color,
        fontFamily: 'var(--font-body)',
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.dot }} />
      {children ?? PRI_LABEL[kind]}
    </span>
  )
}
