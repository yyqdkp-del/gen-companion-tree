/** 根的大脑 — 类型定义（Claude 决策输出结构） */

import type { FamilyMemory } from '@/lib/memory/familyMemory'
import type { PlaceResult, UserLocation } from '@/lib/intelligence/realtime'
import type { SourceLevel } from '@/lib/trust/sourceLabel'

export interface RootDecision {
  /** 即时响应占位；深度分析完成后为 false 或省略 */
  isPartial?: boolean
  understanding: {
    situation: string
    urgency: 'critical' | 'urgent' | 'normal' | 'low'
    emotion: string
    keyFacts: string[]
  }
  actions: RootAction[]
  prepared: PreparedItem[]
  message: {
    headline: string
    detail: string
    reassurance: string
  }
  completion: {
    message: string
    nextStep?: string
  }
}

export interface RootAction {
  id: string
  label: string
  type: 'primary' | 'secondary'
  executor: ActionExecutor
  requiresConfirm: boolean
  confirmMessage?: string
}

export interface ActionExecutor {
  service: 'gmail' | 'calendar' | 'maps' | 'grab' | 'tel' | 'url' | 'internal'
  method: string
  params: Record<string, unknown>
  fallback?: ActionExecutor
}

export interface PreparedItem {
  type: 'draft' | 'checklist' | 'phrase' | 'comparison' | 'info'
  label: string
  content: unknown
  copyable: boolean
  source: SourceLevel
  sourceUrl?: string
  disclaimer?: string
  requiresConfirm?: boolean
}

export interface ExecutionResult {
  ok: boolean
  message?: string
  url?: string
  draftId?: string
  eventLink?: string
  error?: string
}

export interface LocalInfo {
  hospitals?: PlaceResult[]
  immigrationOffices?: PlaceResult[]
  visaPolicy?: string
  shops?: PlaceResult[]
  airports?: PlaceResult[]
  airlinePhone?: string | null
  thaiForms?: Record<string, string>
}

export interface FamilyContext {
  mom: {
    city: string
    country: string
    language: string
    alone: boolean
    timezone: string
    coordinates: { lat: number; lng: number }
  }
  child: {
    name: string
    nameEn: string
    age: number | null
    grade: string
    school: string
    teacherName: string
    teacherEmail: string
    todayClasses: Array<{ subject?: string; category?: string }>
    healthStatus: string
  }
  todo: {
    id: string
    title: string
    dimension: string
    priority: string | null
    dueDate: string | null
    daysLeft: number | null
    amount: number | null
    currency: string | null
    notes: string | null
  }
  upcomingEvents: Record<string, unknown>[]
  realtime: {
    weather: {
      condition: string
      hasRain: boolean
      temp: number
      rainProbability?: number
    } | null
    exchange: {
      rates: Record<string, number>
      trend: string
      trendText: string
      savingsTip: string
    } | null
    currentHour: number
    dayOfWeek: string
  }
  localInfo: LocalInfo
  location: UserLocation
  /** @deprecated 请优先使用 familyMemory.packingMemory */
  packingMemory: Record<string, unknown>[]
  familyMemory: FamilyMemory
  mcp: {
    gmail: boolean
    calendar: boolean
  }
}
