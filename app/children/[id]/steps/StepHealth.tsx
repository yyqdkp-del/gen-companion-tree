'use client'
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Plus } from 'lucide-react'
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
function StepHealth({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const [showHospitalPicker, setShowHospitalPicker] = useState(false)
  const [customHospital, setCustomHospital] = useState('')

  const hospitals: any[] = data.preferred_hospitals || []

  const addHospital = (name: string, phone: string) => {
    if (hospitals.find((h: any) => h.name === name)) return
    onChange({ ...data, preferred_hospitals: [...hospitals, { name, phone }] })
  }

  const removeHospital = (i: number) => {
    onChange({ ...data, preferred_hospitals: hospitals.filter((_: any, idx: number) => idx !== i) })
  }

  const addCustomHospital = () => {
    if (!customHospital.trim()) return
    addHospital(customHospital.trim(), '')
    setCustomHospital('')
  }

  const parseArray = (val: any): string[] => {
    if (Array.isArray(val)) return val
    if (typeof val === 'string' && val) {
      try { const p = JSON.parse(val); return Array.isArray(p) ? p : [val] } catch { return [val] }
    }
    return ['无']
  }

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, color: THEME.navy, marginBottom: 4 }}>健康信息 🏥</div>
      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 20, lineHeight: 1.6 }}>用于就诊卡和紧急情况</div>

      {/* 血型 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 8, letterSpacing: '0.08em' }}>血型</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {BLOOD_TYPES.map(bt => (
            <motion.div key={bt} whileTap={{ scale: 0.92 }}
              onClick={() => onChange({ ...data, blood_type: bt })}
              style={{ padding: '7px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', background: data.blood_type === bt ? 'rgba(176,141,87,0.15)' : 'rgba(255,255,255,0.6)', border: data.blood_type === bt ? `1.5px solid ${THEME.gold}` : '1px solid rgba(0,0,0,0.1)', color: data.blood_type === bt ? THEME.gold : THEME.text, fontWeight: data.blood_type === bt ? 600 : 400 }}>
              {bt}
            </motion.div>
          ))}
        </div>
      </div>

      <MultiSelect label="过敏史" options={ALLERGY_OPTIONS} selected={parseArray(data.allergies)} onChange={v => onChange({ ...data, allergies: v })} />
      <MultiSelect label="慢性病 / 医疗状况" options={CONDITION_OPTIONS} selected={parseArray(data.medical_conditions)} onChange={v => onChange({ ...data, medical_conditions: v })} />
      <MultiSelect label="当前用药" options={MEDICATION_OPTIONS} selected={parseArray(data.medications_current)} onChange={v => onChange({ ...data, medications_current: v })} />

      {/* 常用医院 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 8, letterSpacing: '0.08em' }}>常用医院</div>

        {/* 已选医院列表 */}
        {hospitals.map((h: any, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(176,141,87,0.08)', border: '1px solid rgba(176,141,87,0.2)', marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: THEME.text }}>{h.name}</div>
              {h.phone && <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>📞 {h.phone}</div>}
            </div>
            <motion.button whileTap={{ scale: 0.85 }} onClick={() => removeHospital(i)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: THEME.muted, flexShrink: 0 }}>
              <X size={14} />
            </motion.button>
          </div>
        ))}

        {/* 从预设选择 */}
        <motion.button whileTap={{ scale: 0.97 }}
          onClick={() => setShowHospitalPicker(!showHospitalPicker)}
          style={{ width: '100%', padding: '10px', borderRadius: 12, border: `1.5px dashed rgba(176,141,87,0.4)`, background: 'transparent', color: THEME.gold, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
          <Plus size={14} /> 从清迈医院列表选择
        </motion.button>

        {/* 医院选择器 */}
        <AnimatePresence>
          {showHospitalPicker && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 14, padding: '14px', border: '1px solid rgba(0,0,0,0.07)', maxHeight: 320, overflowY: 'auto' }}>
                {PRESET_HOSPITALS.map(cat => (
                  <div key={cat.category} style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: THEME.gold, fontWeight: 700, letterSpacing: '0.05em', marginBottom: 8 }}>{cat.category}</div>
                    {cat.hospitals.map(h => {
                      const isAdded = hospitals.find((added: any) => added.name === h.name)
                      return (
                        <motion.div key={h.name} whileTap={{ scale: 0.98 }}
                          onClick={() => { if (!isAdded) addHospital(h.name, h.phone) }}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 10, marginBottom: 6, background: isAdded ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.6)', border: isAdded ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(0,0,0,0.06)', cursor: isAdded ? 'default' : 'pointer' }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: THEME.text }}>{h.name}</div>
                            <div style={{ fontSize: 11, color: THEME.muted }}>📞 {h.phone}</div>
                          </div>
                          {isAdded
                            ? <Check size={14} color="#16a34a" />
                            : <Plus size={14} color={THEME.muted} />
                          }
                        </motion.div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 手动添加 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={customHospital} onChange={e => setCustomHospital(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCustomHospital()}
            placeholder="手动输入医院名称"
            style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.65)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
          <motion.button whileTap={{ scale: 0.95 }} onClick={addCustomHospital}
            style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: THEME.navy, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
            添加
          </motion.button>
        </div>
      </div>

      <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(154,183,232,0.12)', fontSize: 12, color: THEME.muted, lineHeight: 1.7 }}>
        💡 健康信息用于生成就诊卡和学校紧急联系表
      </div>
    </div>
  )
}

// ── 主组件 ──

export { StepHealth }
