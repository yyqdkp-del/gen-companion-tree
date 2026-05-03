'use client'
import React, { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Loader, Camera, Check } from 'lucide-react'
import { THEME } from '@/app/_shared/_constants/theme'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

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
function StepBasic({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadSuccess(false)
    try {
      const ext = file.name.split('.').pop()
      const path = `children/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('companion-files').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('companion-files').getPublicUrl(path)
      onChange({ ...data, avatar_url: urlData.publicUrl })
      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 3000)
    } catch (e) {
      console.error('上传失败', e)
    }
    setUploading(false)
  }

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, color: THEME.navy, marginBottom: 20 }}>孩子是谁？🌱</div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 10, letterSpacing: '0.08em' }}>头像</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, overflow: 'hidden', border: '2px solid rgba(176,141,87,0.3)', flexShrink: 0, background: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
            {data.avatar_url
              ? <img src={data.avatar_url} alt="头像" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : data.emoji || '🌟'
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => photoRef.current?.click()}
              disabled={uploading}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: `1.5px dashed rgba(176,141,87,0.4)`, background: uploadSuccess ? 'rgba(34,197,94,0.08)' : 'rgba(176,141,87,0.06)', color: uploadSuccess ? '#16a34a' : THEME.gold, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
              {uploading ? <Loader size={14} /> : uploadSuccess ? <Check size={14} /> : <Camera size={14} />}
              {uploading ? '上传中…' : uploadSuccess ? '上传成功 ✓' : data.avatar_url ? '更换照片' : '上传照片'}
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

        {!data.avatar_url && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EMOJIS.map((e: string) => (
              <motion.div key={e} whileTap={{ scale: 0.85 }}
                onClick={() => onChange({ ...data, emoji: e })}
                style={{ width: 42, height: 42, borderRadius: 12, background: data.emoji === e ? 'rgba(176,141,87,0.2)' : 'rgba(255,255,255,0.5)', border: data.emoji === e ? `2px solid ${THEME.gold}` : '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, cursor: 'pointer' }}>
                {e}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Field label="孩子名字" value={data.name} onChange={v => onChange({ ...data, name: v })} placeholder="小明 / William" />
      <Field label="生日" value={data.birthdate} onChange={v => onChange({ ...data, birthdate: v })} type="date" />

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

export { StepBasic }
