'use client'
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { THEME } from '@/app/_shared/_constants/theme'

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
function StepSchool({ data, onChange, schools }: { data: any; onChange: (d: any) => void; schools: any[] }) {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, color: THEME.navy, marginBottom: 20 }}>学校信息 🏫</div>

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

      {data.school_id === 'other' && (
        <Field label="学校名称" value={data.school || ''} onChange={v => onChange({ ...data, school: v })} placeholder="输入学校全名" />
      )}

      <SelectField label="年级" value={data.grade || ''} onChange={v => onChange({ ...data, grade: v })}
        options={[
          { value: '', label: '请选择年级' },
          { value: 'Nursery', label: 'Nursery' },
          { value: 'K1', label: 'K1' }, { value: 'K2', label: 'K2' }, { value: 'K3', label: 'K3' },
          { value: 'G1', label: 'G1' }, { value: 'G2', label: 'G2' }, { value: 'G3', label: 'G3' },
          { value: 'G4', label: 'G4' }, { value: 'G5', label: 'G5' }, { value: 'G6', label: 'G6' },
          { value: 'G7', label: 'G7' }, { value: 'G8', label: 'G8' }, { value: 'G9', label: 'G9' },
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

// ── Step 2：课程表 ──

export { StepSchool }
