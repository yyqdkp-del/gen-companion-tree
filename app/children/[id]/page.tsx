'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Loader, Save } from 'lucide-react'

const supabase = createClient()

import { StepBasic }    from './steps/StepBasic'
import { StepSchool }   from './steps/StepSchool'
import { StepSchedule } from './steps/StepSchedule'
import { StepHealth }   from './steps/StepHealth'
import { THEME } from '@/app/_shared/_constants/theme'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'

const STEPS = [
  { id: 'basic', label: '基本信息' },
  { id: 'school', label: '学校信息' },
  { id: 'schedule', label: '课程活动' },
  { id: 'health', label: '健康信息' },
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

// ── 主组件 ──
function ChildEditContent() {
  const router = useRouter()
  const params = useParams()
  const isNew = params.id === 'new'
  const childId = isNew ? null : params.id as string
  const searchParams = useSearchParams()
  const isFromQuick = searchParams.get('from') === 'quick'
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [schools, setSchools] = useState<any[]>([])

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

  useEffect(() => {
    loadSchools()
    if (!isNew && childId) loadChild()
  }, [])
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
    const { data: child } = await supabase.from('children').select('*').eq('id', childId).single()
    if (!child) return

    setBasicData({
      name: child.name || '',
      birthdate: child.birthdate || '',
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
      school_id: '',
      school: child.school || '',
      school_name: child.school_name || '',
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

    const { data: profile } = await supabase.from('child_profiles').select('*').eq('child_id', childId).single()
    if (profile) {
      setScheduleData({
        class_schedule: profile.class_schedule || {},
        activities: profile.activities || [],
      })
    }
  }

  const handleSave = async () => {
    if (!basicData.name.trim()) { setSaveError('请填写孩子名字'); return }
    setSaving(true)
    setSaveError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid) { router.push('/'); return }

      const childPayload = {
        user_id: uid,
        name: basicData.name,
        birthdate: basicData.birthdate || null,
        emoji: basicData.emoji,
        languages: basicData.languages,
        avatar_url: basicData.avatar_url || null,
        blood_type: basicData.blood_type,
        allergies: basicData.allergies_text.trim()
          ? [basicData.allergies_text.trim()]
          : ['无'],
        passport_number: basicData.passport_number.trim() || null,
        passport_expiry: basicData.passport_expiry || null,
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

      let savedChildId = childId

      if (isNew) {
  const { data, error } = await supabase.from('children').insert(childPayload).select().single()
  if (error) { setSaveError('新建失败: ' + error.message); setSaving(false); return }
  savedChildId = data?.id
} else {
  const { error } = await supabase.from('children').update(childPayload).eq('id', childId)
        savedChildId = childId
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
      setTimeout(() => router.push('/'), 1200)

    } catch (e) {
      if (!logOrAlertNetworkError(e)) setSaveError('保存失败，请检查网络后重试')
    }
    setSaving(false)
  }

  const isLastStep = step === STEPS.length - 1
  const canProceed = step === 0 ? !!basicData.name.trim() : true

  return (
    <main style={{ height: 'var(--vh, 100dvh)', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: THEME.bg, fontFamily: "'Noto Sans SC', sans-serif" }}>

      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(167,215,217,0.85)', backdropFilter: 'blur(20px)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
        <motion.button whileTap={{ scale: 0.9 }}
          onClick={() => step > 0 ? setStep(step - 1) : router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: THEME.navy, padding: '4px' }}>
          <ArrowLeft size={20} />
        </motion.button>
        <span style={{ fontSize: 15, fontWeight: 700, color: THEME.navy }}>
          {isNew ? '添加孩子' : '编辑孩子资料'}
        </span>
        <span onClick={() => router.back()} style={{ fontSize: 13, color: THEME.muted, cursor: 'pointer' }}>
          取消
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', maxWidth: 560, margin: '0 auto', padding: '16px 14px', WebkitOverflowScrolling: 'touch' }}>

        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {STEPS.map((s, i) => (
            <div key={i} onClick={() => i < step && setStep(i)}
              style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? THEME.gold : 'rgba(0,0,0,0.1)', cursor: i < step ? 'pointer' : 'default', transition: 'background 0.3s' }} />
          ))}
        </div>

        <div style={{ fontSize: 17, fontWeight: 600, color: THEME.navy, marginBottom: 2 }}>{STEPS[step].label}</div>
        <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 16 }}>步骤 {step + 1} / {STEPS.length}</div>

        {isFromQuick && step === 0 && (
          <div style={{ background: 'rgba(176,141,87,0.1)', borderRadius: 12, padding: '10px 14px', fontSize: 12, color: THEME.gold, marginBottom: 14, textAlign: 'center' }}>
            🌱 基本信息已保存，继续补充完整资料吧
          </div>
        )}

        <div style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(30px)', borderRadius: 20, padding: '20px 16px', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 8px 32px rgba(0,0,0,0.06)', marginBottom: 16 }}>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              {step === 0 && <StepBasic data={basicData} onChange={setBasicData} />}
              {step === 1 && <StepSchool data={schoolData} onChange={setSchoolData} schools={schools} />}
              {step === 2 && <StepSchedule data={scheduleData} onChange={setScheduleData} />}
              {step === 3 && <StepHealth data={healthData} onChange={setHealthData} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {saveError && (
          <div style={{ color: '#7a5a35', fontSize: 13, textAlign: 'center', marginBottom: 12, padding: '10px 14px', borderRadius: 12, background: '#fcf7ed', border: '1px solid #f2e2cd' }}>
            ⚠️ {saveError}
          </div>
        )}
      
        <div style={{ display: 'flex', gap: 10, paddingBottom: 40 }}>
          {isLastStep ? (
            <>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep(step - 1)}
                style={{ flex: 1, padding: '14px', borderRadius: 16, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', fontSize: 14, color: THEME.muted, cursor: 'pointer' }}>
                上一步
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving || saved}
                style={{ flex: 2, padding: '14px', borderRadius: 16, border: 'none', background: saved ? '#22C55E' : THEME.navy, color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.3s' }}>
                {saving ? <Loader size={16} /> : saved ? <Check size={16} /> : <Save size={16} />}
                {saving ? '保存中…' : saved ? '已保存 🌿' : '保存资料'}
              </motion.button>
            </>
          ) : (
            <>
              {step > 0 && (
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep(step - 1)}
                  style={{ flex: 1, padding: '14px', borderRadius: 16, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', fontSize: 14, color: THEME.muted, cursor: 'pointer' }}>
                  上一步
                </motion.button>
              )}
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => canProceed && setStep(step + 1)}
                style={{ flex: 2, padding: '14px', borderRadius: 16, border: 'none', background: canProceed ? THEME.navy : 'rgba(0,0,0,0.08)', color: canProceed ? '#fff' : THEME.muted, fontSize: 14, fontWeight: 600, cursor: canProceed ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                下一步 <ArrowRight size={16} />
              </motion.button>
            </>
          )}
        </div>
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
