'use client'

import React, { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { formatSubjectDisplay } from '@/app/_shared/_services/childService'
import { isRealScheduleClass } from '@/app/_shared/_engine/momentCard'
import type { ScheduleClass } from '@/app/_shared/_engine/momentCard'
import { CARD, SectionTitle, type EnrichedChild } from './growthShared'
import SchoolNotificationHistory from './SchoolNotificationHistory'

const WEEKDAYS = [
  { key: 'mon', label: '周一' },
  { key: 'tue', label: '周二' },
  { key: 'wed', label: '周三' },
  { key: 'thu', label: '周四' },
  { key: 'fri', label: '周五' },
]

function normalizeClass(item: unknown): ScheduleClass | null {
  if (typeof item === 'string') {
    const s = item.trim()
    return s ? { subject: s } : null
  }
  if (typeof item === 'object' && item !== null) {
    return item as ScheduleClass
  }
  return null
}

function classLabel(cls: ScheduleClass): string {
  const raw = String(cls.subject ?? cls.title ?? cls.name ?? '').trim()
  return formatSubjectDisplay(raw, cls.name_zh)
}

function classTime(cls: ScheduleClass): string | null {
  const t = String(cls.time ?? '').trim()
  return t || null
}

function getDayClasses(schedule: Record<string, unknown[]>, dayKey: string): ScheduleClass[] {
  const raw = schedule[dayKey] || []
  return raw
    .map(normalizeClass)
    .filter((c): c is ScheduleClass => c != null && isRealScheduleClass(c))
    .slice(0, 4)
}

function formatSchoolTime(start?: string, end?: string): string {
  const s = String(start || '').trim()
  const e = String(end || '').trim()
  if (s && e) return `${s} ~ ${e}`
  if (s) return s
  if (e) return e
  return '未设置'
}

type Props = {
  child: EnrichedChild
}

export default function SchoolTab({ child }: Props) {
  const router = useRouter()
  const schedule = (child.class_schedule || {}) as Record<string, unknown[]>

  const weekRows = useMemo(
    () => WEEKDAYS.map((d) => ({ ...d, classes: getDayClasses(schedule, d.key) })),
    [schedule],
  )

  const hasSchedule = weekRows.some((d) => d.classes.length > 0)
  const homeroom = child.homeroom_teacher || '—'

  return (
    <>
      <section style={CARD}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SectionTitle>学校信息</SectionTitle>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500, color: 'var(--fg1)', marginBottom: 10 }}>
              {child.school_name || '未填写学校'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--fg2)' }}>
              {child.grade ? <span>年级 · {child.grade}</span> : null}
              <span>班主任 · {homeroom}</span>
              <span>上课时间 · {formatSchoolTime(child.school_start_time, child.school_end_time)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push(`/children/${child.id}/profile`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              border: 'none',
              background: 'transparent',
              color: 'var(--clay)',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
              padding: '4px 0',
            }}
          >
            编辑
            <ChevronRight size={16} />
          </button>
        </div>
      </section>

      <section style={CARD}>
        <SectionTitle>本周课表</SectionTitle>
        {hasSchedule ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {weekRows.map((day) => (
              <div key={day.key}>
                <div style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--clay)',
                  marginBottom: 6,
                }}>
                  {day.label}
                </div>
                {day.classes.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {day.classes.map((cls, i) => (
                      <div
                        key={`${day.key}-${i}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 8,
                          padding: '10px 12px',
                          borderRadius: 12,
                          background: 'var(--canvas-light)',
                        }}
                      >
                        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--fg1)' }}>
                          {classLabel(cls)}
                        </span>
                        {classTime(cls) ? (
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--fg3)', flexShrink: 0 }}>
                            {classTime(cls)}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--fg3)' }}>无课</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--fg3)', lineHeight: 1.6 }}>
            还没有课表，可在孩子档案中上传或手动填写
          </p>
        )}
      </section>

      <SchoolNotificationHistory />
    </>
  )
}
