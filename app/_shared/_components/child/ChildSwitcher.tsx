'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useApp } from '@/app/context/AppContext'

const AVATAR_SIZE = 48
const LONG_PRESS_MS = 500
const CLAY = 'var(--clay, #a46355)'
const NAME_COLOR = '#5B615E'

type ChildFace = {
  name?: string
  emoji?: string
  avatar_url?: string | null
  energy_level?: string
}

const ENERGY_GLOW: Record<string, string> = {
  red: 'rgba(213,128,116,0.5)',
  orange: 'rgba(184,142,94,0.4)',
  yellow: 'rgba(140,168,141,0.4)',
  green: 'rgba(92,122,94,0.3)',
}

function firstChar(name?: string): string {
  const s = String(name || '').trim()
  if (!s) return '孩'
  return s[0]
}

function getEnergyGlow(level?: string): string {
  if (level && ENERGY_GLOW[level]) return ENERGY_GLOW[level]
  return ENERGY_GLOW.green
}

function ChildAvatarFace({
  child,
  active,
  size = AVATAR_SIZE,
  barMode = false,
}: {
  child: ChildFace
  active: boolean
  size?: number
  /** bar 模式（ChildSheet / 根·字）：emoji 用 clay 淡底 */
  barMode?: boolean
}) {
  const border = `2px solid ${active ? CLAY : 'transparent'}`
  const shell: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    border,
    flexShrink: 0,
    transition: 'border-color 0.18s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  }

  if (child.avatar_url) {
    return (
      <div style={shell}>
        <img
          src={child.avatar_url}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    )
  }

  if (child.emoji) {
    return (
      <div style={{
        ...shell,
        background: barMode ? 'rgba(164,99,85,0.06)' : 'rgba(164,99,85,0.06)',
      }}>
        <span style={{ fontSize: Math.round(size * 0.5), lineHeight: 1 }}>{child.emoji}</span>
      </div>
    )
  }

  return (
    <div style={{
      ...shell,
      background: 'linear-gradient(135deg, #d9e6da, #8ca88d)',
      fontFamily: 'var(--font-serif)',
      fontSize: Math.round(size * 0.375),
      fontWeight: 500,
      color: '#2f4030',
    }}>
      {firstChar(child.name)}
    </div>
  )
}

function DropdownAvatarGlow({
  child,
  active,
  size = AVATAR_SIZE,
}: {
  child: ChildFace
  active: boolean
  size?: number
}) {
  const glowColor = getEnergyGlow(child.energy_level)

  return (
    <motion.div
      animate={{
        boxShadow: [
          `0 0 0 3px ${glowColor}, 0 0 12px ${glowColor}`,
          `0 0 0 3px ${glowColor}, 0 0 22px ${glowColor}`,
          `0 0 0 3px ${glowColor}, 0 0 12px ${glowColor}`,
        ],
      }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      style={{ borderRadius: '50%', display: 'inline-flex', flexShrink: 0 }}
    >
      <ChildAvatarFace child={child} active={active} size={size} />
    </motion.div>
  )
}

function EmptyAvatarPlaceholder({ kid }: { kid?: ChildFace | null }) {
  if (kid?.avatar_url || kid?.emoji || kid?.name) {
    return <ChildAvatarFace child={kid} active={false} />
  }
  return (
    <div style={{
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      borderRadius: '50%',
      border: '2px dashed rgba(45,50,47,0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 24,
    }}>
      👶
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
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggered = useRef(false)

  const activeId = activeKid?.id ?? null
  const displayKid = activeKid ?? kids[0] ?? null

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

  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const handlePick = (childId: string) => {
    void selectChild(childId)
    setOpen(false)
  }

  const handlePickAndOpenSheet = (childId: string) => {
    void selectChild(childId)
    setOpen(false)
    onAvatarClick?.()
  }

  if (mode === 'dropdown') {
    if (!displayKid && !kids.length) return null

    const homeAvatarMode = Boolean(onAvatarClick)
    const switchableKids = kids.filter((c) => c.id !== activeId)
    const showSwitchMenu = homeAvatarMode
      ? open && switchableKids.length > 0
      : open && kids.length > 1

    const triggerClick = () => {
      if (longPressTriggered.current) {
        longPressTriggered.current = false
        return
      }
      if (onAvatarClick) {
        onAvatarClick()
        return
      }
      if (kids.length > 1) setOpen((v) => !v)
    }

    const handlePointerDown = () => {
      if (!homeAvatarMode || kids.length <= 1) return
      longPressTriggered.current = false
      clearLongPressTimer()
      longPressTimer.current = setTimeout(() => {
        longPressTriggered.current = true
        setOpen(true)
      }, LONG_PRESS_MS)
    }

    const handlePointerUp = () => {
      clearLongPressTimer()
    }

    return (
      <div ref={menuRef} style={{ position: 'relative', ...style }}>
        <button
          type="button"
          onClick={triggerClick}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onContextMenu={(e) => {
            if (homeAvatarMode && kids.length > 1) e.preventDefault()
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: 0,
            touchAction: 'manipulation',
          }}
        >
          {displayKid ? (
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <DropdownAvatarGlow child={displayKid} active />
              {homeAvatarMode && kids.length > 1 ? (
                <span style={{
                  position: 'absolute',
                  right: -2,
                  bottom: -2,
                  minWidth: 18,
                  height: 18,
                  padding: '0 5px',
                  borderRadius: 9,
                  background: CLAY,
                  color: '#fff',
                  fontFamily: 'var(--font-body)',
                  fontSize: 10,
                  fontWeight: 600,
                  lineHeight: '18px',
                  textAlign: 'center',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                  pointerEvents: 'none',
                }}>
                  {kids.length}
                </span>
              ) : null}
            </div>
          ) : (
            <EmptyAvatarPlaceholder kid={null} />
          )}
          {displayKid?.name ? (
            <span style={{
              fontFamily: 'var(--font-body)',
              fontSize: 10,
              color: NAME_COLOR,
              maxWidth: 64,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {displayKid.name}
            </span>
          ) : null}
        </button>

        <AnimatePresence>
          {showSwitchMenu ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -4 }}
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
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
              {(homeAvatarMode ? switchableKids : kids).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => (homeAvatarMode ? handlePickAndOpenSheet(c.id) : handlePick(c.id))}
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
              <ChildAvatarFace child={c} active={active} barMode />
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
