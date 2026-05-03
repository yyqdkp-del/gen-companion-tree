'use client'
import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader, Check, X, Plus, Camera } from 'lucide-react'
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
function StepSchedule({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const [parsing, setParsing] = useState(false)
  const [parseSuccess, setParseSuccess] = useState(false)
  const [parseError, setParseError] = useState('')
  const [editDay, setEditDay] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const schedule = data.class_schedule || {}

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    setParseError('')
    setParseSuccess(false)
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const img = new Image()
        const url = URL.createObjectURL(file)
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.width
          canvas.height = img.height
          canvas.getContext('2d')?.drawImage(img, 0, 0)
          URL.revokeObjectURL(url)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
          res(dataUrl.split(',')[1])
        }
        img.onerror = rej
        img.src = url
      })
      const resp = await fetch('/api/children/parse-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mediaType: 'image/jpeg' }),
      })
      const result = await resp.json()
      if (result.error) throw new Error(result.error)
      onChange({ ...data, class_schedule: result.schedule })
      setParseSuccess(true)
      setTimeout(() => setParseSuccess(false), 3000)
    } catch (err: any) {
      setParseError('解析失败，请手动填写或重试')
    }
    setParsing(false)
  }

  const openEdit = (day: string) => {
    const dayData = schedule[day] || []
    const text = dayData.map((item: any) =>
      typeof item === 'object' ? `${item.time} ${item.subject}` : item
    ).join('\n')
    setEditText(text)
    setEditDay(day)
  }

  const saveEdit = () => {
    if (!editDay) return
    const slots = editText.split('\n').map(s => s.trim()).filter(Boolean).map(s => {
      const timeMatch = s.match(/^(\d{1,2}:\d{2})\s+(.+)$/)
      if (timeMatch) return { time: timeMatch[1], subject: timeMatch[2] }
      return { time: '', subject: s }
    })
    onChange({ ...data, class_schedule: { ...schedule, [editDay]: slots } })
    setEditDay(null)
  }

  const getDayCount = (day: string) => (schedule[day] || []).length

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, color: THEME.navy, marginBottom: 4 }}>课程表 📚</div>
      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 16, lineHeight: 1.6 }}>拍照识别或点击星期手动编辑</div>

      {/* 上传按钮 */}
      <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={handlePhoto} style={{ display: 'none' }} />

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => cameraRef.current?.click()}
          disabled={parsing}
          style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1.5px dashed ${parseSuccess ? '#16a34a' : THEME.gold}`, background: parseSuccess ? 'rgba(34,197,94,0.08)' : 'rgba(176,141,87,0.06)', color: parseSuccess ? '#16a34a' : THEME.gold, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {parsing ? <Loader size={16} /> : parseSuccess ? <Check size={16} /> : <Camera size={16} />}
          {parsing ? '识别中…' : parseSuccess ? '识别成功 ✓' : '拍照识别'}
        </motion.button>
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => fileRef.current?.click()}
          disabled={parsing}
          style={{ flex: 1, padding: '12px', borderRadius: 12, border: `1.5px dashed ${THEME.gold}`, background: 'rgba(176,141,87,0.06)', color: THEME.gold, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Plus size={16} />
          从相册上传
        </motion.button>
      </div>

      {parseError && (
        <div style={{ color: '#E07B2A', fontSize: 12, marginBottom: 12, padding: '8px 12px', borderRadius: 10, background: 'rgba(224,123,42,0.08)' }}>
          ⚠️ {parseError}
        </div>
      )}

      {/* 星期卡片，点击进入弹窗编辑 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DAYS.map(d => {
          const count = getDayCount(d.key)
          const dayData = schedule[d.key] || []
          const preview = dayData.slice(0, 2).map((item: any) =>
            typeof item === 'object' ? item.subject : item
          ).join(' · ')

          return (
            <motion.div key={d.key} whileTap={{ scale: 0.98 }}
              onClick={() => openEdit(d.key)}
              style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: count > 0 ? 'rgba(176,141,87,0.12)' : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 12 }}>
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
