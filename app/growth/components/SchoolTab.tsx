'use client'

import React, { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, ChevronRight } from 'lucide-react'
import nextDynamic from 'next/dynamic'
import { formatSubjectDisplay } from '@/app/_shared/_services/childService'
import { isRealScheduleClass } from '@/app/_shared/_engine/momentCard'
import type { ScheduleClass } from '@/app/_shared/_engine/momentCard'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'
import { prepareSchedulePhotoForUpload } from '@/lib/image/prepareSchedulePhoto'
import { toast } from '@/app/components/Toast'
import { useApp } from '@/app/context/AppContext'
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

function classSubjectKey(cls: ScheduleClass): string {
  return String(cls.subject ?? cls.title ?? cls.name ?? '').trim()
}

function parseTimeMin(time?: string | null): number {
  if (!time) return -1
  const parts = time.split(':').map(Number)
  if (parts.length < 2 || Number.isNaN(parts[0])) return -1
  return parts[0] * 60 + (parts[1] || 0)
}

function dedupeClasses(classes: ScheduleClass[]): ScheduleClass[] {
  const seen = new Set<string>()
  return classes.filter((cls) => {
    const key = `${classTime(cls) ?? ''}-${classSubjectKey(cls)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function sortClassesByTime(classes: ScheduleClass[]): ScheduleClass[] {
  return [...classes].sort((a, b) => {
    const ta = parseTimeMin(classTime(a))
    const tb = parseTimeMin(classTime(b))
    if (ta < 0 && tb < 0) return 0
    if (ta < 0) return 1
    if (tb < 0) return -1
    return ta - tb
  })
}

function getDayClasses(schedule: Record<string, unknown[]>, dayKey: string): ScheduleClass[] {
  const raw = schedule[dayKey] || []
  const filtered = raw
    .map(normalizeClass)
    .filter((c): c is ScheduleClass => c != null && isRealScheduleClass(c))
  return sortClassesByTime(dedupeClasses(filtered))
}

function formatSchoolTime(start?: string, end?: string): string {
  const s = String(start || '').trim()
  const e = String(end || '').trim()
  if (s && e) return `${s} ~ ${e}`
  if (s) return s
  if (e) return e
  return '未设置'
}

function openCamera(detail: { source: string }) {
  window.dispatchEvent(new CustomEvent('openCamera', { detail }))
}

type Props = {
  child: EnrichedChild
}

export default function SchoolTab({ child }: Props) {
  const router = useRouter()
  const { activeKid, setActiveKid } = useApp()
  const schedule = (child.class_schedule || {}) as Record<string, unknown[]>
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const weekRows = useMemo(
    () => WEEKDAYS.map((d) => ({ ...d, classes: getDayClasses(schedule, d.key) })),
    [schedule],
  )

  const hasSchedule = weekRows.some((d) => d.classes.length > 0)
  const scheduleIncomplete = weekRows.some((d) => d.classes.length < 3)
  const homeroom = child.homeroom_teacher || '—'

  const handleOpenScheduleCamera = () => {
    openCamera({ source: 'schedule' })
    fileRef.current?.click()
  }

  const handleSchedulePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploading(true)
    try {
      const prepared = await prepareSchedulePhotoForUpload(file)
      if (prepared.isPortraitTall) {
        toast('建议横向拍摄课表，效果更好', 'info')
      }
      const base64 = prepared.base64
      if (!base64 || base64.length < 100) {
        toast('图片读取失败，请重试', 'error')
        return
      }
      const resp = await fetchWithAuth('/api/children/parse-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          mediaType: prepared.mediaType,
          childId: child.id,
          save: true,
        }),
      })
      const result = await resp.json()
      if (result.error) throw new Error(result.error)
      toast('课表已更新', 'success')
      if (activeKid?.id === child.id) {
        setActiveKid({
          ...activeKid,
          class_schedule: result.schedule ?? activeKid.class_schedule,
          ...(result.school_start_time ? { school_start_time: result.school_start_time } : {}),
          ...(result.school_end_time ? { school_end_time: result.school_end_time } : {}),
        })
      }
    } catch {
      toast('课表解析失败，请重试或手动填写', 'error')
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => { void handleSchedulePhoto(e) }}
      />

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
                        key={`${day.key}-${classTime(cls) ?? ''}-${classSubjectKey(cls)}-${i}`}
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
                        {classTime(cls) ? (
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--fg3)', flexShrink: 0, minWidth: 44 }}>
                            {classTime(cls)}
                          </span>
                        ) : null}
                        <span style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: 14,
                          color: 'var(--fg1)',
                          flex: 1,
                          textAlign: classTime(cls) ? 'left' : 'center',
                        }}>
                          {classLabel(cls)}
                        </span>
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

        {(scheduleIncomplete || !hasSchedule) ? (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(45,50,47,0.08)' }}>
            {scheduleIncomplete && hasSchedule ? (
              <p style={{
                margin: '0 0 12px',
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                color: 'var(--fg2)',
                lineHeight: 1.6,
              }}>
                课表可能不完整，重新上传可获得更准确的展示
              </p>
            ) : null}
            <button
              type="button"
              disabled={uploading}
              onClick={handleOpenScheduleCamera}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '13px 16px',
                borderRadius: 14,
                border: 'none',
                background: 'var(--clay)',
                color: '#fff',
                fontFamily: 'var(--font-serif)',
                fontSize: 15,
                fontWeight: 500,
                cursor: uploading ? 'wait' : 'pointer',
                opacity: uploading ? 0.7 : 1,
                boxShadow: '0 4px 16px rgba(164,99,85,0.25)',
              }}
            >
              <Camera size={18} />
              {uploading ? '解析中…' : '重新上传课表'}
            </button>
          </div>
        ) : null}
      </section>

      <SchoolNotificationHistory />
    </>
  )
}
