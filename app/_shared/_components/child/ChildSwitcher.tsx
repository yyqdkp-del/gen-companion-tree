'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useApp } from '@/app/context/AppContext'

const AVATAR_SIZE = 48
const CLAY = 'var(--clay, #a46355)'
const NAME_COLOR = '#5B615E'

function firstChar(name?: string): string {
  const s = String(name || '').trim()
  if (!s) return '孩'
  return s[0]
}

function ChildAvatarFace({
  child,
  active,
  size = AVATAR_SIZE,
}: {
  child: { name?: string; avatar_url?: string | null }
  active: boolean
  size?: number
}) {
  const border = `2px solid ${active ? CLAY : 'transparent'}`
  if (child.avatar_url) {
    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border,
        overflow: 'hidden',
        flexShrink: 0,
        transition: 'border-color 0.18s ease',
      }}>
        <img
          src={child.avatar_url}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    )
  }
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      border,
      background: 'linear-gradient(135deg, #d9e6da, #8ca88d)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-serif)',
      fontSize: 18,
      fontWeight: 500,
      color: '#2f4030',
      flexShrink: 0,
      transition: 'border-color 0.18s ease',
    }}>
      {firstChar(child.name)}
    </div>
  )
}

type Props = {
  mode: 'bar' | 'dropdown'
  onAdd?: () => void
  /** 点击当前孩子头像时的自定义行为（如首页打开 ChildSheet） */
  onAvatarClick?: () => void
  className?: string
  style?: React.CSSProperties
}

export default function ChildSwitcher({ mode, onAdd, onAvatarClick, style }: Props) {
  const { kids, activeKid, selectChild } = useApp()
  const [open, setOpen] = useState(false)
  const activeRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const activeId = activeKid?.id ?? null

  useEffect(() => {
    if (mode !== 'bar') return
    activeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [activeId, mode])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  if (!kids.length && !onAdd) return null

  const handlePick = (childId: string) => {
    void selectChild(childId)
    setOpen(false)
  }

  if (mode === 'dropdown') {
    if (!activeKid && !kids.length) return null

    const triggerClick = () => {
      if (onAvatarClick) {
        onAvatarClick()
        return
      }
      if (kids.length > 1) setOpen((v) => !v)
    }

    return (
      <div ref={menuRef} style={{ position: 'relative', ...style }}>
        <button
          type="button"
          onClick={triggerClick}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {activeKid ? (
            <ChildAvatarFace child={activeKid} active />
          ) : (
            <div style={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: '50%',
              border: '2px dashed rgba(45,50,47,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}>
              👶
            </div>
          )}
          {activeKid?.name ? (
            <span style={{
              fontFamily: 'var(--font-body)',
              fontSize: 10,
              color: NAME_COLOR,
              maxWidth: 64,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {activeKid.name}
            </span>
          ) : null}
        </button>

        <AnimatePresence>
          {open && kids.length > 1 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -4 }}
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                zIndex: 120,
                background: 'rgba(255,255,255,0.96)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: 16,
                padding: 12,
                border: '1px solid rgba(45,50,47,0.08)',
                boxShadow: 'var(--sh-soft)',
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
              }}
            >
              {kids.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handlePick(c.id)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <ChildAvatarFace child={c} active={c.id === activeId} size={40} />
                  <span style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 9,
                    color: c.id === activeId ? CLAY : NAME_COLOR,
                    fontWeight: c.id === activeId ? 600 : 400,
                    maxWidth: 48,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {c.name}
                  </span>
                </button>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    )
  }

  if (kids.length <= 1 && !onAdd) return null

  return (
    <div style={{ marginBottom: 16, ...style }}>
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
              onClick={() => handlePick(c.id)}
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
              <ChildAvatarFace child={c} active={active} />
              <span style={{
                fontFamily: 'var(--font-body)',
                fontSize: 10,
                fontWeight: active ? 600 : 400,
                color: active ? CLAY : NAME_COLOR,
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
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
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
