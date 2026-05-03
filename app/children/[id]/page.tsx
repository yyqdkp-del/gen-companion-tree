'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Loader, Save, Camera, Plus, X } from 'lucide-react'

const supabase = createClient()

import { StepBasic }    from './steps/StepBasic'
import { StepSchool }   from './steps/StepSchool'
import { StepSchedule } from './steps/StepSchedule'
import { StepHealth }   from './steps/StepHealth'
import { THEME } from '@/app/_shared/_constants/theme'

const STEPS = [
  { id: 'basic', label: '基本信息' },
  { id: 'school', label: '学校信息' },
  { id: 'schedule', label: '课程活动' },
  { id: 'health', label: '健康信息' },
]

const EMOJIS = ['🌟', '🌈', '🦁', '🐼', '🦊', '🐬', '🦋', '🌸', '🍀', '🎨', '🚀', '⚽']

const DAYS = [
  { key: 'mon', label: '周一' },
  { key: 'tue', label: '周二' },
  { key: 'wed', label: '周三' },
  { key: 'thu', label: '周四' },
  { key: 'fri', label: '周五' },
]

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
              style={{ padding: '7px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', background: isSelected ? 'rgba(176,141,87,0.15)' : 'rgba(255,255,255,0.6)', border: isSelected ? `1.5px solid ${THEME.gold}` : '1px solid rgba(0,0,0,0.1)', color: isSelected ? THEME.gold : THEME.text, fontWeight: isSelected ? 600 : 400 }}>
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
// ── 主组件 ──
function ChildEditContent() {
  const router = useRouter()
  const params = useParams()
  const isNew = params.id === 'new'
  const childId = isNew ? null : params.id as string
  const searchParams = useSearchParams()
  const isFromQuick = searchParams.get('from') === 'quick'
  const cameraRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [schools, setSchools] = useState<any[]>([])

  const [basicData, setBasicData] = useState({
    name: '', birthdate: '', emoji: '🌟', languages: [] as string[], avatar_url: '',
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
    blood_type: '不知道',
    usual_bedtime: '21:30',
    weekend_bedtime: '22:30',
    allergies: ['无'] as string[],
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
      blood_type: child.blood_type || '不知道',
      usual_bedtime: child.usual_bedtime || '21:30',
      weekend_bedtime: child.weekend_bedtime || '22:30',
      allergies: parseArray(child.allergies),
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
        school: schoolData.school,
        school_name: schoolData.school_name || schoolData.school,
        grade: schoolData.grade,
        school_start_time: schoolData.school_start_time || null,
        school_end_time: schoolData.school_end_time || null,
        transport_method: schoolData.transport_method,
        blood_type: healthData.blood_type,
        usual_bedtime: healthData.usual_bedtime,
        weekend_bedtime: healthData.weekend_bedtime,
        allergies: healthData.allergies,
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
      console.error('保存失败', e)
      setSaveError('保存失败，请检查网络后重试')
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
          <div style={{ color: '#E07B2A', fontSize: 13, textAlign: 'center', marginBottom: 12, padding: '10px 14px', borderRadius: 12, background: 'rgba(224,123,42,0.08)', border: '1px solid rgba(224,123,42,0.2)' }}>
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
