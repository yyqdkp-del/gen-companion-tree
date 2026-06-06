'use client'
import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader, X, Plus, Camera } from 'lucide-react'
import { useParams } from 'next/navigation'
import { THEME } from '@/app/_shared/_constants/theme'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'
import { toast } from '@/app/components/Toast'
import { prepareSchedulePhotoVariants, type SchedulePhotoVariant } from '@/lib/image/prepareSchedulePhoto'
import { validateScheduleStructure, type ScheduleValidationWarning } from '@/lib/schedule/validateScheduleStructure'
import { formatSubjectDisplay } from '@/app/_shared/_services/childService'

const DAYS = [
  { key: 'mon', label: '周一' },
  { key: 'tue', label: '周二' },
  { key: 'wed', label: '周三' },
  { key: 'thu', label: '周四' },
  { key: 'fri', label: '周五' },
]

type ScheduleEntry = {
  time: string
  subject: string
  name_zh?: string
  category?: string
  requires_items?: string[]
}

type ScheduleByDay = Record<string, ScheduleEntry[]>

type ParsePhase = 'idle' | 'parsing' | 'parsed' | 'confirmed'

type ParsedResult = {
  schedule: ScheduleByDay
  parse_warnings: { day: string; time: string; subject: string; reason: string }[]
  validation_warnings: ScheduleValidationWarning[]
  school_start_time?: string | null
  school_end_time?: string | null
}

const ACTIVITY_TYPES = [
  { value: 'tutor', label: '补习课' },
  { value: 'sport', label: '体育运动' },
  { value: 'activity', label: '兴趣班' },
  { value: 'other', label: '其他' },
]

// ── 清迈医院预设列表 ──
const PRESET_HOSPITALS = [
  { category: '综合国际医院', hospitals: [
    { name: '清迈曼谷医院 (Bangkok Hospital)', phone: '052-089-888' },
    { name: '清迈兰医院 (Ram Hospital)', phone: '053-920-300' },
    { name: '兰纳医院 (Lanna Hospital)', phone: '052-134-777' },
    { name: '麦考密克医院 (McCormick)', phone: '053-921-777' },
    { name: 'Rajavej 医院', phone: '052-011-999' },
    { name: 'Sriphat 医疗中心 (清大附属)', phone: '053-936-900' },
  ]},
  { category: '牙科诊所', hospitals: [
    { name: 'Grace Dental Care', phone: '053-894-568' },
    { name: 'CIDC 国际牙科中心', phone: '052-089-323' },
    { name: 'GrandDent Dental', phone: '053-274-420' },
    { name: 'Kitcha Dental', phone: '053-202-011' },
    { name: 'Dental 4 U', phone: '086-431-3711' },
    { name: 'Elite Smile Dental', phone: '053-288-199' },
  ]},
  { category: '眼科', hospitals: [
    { name: '圣彼得眼科医院', phone: '053-225-011' },
    { name: 'CMES 清大专家诊所', phone: '090-670-1719' },
    { name: 'Darin Eye Center', phone: '052-005-552' },
    { name: '兰医院眼科中心', phone: '053-920-300' },
    { name: 'Sriphat 眼科中心', phone: '053-936-948' },
  ]},
]

// ── 健康选项 ──
const BLOOD_TYPES = ['不知道', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const ALLERGY_OPTIONS = ['无', '青霉素', '头孢', '阿司匹林', '花生', '海鲜', '牛奶', '鸡蛋', '尘螨', '花粉', '猫狗毛', '乳胶', '其他']
const CONDITION_OPTIONS = ['无', '哮喘', '湿疹', '过敏性鼻炎', '糖尿病', '癫痫', '心脏病', '其他']
const MEDICATION_OPTIONS = ['无', '哮喘喷雾', '过敏药', '退烧药备用', '维生素', '其他']

function Field({ label, value, onChange, placeholder, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 6, letterSpacing: '0.08em' }}>{label}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.65)', fontSize: 14, color: THEME.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
    </div>
  )
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 6, letterSpacing: '0.08em' }}>{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.65)', fontSize: 14, color: THEME.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', appearance: 'none' }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ── 多选标签组件 ──
function MultiSelect({ label, options, selected, onChange }: {
  label: string
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const [customInput, setCustomInput] = useState('')
  const showCustom = selected.includes('其他')

  const toggle = (opt: string) => {
    if (opt === '无') { onChange(['无']); return }
    const without = selected.filter(s => s !== '无')
    if (without.includes(opt)) {
      const next = without.filter(s => s !== opt)
      onChange(next.length ? next : ['无'])
    } else {
      onChange([...without, opt])
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 8, letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {options.map(opt => {
          const isSelected = selected.includes(opt)
          return (
            <motion.div key={opt} whileTap={{ scale: 0.92 }} onClick={() => toggle(opt)}
              style={{ padding: '7px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', background: isSelected ? 'rgba(164,99,85,0.15)' : 'rgba(255,255,255,0.6)', border: isSelected ? `1.5px solid ${THEME.gold}` : '1px solid rgba(0,0,0,0.1)', color: isSelected ? THEME.gold : THEME.text, fontWeight: isSelected ? 600 : 400 }}>
              {opt}
            </motion.div>
          )
        })}
      </div>
      {showCustom && (
        <input value={customInput} onChange={e => setCustomInput(e.target.value)}
          placeholder="请描述具体情况…"
          style={{ width: '100%', marginTop: 8, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.65)', fontSize: 13, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
      )}
    </div>
  )
}

// ── Step 0：基本信息 ──
function StepSchedule({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const params = useParams()
  const childId = params.id as string
  const [parsePhase, setParsePhase] = useState<ParsePhase>('idle')
  const [parsing, setParsing] = useState(false)
  const [savingConfirm, setSavingConfirm] = useState(false)
  const [parseError, setParseError] = useState('')
  const [parsedResult, setParsedResult] = useState<ParsedResult | null>(null)
  const [pendingSchedule, setPendingSchedule] = useState<ScheduleByDay>({})
  const [processedPreview, setProcessedPreview] = useState<string | null>(null)
  const [editDay, setEditDay] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editingSubject, setEditingSubject] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const schedule = data.class_schedule || {}

  const countEntries = (sch: ScheduleByDay) =>
    DAYS.reduce((n, d) => n + (sch[d.key]?.length || 0), 0)

  const resetParse = () => {
    setParsePhase('idle')
    setParsedResult(null)
    setPendingSchedule({})
    setProcessedPreview(null)
    setParseError('')
    setEditingKey(null)
    if (fileRef.current) fileRef.current.value = ''
    if (cameraRef.current) cameraRef.current.value = ''
  }

  const pickPhotoVariant = (variants: Awaited<ReturnType<typeof prepareSchedulePhotoVariants>>): SchedulePhotoVariant => {
    if (variants.needsRotationChoice && variants.rotated) {
      return variants.rotated
    }
    return variants.original
  }

  const runParseWithVariant = async (variant: SchedulePhotoVariant) => {
    setParsing(true)
    setParsePhase('parsing')
    setParseError('')
    try {
      if (!variant.base64 || variant.base64.length < 100) {
        throw new Error('图片读取失败')
      }
      const resp = await fetchWithAuth('/api/children/parse-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: variant.base64,
          mediaType: variant.mediaType,
          childId,
          save: false,
        }),
      })
      const result = await resp.json()
      if (result.error) throw new Error(result.error)

      const nextSchedule = result.schedule as ScheduleByDay
      if (countEntries(nextSchedule) === 0) {
        throw new Error('未识别到有效课程')
      }

      const validation_warnings = (result.validation_warnings as ScheduleValidationWarning[] | undefined)
        ?? validateScheduleStructure(nextSchedule)

      setParsedResult({
        schedule: nextSchedule,
        parse_warnings: result.parse_warnings || [],
        validation_warnings,
        school_start_time: result.school_start_time,
        school_end_time: result.school_end_time,
      })
      setPendingSchedule(nextSchedule)
      setParsePhase('parsed')
      setProcessedPreview(null)
    } catch {
      setParseError('解析失败，请手动填写或重试')
      setParsePhase('idle')
      setProcessedPreview(null)
    }
    setParsing(false)
  }

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    setParseError('')
    setParsePhase('parsing')
    try {
      const variants = await prepareSchedulePhotoVariants(file)
      const variant = pickPhotoVariant(variants)
      setProcessedPreview(variant.previewUrl)
      if (variants.isPortraitTall && !variants.needsRotationChoice) {
        toast('建议横向拍摄课表，效果更好', 'info')
      }
      await runParseWithVariant(variant)
    } catch {
      setParseError('图片处理失败，请重试')
      setParsePhase('idle')
      setProcessedPreview(null)
      setParsing(false)
    }
  }

  const handleConfirmSave = async () => {
    if (!pendingSchedule || countEntries(pendingSchedule) === 0) return
    setSavingConfirm(true)
    setParseError('')
    try {
      const resp = await fetchWithAuth('/api/children/parse-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          schedule: pendingSchedule,
          save: true,
        }),
      })
      const result = await resp.json()
      if (result.error) throw new Error(result.error)

      onChange({
        ...data,
        class_schedule: result.schedule,
        ...(result.school_start_time ? { school_start_time: result.school_start_time } : {}),
        ...(result.school_end_time ? { school_end_time: result.school_end_time } : {}),
      })
      setParsePhase('confirmed')
      toast(`已保存 ${countEntries(result.schedule)} 节课`, 'success')
      resetParse()
    } catch {
      setParseError('保存失败，请重试')
    }
    setSavingConfirm(false)
  }

  const updateLessonSubject = (dayKey: string, index: number, subject: string) => {
    setPendingSchedule((prev) => {
      const next = { ...prev }
      const day = [...(next[dayKey] || [])]
      if (!day[index]) return prev
      day[index] = { ...day[index], subject: subject.trim() }
      next[dayKey] = day
      return next
    })
  }

  const removeLesson = (dayKey: string, index: number) => {
    setPendingSchedule((prev) => {
      const next = { ...prev }
      next[dayKey] = (next[dayKey] || []).filter((_, i) => i !== index)
      return next
    })
  }

  const startEditSubject = (dayKey: string, index: number, subject: string) => {
    setEditingKey(`${dayKey}-${index}`)
    setEditingSubject(subject)
  }

  const commitEditSubject = (dayKey: string, index: number) => {
    if (editingSubject.trim()) {
      updateLessonSubject(dayKey, index, editingSubject)
    }
    setEditingKey(null)
    setEditingSubject('')
  }

  const openEdit = (day: string) => {
    const dayData = schedule[day] || []
    const text = dayData.map((item: any) =>
      typeof item === 'object' ? `${item.time} ${item.subject}` : item
    ).join('\n')
    setEditText(text)
    setEditDay(day)
  }

  const normalizeTime = (time: string): string | null => {
    const t = String(time || '').trim()
    if (!/^\d{1,2}:\d{2}$/.test(t)) return null
    const [h, m] = t.split(':').map(Number)
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null
    if (h < 0 || h > 23) return null
    if (m < 0 || m > 59) return null
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  const saveEdit = () => {
    if (!editDay) return
    const slots = editText
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => {
        const timeMatch = s.match(/^(\d{1,2}:\d{2})\s+(.+)$/)
        if (!timeMatch) return null
        const time = normalizeTime(timeMatch[1])
        const subject = String(timeMatch[2] || '').trim()
        if (!time || !subject) return null
        return { time, subject }
      })
      .filter(Boolean) as { time: string; subject: string }[]
    onChange({ ...data, class_schedule: { ...schedule, [editDay]: slots } })
    setEditDay(null)
  }

  const getDayCount = (day: string) => (schedule[day] || []).length
  const totalPending = countEntries(pendingSchedule)
  const showConfirm = parsePhase === 'parsed'
  const showParsingPreview = parsePhase === 'parsing' && !!processedPreview

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, color: THEME.navy, marginBottom: 4 }}>课程表 📚</div>
      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 16, lineHeight: 1.6 }}>
        {showConfirm
          ? '请确认识别结果，无误后再保存'
          : showParsingPreview
            ? '正在识别课表，请稍候…'
            : '拍照识别课表（清晰照片效果更好，可手动修改）'}
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />

      {parsePhase === 'idle' && !showConfirm ? (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => cameraRef.current?.click()}
            disabled={parsing}
            style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1.5px dashed ${THEME.gold}`, background: 'rgba(164,99,85,0.06)', color: THEME.gold, fontSize: 13, fontWeight: 600, cursor: parsing ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: parsing ? 0.7 : 1 }}>
            <Camera size={16} />
            拍照识别
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => fileRef.current?.click()}
            disabled={parsing}
            style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1.5px dashed ${THEME.gold}`, background: 'rgba(164,99,85,0.06)', color: THEME.gold, fontSize: 13, fontWeight: 600, cursor: parsing ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: parsing ? 0.7 : 1 }}>
            <Plus size={16} />
            从相册上传
          </motion.button>
        </div>
      ) : null}

      {showParsingPreview ? (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            position: 'relative',
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid rgba(0,0,0,0.08)',
            background: 'rgba(255,255,255,0.65)',
          }}>
            <img
              src={processedPreview!}
              alt="处理后的课表"
              style={{
                width: '100%',
                maxHeight: 220,
                objectFit: 'contain',
                display: 'block',
              }}
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.55)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.92)',
                color: THEME.navy,
                fontSize: 13,
                fontWeight: 600,
              }}>
                <Loader size={16} />
                识别中…
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {parseError ? (
        <div style={{ color: '#7a5a35', fontSize: 12, marginBottom: 12, padding: '8px 12px', borderRadius: 10, background: '#fcf7ed' }}>
          ⚠️ {parseError}
        </div>
      ) : null}

      {showConfirm ? (
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: THEME.navy, marginBottom: 12 }}>
            根识别到以下课程，请确认
          </div>

          {(parsedResult?.parse_warnings?.length || 0) > 0 ? (
            <div style={{
              color: '#7a5a35',
              fontSize: 12,
              marginBottom: 12,
              padding: '10px 12px',
              borderRadius: 10,
              background: '#fcf7ed',
              border: '1px solid rgba(180,142,94,0.25)',
            }}>
              ⚠️ {parsedResult!.parse_warnings.length} 个时间无法识别，已跳过
            </div>
          ) : null}

          {(parsedResult?.validation_warnings?.length || 0) > 0 ? (
            <div style={{
              color: '#7a5a35',
              fontSize: 12,
              marginBottom: 12,
              padding: '10px 12px',
              borderRadius: 10,
              background: '#fcf7ed',
              border: '1px solid rgba(180,142,94,0.25)',
            }}>
              {(parsedResult!.validation_warnings).map((w) => (
                <div key={w.code + w.message} style={{ marginBottom: 4 }}>
                  ⚠️ {w.message}
                </div>
              ))}
            </div>
          ) : null}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
            {DAYS.map((d) => {
              const lessons = pendingSchedule[d.key] || []
              if (!lessons.length) return null
              return (
                <div key={d.key}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: THEME.muted, marginBottom: 8, letterSpacing: '0.06em' }}>
                    {d.label}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {lessons.map((lesson, index) => {
                      const editKey = `${d.key}-${index}`
                      const isEditing = editingKey === editKey
                      return (
                        <div
                          key={editKey}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 12px',
                            borderRadius: 10,
                            background: 'rgba(255,255,255,0.75)',
                            border: '1px solid rgba(0,0,0,0.06)',
                          }}
                        >
                          <span style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: THEME.gold,
                            fontFamily: 'monospace',
                            flexShrink: 0,
                            width: 48,
                          }}>
                            {lesson.time}
                          </span>
                          {isEditing ? (
                            <input
                              autoFocus
                              value={editingSubject}
                              onChange={(e) => setEditingSubject(e.target.value)}
                              onBlur={() => commitEditSubject(d.key, index)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitEditSubject(d.key, index)
                              }}
                              style={{
                                flex: 1,
                                border: 'none',
                                background: 'transparent',
                                fontSize: 13,
                                color: THEME.text,
                                outline: 'none',
                                fontFamily: 'inherit',
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => startEditSubject(d.key, index, lesson.subject)}
                              style={{
                                flex: 1,
                                border: 'none',
                                background: 'transparent',
                                textAlign: 'left',
                                fontSize: 13,
                                color: THEME.text,
                                cursor: 'pointer',
                                padding: 0,
                                fontFamily: 'inherit',
                              }}
                            >
                              {formatSubjectDisplay(lesson.subject)}
                            </button>
                          )}
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.85 }}
                            onClick={() => removeLesson(d.key, index)}
                            aria-label="删除"
                            style={{
                              border: 'none',
                              background: 'rgba(0,0,0,0.04)',
                              borderRadius: '50%',
                              width: 28,
                              height: 28,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: THEME.muted,
                              flexShrink: 0,
                            }}
                          >
                            <X size={14} />
                          </motion.button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={resetParse}
              disabled={savingConfirm}
              style={{
                flex: 1,
                padding: '13px',
                borderRadius: 12,
                border: '1.5px solid rgba(0,0,0,0.12)',
                background: 'rgba(255,255,255,0.7)',
                color: THEME.text,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              重新识别
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => { void handleConfirmSave() }}
              disabled={savingConfirm || totalPending === 0}
              style={{
                flex: 1.4,
                padding: '13px',
                borderRadius: 12,
                border: 'none',
                background: THEME.navy,
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: totalPending === 0 ? 'not-allowed' : 'pointer',
                opacity: totalPending === 0 ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {savingConfirm ? <Loader size={16} /> : null}
              确认保存 ({totalPending}节课)
            </motion.button>
          </div>
        </div>
      ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DAYS.map(d => {
          const count = getDayCount(d.key)
          const dayData = schedule[d.key] || []
          const preview = dayData.slice(0, 2).map((item: any) =>
            typeof item === 'object'
              ? formatSubjectDisplay(String(item.subject ?? item.title ?? ''))
              : formatSubjectDisplay(String(item)),
          ).join(' · ')

          return (
            <motion.div key={d.key} whileTap={{ scale: 0.98 }}
              onClick={() => openEdit(d.key)}
              style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: count > 0 ? 'rgba(164,99,85,0.12)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: count > 0 ? THEME.gold : THEME.muted }}>{d.label}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {count > 0 ? (
                  <>
                    <div style={{ fontSize: 12, color: THEME.text, fontWeight: 500 }}>{count} 节课</div>
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {preview}{count > 2 ? ` · 等${count}项` : ''}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: THEME.muted }}>点击添加课程</div>
                )}
              </div>
              <span style={{ fontSize: 12, color: THEME.muted, flexShrink: 0 }}>编辑 ›</span>
            </motion.div>
          )
        })}
      </div>
      )}

      {/* 弹窗编辑 */}
      <AnimatePresence>
        {editDay && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={() => setEditDay(null)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 560, background: 'rgba(255,255,255,0.97)', borderRadius: '20px 20px 0 0', padding: '20px 16px 40px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: THEME.navy }}>
                  {DAYS.find(d => d.key === editDay)?.label} 课程
                </div>
                <motion.button whileTap={{ scale: 0.85 }} onClick={() => setEditDay(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: THEME.muted }}>
                  <X size={18} />
                </motion.button>
              </div>

              <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 8, lineHeight: 1.6 }}>
                每行一节课，格式：<span style={{ color: THEME.gold }}>07:50 早餐</span>（时间+空格+课程名）
              </div>

              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                placeholder={'07:50 早餐\n08:00 晨间例行程序\n08:15 数学\n09:00 英文\n…'}
                autoFocus
                style={{ flex: 1, width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(245,240,232,0.8)', fontSize: 13, color: THEME.text, outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 2, boxSizing: 'border-box', minHeight: 200 }}
              />

              <motion.button whileTap={{ scale: 0.97 }} onClick={saveEdit}
                style={{ width: '100%', marginTop: 12, padding: '13px', borderRadius: 12, border: 'none', background: THEME.navy, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                保存
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Step 3：健康信息 ──

export { StepSchedule }
