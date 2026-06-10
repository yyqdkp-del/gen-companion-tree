'use client'
import React, { useState, useEffect, Suspense, useCallback, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Loader, Save } from 'lucide-react'

const supabase = createClient()

import { StepBasic }    from './steps/StepBasic'
import { StepSchool }   from './steps/StepSchool'
import { resolveSchoolId } from './resolveSchoolId'
import { StepSchedule } from './steps/StepSchedule'
import { StepHealth }   from './steps/StepHealth'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'
import { toast } from '@/app/components/Toast'
import { SAFE_BOTTOM_INSET } from '@/app/_shared/_constants/layout'

const GLASS_CARD: React.CSSProperties = {
  background: 'rgba(255,255,255,0.8)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderRadius: 18,
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 4px 20px rgba(45,50,47,0.05)',
}

const PAGE = {
  bg: '#fbf9f6',
  ink: '#2d322f',
  accent: '#a46355',
  gold: '#8a7355',
  muted: 'rgba(45,50,47,0.45)',
}

const STEPS = [
  { id: 'basic', title: '基本信息', desc: '名字 · 生日 · 护照' },
  { id: 'school', title: '学校信息', desc: '学校 · 年级 · 接送' },
  { id: 'health', title: '健康档案', desc: '过敏 · 用药 · 作息' },
  { id: 'schedule', title: '课程活动', desc: '课表 · 兴趣班' },
]

function allergiesToText(val: unknown): string {
  if (Array.isArray(val)) return val.filter(Boolean).join('、')
  if (typeof val === 'string' && val) {
    try {
      const p = JSON.parse(val)
      return Array.isArray(p) ? p.filter(Boolean).join('、') : val
    } catch {
      return val
    }
  }
  return ''
}

const dateOrNull = (v: string) => (v?.trim() ? v.trim() : null)

function logChildrenDbError(
  op: string,
  error: { message?: string; details?: string; hint?: string; code?: string } | null,
  payload?: Record<string, unknown>,
) {
  console.error(`children ${op} error:`, error)
  console.error(`children ${op} error (full):`, JSON.stringify(error, null, 2))
  if (payload) console.error(`children ${op} payload:`, payload)
}

// ── 主组件 ──
function ChildEditContent() {
  const router = useRouter()
  const params = useParams()
  const isNew = params.id === 'new'
  const paramChildId = isNew ? null : params.id as string
  const searchParams = useSearchParams()
  const isFromQuick = searchParams.get('from') === 'quick'
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [schools, setSchools] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [currentChildId, setCurrentChildId] = useState<string | null>(paramChildId)
  const [isDirty, setIsDirty] = useState(false)
  const [autoSaveHint, setAutoSaveHint] = useState('')
  const [childHydrated, setChildHydrated] = useState(isNew)
  const autoSaveBusyRef = useRef(false)
  const lastSchoolSyncKeyRef = useRef('')
  const [deleting, setDeleting] = useState(false)

  const [basicData, setBasicData] = useState({
    name: '', birthdate: '', emoji: '🌟', languages: [] as string[], avatar_url: '',
    blood_type: '不知道',
    allergies_text: '',
    passport_number: '', passport_expiry: '', nationality: '',
  })
  const [schoolData, setSchoolData] = useState({
    school_id: '', school: '', school_name: '', grade: '',
    school_start_time: '', school_end_time: '', transport_method: '',
  })
  const [scheduleData, setScheduleData] = useState({
  class_schedule: {} as Record<string, any[]>,
  activities: [] as any[],
})
  const [healthData, setHealthData] = useState({
    usual_bedtime: '21:30',
    weekend_bedtime: '22:30',
    medical_conditions: ['无'] as string[],
    medications_current: ['无'] as string[],
    preferred_hospitals: [] as any[],
  })

  const setBasicDataDirty = useCallback((next: any) => {
    setIsDirty(true)
    setBasicData(next)
  }, [])
  const setSchoolDataDirty = useCallback((next: any) => {
    setIsDirty(true)
    setSchoolData(next)
  }, [])
  const setHealthDataDirty = useCallback((next: any) => {
    setIsDirty(true)
    setHealthData(next)
  }, [])
  const setScheduleDataDirty = useCallback((next: any) => {
    setIsDirty(true)
    setScheduleData(next)
  }, [])

  const triggerSchoolCalendarSync = useCallback((childId: string, uid: string) => {
    const school_name = (schoolData.school_name || schoolData.school || '').trim()
    if (!school_name) return
    const syncKey = `${childId}:${school_name}`
    if (lastSchoolSyncKeyRef.current === syncKey) return
    lastSchoolSyncKeyRef.current = syncKey

    void fetchWithAuth('/api/children/sync-school-calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId,
        schoolName: school_name,
        grade: schoolData.grade || '',
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (res.ok && (data.ok || data.success)) {
          toast('校历已更新', 'success')
        } else {
          toast('校历同步失败，可稍后重试', 'error')
        }
      })
      .catch(() => {
        toast('校历同步失败，可稍后重试', 'error')
      })
  }, [schoolData.school_name, schoolData.school, schoolData.grade])

  useEffect(() => {
    loadSchools()
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUserId(session?.user?.id || null)
    })()
    if (!isNew && paramChildId) loadChild()
  }, [])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  useEffect(() => {
  const handleResize = () => {
    const vh = window.visualViewport?.height || window.innerHeight
    document.documentElement.style.setProperty('--vh', `${vh}px`)
  }
  window.visualViewport?.addEventListener('resize', handleResize)
  handleResize()
  return () => window.visualViewport?.removeEventListener('resize', handleResize)
}, [])
  const loadSchools = async () => {
    const { data } = await supabase.from('schools').select('id, name_full, name_short').order('name_full')
    if (data) setSchools(data)
  }

  const parseArray = (val: any): string[] => {
    if (Array.isArray(val)) return val
    if (typeof val === 'string' && val) {
      try { const p = JSON.parse(val); return Array.isArray(p) ? p : [val] } catch { return [val] }
    }
    return ['无']
  }

  const loadChild = async () => {
    const [{ data: child }, { data: schoolList }] = await Promise.all([
      supabase.from('children').select('*').eq('id', paramChildId).single(),
      supabase.from('schools').select('id, name_full, name_short').order('name_full'),
    ])
    if (!child) {
      setChildHydrated(true)
      return
    }
    const schoolRows = schoolList ?? []
    if (schoolRows.length) setSchools(schoolRows)
    const schoolId = resolveSchoolId(
      schoolRows,
      child.school || '',
      child.school_name || '',
    )

    setBasicData({
      name: child.name || '',
      birthdate: child.birthdate || (child as { birth_date?: string | null }).birth_date || '',
      emoji: child.emoji || '🌟',
      languages: child.languages || [],
      avatar_url: child.avatar_url || '',
      blood_type: child.blood_type || '不知道',
      allergies_text: allergiesToText(child.allergies),
      passport_number: child.passport_number || '',
      passport_expiry: child.passport_expiry || '',
      nationality: child.nationality || '',
    })
    setSchoolData({
      school_id: schoolId,
      school: child.school || child.school_name || '',
      school_name: child.school_name || child.school || '',
      grade: child.grade || '',
      school_start_time: child.school_start_time || '',
      school_end_time: child.school_end_time || '',
      transport_method: child.transport_method || '',
    })
    setHealthData({
      usual_bedtime: child.usual_bedtime || '21:30',
      weekend_bedtime: child.weekend_bedtime || '22:30',
      medical_conditions: parseArray(child.medical_conditions),
      medications_current: parseArray(child.medications_current),
      preferred_hospitals: child.preferred_hospitals || [],
    })

    const { data: profile } = await supabase.from('child_profiles').select('*').eq('child_id', paramChildId).maybeSingle()
    if (profile) {
      setScheduleData({
        class_schedule: profile.class_schedule || {},
        activities: profile.activities || [],
      })
    }
    setChildHydrated(true)
  }

  const autoSaveCurrentStep = useCallback(async (): Promise<boolean> => {
    if (!userId) return false

    const trimmedName = basicData.name.trim()

    try {
      // 新建孩子：第一次保存时先创建 children 拿到 id
      if (isNew && !currentChildId) {
        if (!trimmedName) {
          console.error('children insert skipped: name is empty')
          return false
        }
        const childPayload = {
          user_id: userId,
          name: trimmedName,
          birthdate: dateOrNull(basicData.birthdate),
          birth_date: dateOrNull(basicData.birthdate),
          emoji: basicData.emoji,
          languages: basicData.languages,
          avatar_url: basicData.avatar_url || null,
          blood_type: basicData.blood_type,
          allergies: basicData.allergies_text.trim()
            ? [basicData.allergies_text.trim()]
            : ['无'],
          passport_number: basicData.passport_number.trim() || null,
          passport_expiry: dateOrNull(basicData.passport_expiry),
          nationality: basicData.nationality.trim() || null,
          school: schoolData.school,
          school_name: schoolData.school_name || schoolData.school,
          grade: schoolData.grade,
          school_start_time: schoolData.school_start_time || null,
          school_end_time: schoolData.school_end_time || null,
          transport_method: schoolData.transport_method,
          usual_bedtime: healthData.usual_bedtime,
          weekend_bedtime: healthData.weekend_bedtime,
          medical_conditions: healthData.medical_conditions,
          medications_current: healthData.medications_current,
          preferred_hospitals: healthData.preferred_hospitals,
        }
        const { data, error } = await supabase
          .from('children')
          .insert(childPayload)
          .select('id')
          .single()
        if (error) {
          logChildrenDbError('insert', error, childPayload)
          throw error
        }
        if (data?.id) {
          setCurrentChildId(data.id)
          localStorage.setItem('active_child_id', data.id)
          setIsDirty(false)
        }
        return true
      }

      if (!currentChildId) return false

      const updatedAt = new Date().toISOString()

      // 分步保存：已有记录用 update，避免 upsert 缺 name 触发 NOT NULL 400
      if (step === 0) {
        if (!trimmedName) {
          console.error('children update skipped: name is empty')
          return false
        }
        const updatePayload = {
          name: trimmedName,
          birthdate: dateOrNull(basicData.birthdate),
          birth_date: dateOrNull(basicData.birthdate),
          emoji: basicData.emoji,
          languages: basicData.languages,
          avatar_url: basicData.avatar_url || null,
          blood_type: basicData.blood_type,
          allergies: basicData.allergies_text.trim()
            ? [basicData.allergies_text.trim()]
            : ['无'],
          passport_number: basicData.passport_number.trim() || null,
          passport_expiry: dateOrNull(basicData.passport_expiry),
          nationality: basicData.nationality.trim() || null,
          updated_at: updatedAt,
        }
        const { error } = await supabase
          .from('children')
          .update(updatePayload)
          .eq('id', currentChildId)
          .eq('user_id', userId)
        if (error) {
          logChildrenDbError('update (step 0)', error, updatePayload)
          throw error
        }
      } else if (step === 1) {
        const updatePayload = {
          school: schoolData.school,
          school_name: schoolData.school_name || schoolData.school,
          grade: schoolData.grade,
          school_start_time: schoolData.school_start_time || null,
          school_end_time: schoolData.school_end_time || null,
          transport_method: schoolData.transport_method,
          updated_at: updatedAt,
        }
        const { error } = await supabase
          .from('children')
          .update(updatePayload)
          .eq('id', currentChildId)
          .eq('user_id', userId)
        if (error) {
          logChildrenDbError('update (step 1)', error, updatePayload)
          throw error
        }
        triggerSchoolCalendarSync(currentChildId, userId)
      } else if (step === 2) {
        const updatePayload = {
          usual_bedtime: healthData.usual_bedtime,
          weekend_bedtime: healthData.weekend_bedtime,
          medical_conditions: healthData.medical_conditions,
          medications_current: healthData.medications_current,
          preferred_hospitals: healthData.preferred_hospitals,
          updated_at: updatedAt,
        }
        const { error } = await supabase
          .from('children')
          .update(updatePayload)
          .eq('id', currentChildId)
          .eq('user_id', userId)
        if (error) {
          logChildrenDbError('update (step 2)', error, updatePayload)
          throw error
        }
      } else if (step === 3) {
        const profilePayload = {
          child_id: currentChildId,
          user_id: userId,
          class_schedule: scheduleData.class_schedule,
          activities: (scheduleData as any).activities || [],
        }
        const { error } = await supabase.from('child_profiles').upsert(
          profilePayload,
          { onConflict: 'child_id' },
        )
        if (error) {
          logChildrenDbError('child_profiles upsert (step 3)', error, profilePayload)
          throw error
        }
      }

      setIsDirty(false)
      return true
    } catch (e) {
      console.warn('自动保存失败', e)
      if (!logOrAlertNetworkError(e)) {
        toast('自动保存失败，请检查网络', 'error')
      }
      return false
    }
  }, [
    userId,
    step,
    isNew,
    currentChildId,
    basicData,
    schoolData,
    healthData,
    scheduleData,
    triggerSchoolCalendarSync,
  ])

  const goNextStep = useCallback(async () => {
    if (saving) return
    await autoSaveCurrentStep()
    setStep((s) => s + 1)
  }, [autoSaveCurrentStep, saving])

  const changeStep = useCallback(async (next: number) => {
    if (next === step) return
    if (isDirty) {
      setAutoSaveHint('保存中…')
      await autoSaveCurrentStep()
      setAutoSaveHint('')
    }
    setStep(next)
  }, [step, isDirty, autoSaveCurrentStep])

  const leavePage = useCallback(async () => {
    if (isDirty) await autoSaveCurrentStep()
    router.back()
  }, [isDirty, autoSaveCurrentStep, router])

  useEffect(() => {
    if (!childHydrated || !isDirty || !userId) return
    if (step === 0 && !basicData.name.trim()) return
    const timer = window.setTimeout(() => {
      if (autoSaveBusyRef.current) return
      autoSaveBusyRef.current = true
      setAutoSaveHint('保存中…')
      void autoSaveCurrentStep().then((ok) => {
        if (ok) {
          setAutoSaveHint('已自动保存')
          window.setTimeout(() => setAutoSaveHint(''), 2500)
        } else {
          setAutoSaveHint('')
        }
      }).finally(() => {
        autoSaveBusyRef.current = false
      })
    }, 800)
    return () => window.clearTimeout(timer)
  }, [
    childHydrated,
    isDirty,
    userId,
    step,
    autoSaveCurrentStep,
    basicData,
    schoolData,
    healthData,
    scheduleData,
  ])

  const handleSave = async () => {
    if (!basicData.name.trim()) { setSaveError('请填写孩子名字'); return }
    setSaving(true)
    setSaveError('')

    try {
      const uid = userId
      if (!uid) { router.push('/'); return }

      const childPayload = {
        user_id: uid,
        name: basicData.name,
        birthdate: dateOrNull(basicData.birthdate),
        birth_date: dateOrNull(basicData.birthdate),
        emoji: basicData.emoji,
        languages: basicData.languages,
        avatar_url: basicData.avatar_url || null,
        blood_type: basicData.blood_type,
        allergies: basicData.allergies_text.trim()
          ? [basicData.allergies_text.trim()]
          : ['无'],
        passport_number: basicData.passport_number.trim() || null,
        passport_expiry: dateOrNull(basicData.passport_expiry),
        nationality: basicData.nationality.trim() || null,
        school: schoolData.school,
        school_name: schoolData.school_name || schoolData.school,
        grade: schoolData.grade,
        school_start_time: schoolData.school_start_time || null,
        school_end_time: schoolData.school_end_time || null,
        transport_method: schoolData.transport_method,
        usual_bedtime: healthData.usual_bedtime,
        weekend_bedtime: healthData.weekend_bedtime,
        medical_conditions: healthData.medical_conditions,
        medications_current: healthData.medications_current,
        preferred_hospitals: healthData.preferred_hospitals,
      }

      let savedChildId = currentChildId

      if (isNew) {
  const { data, error } = await supabase.from('children').insert(childPayload).select().single()
  if (error) { setSaveError('新建失败: ' + error.message); setSaving(false); return }
  savedChildId = data?.id
} else {
  const { error } = await supabase.from('children').update(childPayload).eq('id', currentChildId)
        savedChildId = currentChildId
  if (error) { setSaveError('更新失败: ' + error.message); setSaving(false); return }
}

      if (savedChildId) {
       
        // 联通主屏头像：更新 localStorage
        await supabase.from('child_profiles').upsert({ child_id: savedChildId, user_id: uid, class_schedule: scheduleData.class_schedule, activities: (scheduleData as any).activities || [] }, { onConflict: 'child_id' })
        localStorage.setItem('active_child_id', savedChildId)
        localStorage.setItem('active_child', JSON.stringify({
          id: savedChildId,
          name: basicData.name,
          grade: schoolData.grade,
          level: 'R2',
          emoji: basicData.emoji,
          avatar_url: basicData.avatar_url || null,  // ← 头像联通关键
          school: schoolData.school,
        }))
      }

      setSaved(true)
      setIsDirty(false)
      if (savedChildId && uid) {
        triggerSchoolCalendarSync(savedChildId, uid)
      }
      setTimeout(() => router.push('/?refresh=1'), 1200)

    } catch (e) {
      if (!logOrAlertNetworkError(e)) setSaveError('保存失败，请检查网络后重试')
    }
    setSaving(false)
  }

  const isLastStep = step === STEPS.length - 1
  const canProceed = step === 0 ? !!basicData.name.trim() : true
  const childId = currentChildId || paramChildId
  const childName = basicData.name.trim() || '该孩子'

  const handleDeleteChild = async () => {
    if (!childId || isNew) return
    if (!confirm(`确认删除 ${childName} 的档案？此操作不可恢复，所有相关数据将被删除。`)) return

    setDeleting(true)
    try {
      const res = await fetchWithAuth(`/api/children/${childId}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof json.error === 'string' ? json.error : '删除失败')
      }

      if (typeof window !== 'undefined' && localStorage.getItem('active_child_id') === childId) {
        localStorage.removeItem('active_child_id')
        localStorage.removeItem('active_child')
      }

      toast('孩子档案已删除', 'success')
      router.push('/')
    } catch (e) {
      toast('删除失败，请重试', 'error')
      console.error(e)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <main style={{ height: 'var(--vh, 100dvh)', overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: PAGE.bg, fontFamily: "'Noto Sans SC', sans-serif" }}>

      <div style={{ position: 'sticky', top: 0, zIndex: 50, ...GLASS_CARD, borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none', padding: 'calc(14px + env(safe-area-inset-top)) 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <motion.button whileTap={{ scale: 0.9 }}
          onClick={() => void (step > 0 ? changeStep(step - 1) : leavePage())}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: PAGE.ink, padding: '4px' }}>
          <ArrowLeft size={20} />
        </motion.button>
        <span style={{ fontSize: 15, fontWeight: 700, color: PAGE.ink, fontFamily: "'Noto Serif SC', serif" }}>
          {isNew ? '添加孩子' : '编辑孩子资料'}
        </span>
        <span onClick={() => void leavePage()} style={{ fontSize: 13, color: PAGE.muted, cursor: 'pointer' }}>
          取消
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', maxWidth: 560, margin: '0 auto', padding: '16px 14px', WebkitOverflowScrolling: 'touch' }}>

        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {STEPS.map((s, i) => (
            <div key={s.id} onClick={() => { if (i < step) void changeStep(i) }}
              style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? PAGE.accent : 'rgba(164,99,85,0.12)', cursor: i < step ? 'pointer' : 'default', transition: 'background 0.3s' }} />
          ))}
        </div>

        <div style={{ fontSize: 17, fontWeight: 600, color: PAGE.ink, marginBottom: 2 }}>{STEPS[step].title}</div>
        <div style={{ fontSize: 11, color: PAGE.muted, marginBottom: 16 }}>
          {STEPS[step].desc} · 步骤 {step + 1} / {STEPS.length}
          {autoSaveHint ? (
            <span style={{ display: 'block', color: '#5c7a5e', marginTop: 4 }}>{autoSaveHint}</span>
          ) : null}
        </div>

        {isFromQuick && step === 0 && (
          <div style={{ background: 'rgba(164,99,85,0.1)', borderRadius: 12, padding: '10px 14px', fontSize: 12, color: PAGE.accent, marginBottom: 14, textAlign: 'center' }}>
            🌱 基本信息已保存，继续补充完整资料吧
          </div>
        )}

        <motion.div style={{ ...GLASS_CARD, padding: '20px 16px', marginBottom: 16 }}>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              {step === 0 && <StepBasic data={basicData} onChange={setBasicDataDirty} />}
              {step === 1 && <StepSchool data={schoolData} onChange={setSchoolDataDirty} schools={schools} />}
              {step === 2 && <StepHealth data={healthData} onChange={setHealthDataDirty} />}
              {step === 3 && <StepSchedule data={scheduleData} onChange={setScheduleDataDirty} />}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {saveError && (
          <div style={{ color: '#7a5a35', fontSize: 13, textAlign: 'center', marginBottom: 12, padding: '10px 14px', borderRadius: 12, background: '#fcf7ed', border: '1px solid #f2e2cd' }}>
            ⚠️ {saveError}
          </div>
        )}
      
        <div style={{ display: 'flex', gap: 10, paddingBottom: `calc(${SAFE_BOTTOM_INSET} + 20px)` }}>
          {isLastStep ? (
            <>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => void changeStep(step - 1)}
                style={{ flex: 1, padding: '14px', borderRadius: 16, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', fontSize: 14, color: PAGE.muted, cursor: 'pointer' }}>
                上一步
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving || saved}
                style={{ flex: 2, padding: '14px', borderRadius: 14, border: 'none', boxShadow: '0 4px 16px rgba(164,99,85,0.25)', background: saved ? '#22C55E' : PAGE.accent, color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.3s' }}>
                {saving ? <Loader size={16} /> : saved ? <Check size={16} /> : <Save size={16} />}
                {saving ? '保存中…' : saved ? '已保存 🌿' : '保存资料'}
              </motion.button>
            </>
          ) : (
            <>
              {step > 0 && (
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => void changeStep(step - 1)}
                  style={{ flex: 1, padding: '14px', borderRadius: 16, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', fontSize: 14, color: PAGE.muted, cursor: 'pointer' }}>
                  上一步
                </motion.button>
              )}
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => canProceed && void goNextStep()}
                style={{ flex: 2, padding: '14px', borderRadius: 14, border: 'none', boxShadow: canProceed ? '0 4px 16px rgba(164,99,85,0.25)' : 'none', background: canProceed ? PAGE.accent : 'rgba(0,0,0,0.08)', color: canProceed ? '#fff' : PAGE.muted, fontSize: 14, fontWeight: 600, cursor: canProceed ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                下一步 <ArrowRight size={16} />
              </motion.button>
            </>
          )}
        </div>

        {!isNew && childId && (
          <button
            type="button"
            onClick={() => void handleDeleteChild()}
            disabled={deleting}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(45,50,47,0.3)',
              fontSize: 13,
              cursor: deleting ? 'default' : 'pointer',
              padding: '20px 0',
              fontFamily: 'sans-serif',
              marginTop: 40,
              width: '100%',
            }}
          >
            {deleting ? '删除中...' : '删除孩子档案'}
          </button>
        )}
      </div>
    </main>
  )
}

export default function ChildEditPage() {
  return (
    <Suspense>
      <ChildEditContent />
    </Suspense>
  )
}
