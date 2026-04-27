'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Loader, Save, Camera, Plus, X } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const THEME = {
  bg: 'linear-gradient(180deg, #A7D7D9 0%, #D9A7B4 100%)',
  text: '#2C3E50', gold: '#B08D57', navy: '#1A3C5E', muted: '#6B8BAA',
}

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

// ── Step 0：基本信息 ──
function StepBasic({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const [uploading, setUploading] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `children/${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('companion-files')
        .upload(path, file, { upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage
        .from('companion-files')
        .getPublicUrl(path)
      onChange({ ...data, avatar_url: urlData.publicUrl })
    } catch (e) {
      console.error('上传失败', e)
    }
    setUploading(false)
  }

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, color: THEME.navy, marginBottom: 20 }}>孩子是谁？🌱</div>

      {/* 头像区域 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 10, letterSpacing: '0.08em' }}>头像</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>

          {/* 当前头像预览 */}
          <div style={{ width: 72, height: 72, borderRadius: 20, overflow: 'hidden', border: '2px solid rgba(176,141,87,0.3)', flexShrink: 0, background: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
            {data.avatar_url
              ? <img src={data.avatar_url} alt="头像" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : data.emoji || '🌟'
            }
          </div>

          {/* 上传按钮 */}
          <div style={{ flex: 1 }}>
            <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => photoRef.current?.click()}
              disabled={uploading}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: `1.5px dashed rgba(176,141,87,0.4)`, background: 'rgba(176,141,87,0.06)', color: THEME.gold, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
              {uploading ? <Loader size={14} /> : <Camera size={14} />}
              {uploading ? '上传中…' : data.avatar_url ? '更换照片' : '上传照片'}
            </motion.button>
            {data.avatar_url && (
              <motion.button whileTap={{ scale: 0.96 }}
                onClick={() => onChange({ ...data, avatar_url: '' })}
                style={{ width: '100%', padding: '8px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)', background: 'transparent', color: THEME.muted, fontSize: 12, cursor: 'pointer' }}>
                删除照片，用 emoji 代替
              </motion.button>
            )}
          </div>
        </div>

        {/* 没有照片时显示 emoji 选择 */}
        {!data.avatar_url && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EMOJIS.map(e => (
              <motion.div key={e} whileTap={{ scale: 0.85 }}
                onClick={() => onChange({ ...data, emoji: e })}
                style={{ width: 44, height: 44, borderRadius: 12, background: data.emoji === e ? 'rgba(176,141,87,0.2)' : 'rgba(255,255,255,0.5)', border: data.emoji === e ? `2px solid ${THEME.gold}` : '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, cursor: 'pointer' }}>
                {e}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Field label="孩子名字" value={data.name} onChange={v => onChange({ ...data, name: v })} placeholder="小明 / William" />
      <Field label="生日" value={data.birthdate} onChange={v => onChange({ ...data, birthdate: v })} type="date" />

      {/* 语言多选 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 8, letterSpacing: '0.08em' }}>日常语言</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {['中文', '英文', '泰文', '马来文', '粤语'].map(lang => {
            const selected = (data.languages || []).includes(lang)
            return (
              <motion.div key={lang} whileTap={{ scale: 0.92 }}
                onClick={() => {
                  const langs = data.languages || []
                  onChange({ ...data, languages: selected ? langs.filter((l: string) => l !== lang) : [...langs, lang] })
                }}
                style={{ padding: '7px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', background: selected ? 'rgba(176,141,87,0.15)' : 'rgba(255,255,255,0.5)', border: selected ? `1.5px solid ${THEME.gold}` : '1px solid rgba(0,0,0,0.1)', color: selected ? THEME.gold : THEME.text, fontWeight: selected ? 600 : 400 }}>
                {lang}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Step 1：学校信息 ──
function StepSchool({ data, onChange, schools }: { data: any; onChange: (d: any) => void; schools: any[] }) {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, color: THEME.navy, marginBottom: 20 }}>学校信息 🏫</div>

      {/* 学校选择 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 6, letterSpacing: '0.08em' }}>就读学校</div>
        <select value={data.school_id || ''} onChange={e => {
          const school = schools.find(s => s.id === e.target.value)
          onChange({ ...data, school_id: e.target.value, school: school?.name_full || '', school_name: school?.name_full || '' })
        }}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.65)', fontSize: 14, color: THEME.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', appearance: 'none' }}>
          <option value="">请选择学校</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.name_full} ({s.name_short})</option>)}
          <option value="other">其他学校</option>
        </select>
      </div>

      {/* 学校不在列表时手动输入 */}
      {data.school_id === 'other' && (
        <Field label="学校名称" value={data.school || ''} onChange={v => onChange({ ...data, school: v })} placeholder="输入学校全名" />
      )}

      <SelectField label="年级" value={data.grade || ''} onChange={v => onChange({ ...data, grade: v })}
        options={[
          { value: '', label: '请选择年级' },
          { value: 'Nursery', label: 'Nursery' },
          { value: 'K1', label: 'K1' }, { value: 'K2', label: 'K2' }, { value: 'K3', label: 'K3' },
          { value: 'G1', label: 'G1 (小学一年级)' }, { value: 'G2', label: 'G2' }, { value: 'G3', label: 'G3' },
          { value: 'G4', label: 'G4' }, { value: 'G5', label: 'G5' }, { value: 'G6', label: 'G6' },
          { value: 'G7', label: 'G7 (中学一年级)' }, { value: 'G8', label: 'G8' }, { value: 'G9', label: 'G9' },
          { value: 'G10', label: 'G10' }, { value: 'G11', label: 'G11' }, { value: 'G12', label: 'G12' },
        ]}
      />

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <Field label="上学时间" value={data.school_start_time || ''} onChange={v => onChange({ ...data, school_start_time: v })} type="time" />
        </div>
        <div style={{ flex: 1 }}>
          <Field label="放学时间" value={data.school_end_time || ''} onChange={v => onChange({ ...data, school_end_time: v })} type="time" />
        </div>
      </div>

      <SelectField label="上下学交通" value={data.transport_method || ''} onChange={v => onChange({ ...data, transport_method: v })}
        options={[
          { value: '', label: '请选择' },
          { value: 'school_bus', label: '🚌 校车' },
          { value: 'parent_drive', label: '🚗 家长接送' },
          { value: 'walk', label: '🚶 步行' },
          { value: 'other', label: '其他' },
        ]}
      />
    </div>
  )
}

// ── Step 2：课程表 + 活动 ──
function StepSchedule({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const [activeDay, setActiveDay] = useState('mon')
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const schedule = data.class_schedule || {}
  const activities = data.activities || []

  const updateDaySchedule = (day: string, text: string) => {
    const slots = text.split('\n').map(s => s.trim()).filter(Boolean)
    onChange({ ...data, class_schedule: { ...schedule, [day]: slots } })
  }

  const addActivity = () => {
    onChange({
      ...data,
      activities: [...activities, { name: '', type: 'activity', day: 'mon', time: '', location: '' }]
    })
  }

  const updateActivity = (i: number, field: string, val: string) => {
    const updated = [...activities]
    updated[i] = { ...updated[i], [field]: val }
    onChange({ ...data, activities: updated })
  }

  const removeActivity = (i: number) => {
    onChange({ ...data, activities: activities.filter((_: any, idx: number) => idx !== i) })
  }

  // 拍照解析
  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    setParseError('')
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader()
        r.onload = () => res((r.result as string).split(',')[1])
        r.onerror = rej
        r.readAsDataURL(file)
      })
      const resp = await fetch('/api/children/parse-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      })
      const result = await resp.json()
      if (result.error) throw new Error(result.error)
      onChange({ ...data, class_schedule: result.schedule })
    } catch (err: any) {
      setParseError('解析失败，请手动填写或重试')
    }
    setParsing(false)
  }

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, color: THEME.navy, marginBottom: 4 }}>课程与活动 📚</div>
      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 20, lineHeight: 1.6 }}>可拍课程表照片自动识别</div>

      {/* 拍照解析按钮 */}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />
      <motion.button whileTap={{ scale: 0.97 }} onClick={() => fileRef.current?.click()}
        disabled={parsing}
        style={{ width: '100%', padding: '12px', borderRadius: 12, border: `1.5px dashed ${THEME.gold}`, background: 'rgba(176,141,87,0.06)', color: THEME.gold, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
        {parsing ? <Loader size={16} /> : <Camera size={16} />}
        {parsing ? '正在识别课程表…' : '拍照识别课程表'}
      </motion.button>

      {parseError && (
        <div style={{ color: '#E07B2A', fontSize: 12, marginBottom: 12, padding: '8px 12px', borderRadius: 10, background: 'rgba(224,123,42,0.08)' }}>
          ⚠️ {parseError}
        </div>
      )}

      {/* 星期切换 */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {DAYS.map(d => (
          <motion.button key={d.key} whileTap={{ scale: 0.92 }}
            onClick={() => setActiveDay(d.key)}
            style={{ flex: 1, padding: '8px 4px', borderRadius: 10, border: 'none', background: activeDay === d.key ? THEME.navy : 'rgba(255,255,255,0.5)', color: activeDay === d.key ? '#fff' : THEME.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {d.label}
          </motion.button>
        ))}
      </div>

      {/* 课程表编辑 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 6 }}>每行一节课，按时间顺序填写</div>
        <textarea
          value={(schedule[activeDay] || []).join('\n')}
          onChange={e => updateDaySchedule(activeDay, e.target.value)}
          placeholder={'早餐\n晨间例行程序\n数学\nELA\n…'}
          rows={8}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.65)', fontSize: 13, color: THEME.text, outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.8, boxSizing: 'border-box' }}
        />
      </div>

      {/* 课外活动 */}
      <div style={{ fontSize: 12, color: THEME.gold, fontWeight: 700, marginBottom: 10, letterSpacing: '0.05em' }}>课外活动 / 补习课</div>
      {activities.map((act: any, i: number) => (
        <div key={i} style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 14, padding: '14px', marginBottom: 10, border: '1px solid rgba(0,0,0,0.07)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>活动 {i + 1}</span>
            <motion.button whileTap={{ scale: 0.85 }} onClick={() => removeActivity(i)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: THEME.muted }}>
              <X size={14} />
            </motion.button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input value={act.name} onChange={e => updateActivity(i, 'name', e.target.value)}
              placeholder="活动名称" style={{ flex: 2, padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.7)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
            <select value={act.type} onChange={e => updateActivity(i, 'type', e.target.value)}
              style={{ flex: 1, padding: '9px 10px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.7)', fontSize: 12, outline: 'none', appearance: 'none', fontFamily: 'inherit' }}>
              {ACTIVITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={act.day} onChange={e => updateActivity(i, 'day', e.target.value)}
              style={{ flex: 1, padding: '9px 10px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.7)', fontSize: 12, outline: 'none', appearance: 'none', fontFamily: 'inherit' }}>
              {DAYS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
            <input value={act.time} onChange={e => updateActivity(i, 'time', e.target.value)}
              type="time" style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.7)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
            <input value={act.location} onChange={e => updateActivity(i, 'location', e.target.value)}
              placeholder="地点" style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.7)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
          </div>
        </div>
      ))}

      <motion.button whileTap={{ scale: 0.97 }} onClick={addActivity}
        style={{ width: '100%', padding: '11px', borderRadius: 12, border: `1.5px dashed rgba(176,141,87,0.4)`, background: 'transparent', color: THEME.gold, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Plus size={15} /> 添加活动
      </motion.button>
    </div>
  )
}

// ── Step 3：健康信息 ──
function StepHealth({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, color: THEME.navy, marginBottom: 4 }}>健康信息 🏥</div>
      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 20, lineHeight: 1.6 }}>用于就诊卡和紧急情况</div>
      <Field label="血型" value={data.blood_type || ''} onChange={v => onChange({ ...data, blood_type: v })} placeholder="A / B / AB / O" />
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 6 }}>过敏史</div>
        <textarea value={typeof data.allergies === 'string' ? data.allergies : JSON.stringify(data.allergies || '')}
          onChange={e => onChange({ ...data, allergies: e.target.value })}
          placeholder="青霉素过敏 / 花生过敏 / 无" rows={2}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.65)', fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 6 }}>慢性病 / 医疗状况</div>
        <textarea value={typeof data.medical_conditions === 'string' ? data.medical_conditions : JSON.stringify(data.medical_conditions || '')}
          onChange={e => onChange({ ...data, medical_conditions: e.target.value })}
          placeholder="哮喘 / 无" rows={2}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.65)', fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 6 }}>当前用药</div>
        <textarea value={typeof data.medications_current === 'string' ? data.medications_current : JSON.stringify(data.medications_current || '')}
          onChange={e => onChange({ ...data, medications_current: e.target.value })}
          placeholder="药名 / 剂量 / 频率，或填无" rows={2}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.65)', fontSize: 14, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
      </div>
      <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(154,183,232,0.12)', fontSize: 12, color: THEME.muted, lineHeight: 1.7 }}>
        💡 健康信息用于生成就诊卡和学校紧急联系表
      </div>
    </div>
  )
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
    name: '', birthdate: '', emoji: '🌟', languages: [] as string[],
    avatar_url: '',
  })
  const [schoolData, setSchoolData] = useState({
    school_id: '', school: '', school_name: '', grade: '',
    school_start_time: '', school_end_time: '', transport_method: '',
  })
  const [scheduleData, setScheduleData] = useState({
    class_schedule: {} as Record<string, string[]>,
    activities: [] as any[],
  })
  const [healthData, setHealthData] = useState({
    blood_type: '', allergies: '', medical_conditions: '', medications_current: '',
  })

  useEffect(() => {
    loadSchools()
    if (!isNew && childId) loadChild()
  }, [])

  const loadSchools = async () => {
    const { data } = await supabase.from('schools').select('id, name_full, name_short').order('name_full')
    if (data) setSchools(data)
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
      blood_type: child.blood_type || '',
      allergies: typeof child.allergies === 'string' ? child.allergies : JSON.stringify(child.allergies || ''),
      medical_conditions: typeof child.medical_conditions === 'string' ? child.medical_conditions : JSON.stringify(child.medical_conditions || ''),
      medications_current: typeof child.medications_current === 'string' ? child.medications_current : JSON.stringify(child.medications_current || ''),
    })

    // 读 child_profiles
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
        school: schoolData.school,
        school_name: schoolData.school_name || schoolData.school,
        grade: schoolData.grade,
        school_start_time: schoolData.school_start_time || null,
        school_end_time: schoolData.school_end_time || null,
        avatar_url: basicData.avatar_url || null,
        transport_method: schoolData.transport_method,
        blood_type: healthData.blood_type,
        allergies: healthData.allergies,
        medical_conditions: healthData.medical_conditions,
        medications_current: healthData.medications_current,
        updated_at: new Date().toISOString(),
      }

      let savedChildId = childId

      if (isNew) {
        const { data } = await supabase.from('children').insert(childPayload).select().single()
        savedChildId = data?.id
      } else {
        await supabase.from('children').update(childPayload).eq('id', childId)
      }

      // 保存课程表到 child_profiles
      if (savedChildId) {
        const { data: existingProfile } = await supabase.from('child_profiles')
          .select('id').eq('child_id', savedChildId).single()

        const profilePayload = {
          child_id: savedChildId,
          user_id: uid,
          class_schedule: scheduleData.class_schedule,
          activities: scheduleData.activities,
        }

        if (existingProfile) {
          await supabase.from('child_profiles').update(profilePayload).eq('id', existingProfile.id)
        } else {
          await supabase.from('child_profiles').insert(profilePayload)
        }

        // 更新 localStorage active_child
        localStorage.setItem('active_child_id', savedChildId)
        localStorage.setItem('active_child', JSON.stringify({
          id: savedChildId,
          name: basicData.name,
          grade: schoolData.grade,
          level: 'R2',
          emoji: basicData.emoji,
          school: schoolData.school,
        }))
      }

      setSaved(true)
      setTimeout(() => router.push('/children'), 1200)

    } catch (e) {
      console.error('保存失败', e)
      setSaveError('保存失败，请检查网络后重试')
    }
    setSaving(false)
  }

  const isLastStep = step === STEPS.length - 1
  const canProceed = step === 0 ? !!basicData.name.trim() : true

  return (
    <main style={{ minHeight: '100dvh', background: THEME.bg, fontFamily: "'Noto Sans SC', sans-serif" }}>

      {/* 顶部 */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(167,215,217,0.85)', backdropFilter: 'blur(20px)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
        <motion.button whileTap={{ scale: 0.9 }}
          onClick={() => step > 0 ? setStep(step - 1) : router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: THEME.navy }}>
          <ArrowLeft size={20} />
        </motion.button>
        <span style={{ fontSize: 16, fontWeight: 700, color: THEME.navy }}>
          {isNew ? '添加孩子' : '编辑孩子资料'}
        </span>
        <span onClick={() => router.back()} style={{ fontSize: 13, color: THEME.muted, cursor: 'pointer', textDecoration: 'underline' }}>
          取消
        </span>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 16px' }}>

        {/* 进度条 */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {STEPS.map((s, i) => (
            <div key={i} onClick={() => i < step && setStep(i)}
              style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? THEME.gold : 'rgba(0,0,0,0.1)', cursor: i < step ? 'pointer' : 'default', transition: 'background 0.3s' }} />
          ))}
        </div>

        {/* 步骤标题 */}
        <div style={{ fontSize: 18, fontWeight: 600, color: THEME.navy, marginBottom: 4 }}>{STEPS[step].label}</div>
        <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 24 }}>步骤 {step + 1} / {STEPS.length}</div>
        {isFromQuick && step === 0 && (
  <div style={{ background: 'rgba(176,141,87,0.1)', borderRadius: 12, padding: '10px 14px', fontSize: 12, color: THEME.gold, marginBottom: 16, textAlign: 'center' }}>
    🌱 基本信息已保存，继续补充完整资料吧
  </div>
)}
        {/* 内容卡片 */}
        <div style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(30px)', borderRadius: 24, padding: '24px 20px', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 8px 32px rgba(0,0,0,0.06)', marginBottom: 20 }}>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
              {step === 0 && <StepBasic data={basicData} onChange={setBasicData} />}
              {step === 1 && <StepSchool data={schoolData} onChange={setSchoolData} schools={schools} />}
              {step === 2 && <StepSchedule data={scheduleData} onChange={setScheduleData} />}
              {step === 3 && <StepHealth data={healthData} onChange={setHealthData} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 错误提示 */}
        {saveError && (
          <div style={{ color: '#E07B2A', fontSize: 13, textAlign: 'center', marginBottom: 12, padding: '10px 14px', borderRadius: 12, background: 'rgba(224,123,42,0.08)', border: '1px solid rgba(224,123,42,0.2)' }}>
            ⚠️ {saveError}
          </div>
        )}

        {/* 底部按钮 */}
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
