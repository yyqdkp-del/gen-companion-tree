'use client'

import React from 'react'
import type { EnergyLevel } from '@/app/_shared/_engine/energy'
import type { Child } from '@/app/_shared/_types'

export const CARD: React.CSSProperties = {
  background: '#fff',
  borderRadius: 20,
  boxShadow: 'var(--sh-warm)',
  padding: 20,
  marginBottom: 16,
}

export const ENERGY_DOT: Record<EnergyLevel, string> = {
  green: 'var(--jade, #1d9e75)',
  yellow: '#D97706',
  orange: '#EA580C',
  red: '#DC2626',
  unknown: 'var(--fg3)',
}

export function firstChar(name?: string): string {
  const s = String(name || '').trim()
  if (!s) return '孩'
  return s[0]
}

export function childAvatarStyle(size: number): React.CSSProperties {
  return {
    width: size,
    height: size,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--clay), #e6a89e)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-serif)',
    fontSize: Math.round(size * 0.42),
    fontWeight: 600,
    color: '#fff',
    flexShrink: 0,
  }
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{
      margin: '0 0 14px',
      fontFamily: 'var(--font-serif)',
      fontSize: 16,
      fontWeight: 600,
      color: 'var(--fg1)',
    }}>
      {children}
    </h3>
  )
}

export function getHanziTargetByGrade(grade?: string): number {
  const m = String(grade || '').match(/(\d+)/)
  const g = m ? parseInt(m[1], 10) : 3
  const targets: Record<number, number> = {
    1: 400, 2: 600, 3: 800, 4: 1000, 5: 1200, 6: 1500,
    7: 1800, 8: 2200, 9: 2600, 10: 3000, 11: 3500, 12: 4000,
  }
  return targets[g] || 800
}

export type EnrichedChild = Child & {
  total_hanzi?: number
  energy_label?: string
  energy_level?: EnergyLevel
  class_schedule?: Record<string, unknown[]>
  homeroom_teacher?: string
}

export const CULTURAL_QUOTES = [
  { text: '学而时习之，不亦说乎', source: '论语' },
  { text: '千里之行，始于足下', source: '老子' },
  { text: '温故而知新，可以为师矣', source: '论语' },
  { text: '欲穷千里目，更上一层楼', source: '王之涣' },
  { text: '书山有路勤为径', source: '韩愈' },
  { text: '少壮不努力，老大徒伤悲', source: '汉乐府' },
  { text: '业精于勤，荒于嬉', source: '韩愈' },
  { text: '读书破万卷，下笔如有神', source: '杜甫' },
  { text: '海内存知己，天涯若比邻', source: '王勃' },
  { text: '宝剑锋从磨砺出，梅花香自苦寒来', source: '民间谚语' },
]

export function getDailyQuote() {
  const idx = new Date().getDate() % CULTURAL_QUOTES.length
  return CULTURAL_QUOTES[idx]
}
