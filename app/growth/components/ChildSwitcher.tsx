'use client'

import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import type { Child } from '@/app/_shared/_types'
import { childAvatarStyle, firstChar } from './growthShared'

type Props = {
  kids: Child[]
  activeId: string | null
  onSelect: (child: Child) => void
  onAdd?: () => void
}

export default function ChildSwitcher({ kids, activeId, onSelect, onAdd }: Props) {
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [activeId])

  if (kids.length <= 1 && !onAdd) return null

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        overflowX: 'auto',
        paddingBottom: 4,
        scrollbarWidth: 'none',
      }}>
        {kids.map((c) => {
          const active = c.id === activeId
          return (
            <motion.button
              key={c.id}
              type="button"
              ref={active ? activeRef : undefined}
              whileTap={{ scale: 0.92 }}
              onClick={() => onSelect(c)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                flexShrink: 0,
                padding: 0,
              }}
            >
              <div style={{
                ...childAvatarStyle(48),
                border: `2px solid ${active ? 'var(--clay)' : 'transparent'}`,
                transition: 'border-color 0.18s ease',
              }}>
                {firstChar(c.name)}
              </div>
              <span style={{
                fontFamily: 'var(--font-body)',
                fontSize: 10,
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--clay)' : 'var(--fg3)',
                maxWidth: 56,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {c.name}
              </span>
            </motion.button>
          )
        })}
        {onAdd ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={onAdd}
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              flexShrink: 0,
              border: '1.5px dashed rgba(45,50,47,0.18)',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--fg3)',
            }}
          >
            <Plus size={16} />
          </motion.button>
        ) : null}
      </div>
    </div>
  )
}
