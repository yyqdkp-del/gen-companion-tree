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

export type HanziTargetInfo = {
  yearlyTarget: number
  totalTarget: number
  level: string
  description: string
}

function inferAgeFromGrade(grade?: string): number {
  const g = String(grade || '').toUpperCase()
  if (g.includes('K1')) return 4
  if (g.includes('K2')) return 5
  if (g.includes('K3') || g.includes('K')) return 6
  const m = g.match(/G?(\d+)/)
  if (m) return parseInt(m[1], 10) + 6
  return 8
}

export function getChildAge(birthdate?: string | null, grade?: string): number {
  if (birthdate) {
    const birth = new Date(birthdate)
    if (!Number.isNaN(birth.getTime())) {
      const now = new Date()
      let age = now.getFullYear() - birth.getFullYear()
      const md = now.getMonth() - birth.getMonth()
      if (md < 0 || (md === 0 && now.getDate() < birth.getDate())) age -= 1
      if (age > 0 && age < 25) return age
    }
  }
  return inferAgeFromGrade(grade)
}

export function getHanziTarget(age: number, grade?: string): HanziTargetInfo {
  if (age <= 6 || grade?.includes('K')) {
    return {
      yearlyTarget: 80,
      totalTarget: 120,
      level: 'YCT 1级',
      description: '启蒙阶段，高频象形字',
    }
  }
  if (age <= 8) {
    return {
      yearlyTarget: 100,
      totalTarget: 250,
      level: 'YCT 1-2级',
      description: '基础阶段，日常高频字',
    }
  }
  if (age <= 12) {
    return {
      yearlyTarget: 175,
      totalTarget: 800,
      level: 'HSK 1-2级',
      description: '进阶阶段，简单日常对话',
    }
  }
  if (age <= 15) {
    return {
      yearlyTarget: 225,
      totalTarget: 1500,
      level: 'HSK 3-4级',
      description: '中级阶段，短文阅读',
    }
  }
  return {
    yearlyTarget: 275,
    totalTarget: 2500,
    level: 'HSK 5级 / IB',
    description: '高级阶段，书报阅读',
  }
}

/** @deprecated 使用 getHanziTarget */
export function getHanziTargetByGrade(grade?: string): number {
  return getHanziTarget(getChildAge(undefined, grade)).yearlyTarget
}

export type EnrichedChild = Child & {
  total_hanzi?: number
  energy_label?: string
  energy_level?: EnergyLevel
  class_schedule?: Record<string, unknown[]>
  schedule_intelligence?: import('@/lib/ai/scheduleIntelligence').WeeklyScheduleIntelligence | null
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
