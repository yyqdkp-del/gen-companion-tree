'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, X, Check, Loader, Camera, Pause, Play, Trash2 } from 'lucide-react'

const supabase = createClient()

const THEME = {
  bg: 'linear-gradient(180deg, #A7D7D9 0%, #D9A7B4 100%)',
  text: '#2C3E50', gold: '#B08D57', navy: '#1A3C5E', muted: '#6B8BAA',
}

const CATEGORIES = [
  { value: 'sport', label: '体育竞技', emoji: '⚽', color: '#2D6A4F' },
  { value: 'art', label: '艺术美育', emoji: '🎨', color: '#7C3AED' },
  { value: 'academic', label: '学科补习', emoji: '📚', color: '#1A3C5E' },
  { value: 'tech', label: '科技探索', emoji: '🤖', color: '#0891B2' },
  { value: 'other', label: '其他', emoji: '🌟', color: '#B08D57' },
]

const PRESET_ACTIVITIES: Record<string, { name: string; location?: string }[]> = {
  sport: [
    { name: '高尔夫', location: 'North Hill / Summit Green Valley' },
    { name: '网球', location: '700年体育场' },
    { name: '马术', location: 'Phoenix Riding' },
    { name: '足球 BSS', location: '巴西足球学校' },
    { name: '游泳', location: '700年体育场' },
    { name: '泰拳', location: 'Santai Muay Thai' },
    { name: '攀岩', location: 'CMRCA' },
  ],
  art: [
    { name: '钢琴 Yamaha', location: 'Yamaha 各大商场' },
    { name: '小提琴', location: 'Kawai Music School' },
    { name: '绘画', location: 'Clay Art / Noina Studio' },
    { name: '芭蕾', location: 'Chiang Mai Ballet' },
    { name: '陶艺', location: 'Inclay Studio' },
    { name: '舞蹈', location: 'Dance Zone' },
  ],
  academic: [
    { name: '英语 British Council', location: '尼曼路' },
    { name: '英语 AUA', location: '瓦落落' },
    { name: '数学 Kumon', location: '全城分布' },
    { name: '中文 LingoAce', location: '线上' },
    { name: '中文 悟空中文', location: '线上' },
    { name: '泰语', location: 'TSL / NES' },
  ],
  tech: [
    { name: '编程 Robot\'s Child', location: 'Maya商场' },
    { name: '机器人 Beyond Code', location: 'Central' },
    { name: '国际象棋', location: 'Central Festival' },
  ],
}

const DAYS = [
  { key: 'mon', label: '周一' },
  { key: 'tue', label: '周二' },
  { key: 'wed', label: '周三' },
  { key: 'thu', label: '周四' },
  { key: 'fri', label: '周五' },
  { key: 'sat', label: '周六' },
  { key: 'sun', label: '周日' },
]

type Activity = {
  id: string
  name: string
  category: string
  type: string
  days: string[]
  start_time: string
  end_time: string
  location: string
  monthly_fee: number | null
  attachment_url: string | null
  notes: string
  is_active: boolean
}

type FormData = {
  name: string
  category: string
  type: string
  days: string[]
  start_time: string
  end_time: string
  location: string
  monthly_fee: string
  notes: string
}

const EMPTY_FORM: FormData = {
  name: '', category: 'sport', type: 'activity',
  days: [], start_time: '', end_time: '',
  location: '', monthly_fee: '', notes: '',
}

function ActivityForm({ form, setForm, onSave, onCancel, saving, childId }: {
  form: FormData
  setForm: (f: FormData) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  childId: string
}) {
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [showPreset, setShowPreset] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAttachment(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `activities/${childId}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('companion-files').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('companion-files').getPublicUrl(path)
      setAttachmentUrl(urlData.publicUrl)
    } catch (e) {
      console.error('上传失败', e)
    }
    setUploadingAttachment(false)
  }

  const toggleDay = (day: string) => {
    const days = form.days.includes(day)
      ? form.days.filter(d => d !== day)
      : [...form.days, day]
    setForm({ ...form, days })
  }

  const selectPreset = (preset: { name: string; location?: string }) => {
    setForm({ ...form, name: preset.name, location: preset.location || form.location })
    setShowPreset(false)
  }

  const currentCategory = CATEGORIES.find(c => c.value === form.category) || CATEGORIES[0]
  const presets = PRESET_ACTIVITIES[form.category] || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* 类别选择 */}
      <div>
        <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 8 }}>类别</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <motion.div key={cat.value} whileTap={{ scale: 0.92 }}
              onClick={() => setForm({ ...form, category: cat.value })}
              style={{ padding: '7px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, background: form.category === cat.value ? `${cat.color}15` : 'rgba(255,255,255,0.6)', border: form.category === cat.value ? `1.5px solid ${cat.color}` : '1px solid rgba(0,0,0,0.08)', color: form.category === cat.value ? cat.color : THEME.muted, fontWeight: form.category === cat.value ? 600 : 400 }}>
              {cat.emoji} {cat.label}
            </motion.div>
          ))}
        </div>
      </div>

      {/* 机构名称 + 预设 */}
      <div>
        <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 8 }}>机构 / 课程名称</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="如：Yamaha 钢琴、BSS 足球"
            style={{ flex: 1, padding: '11px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.65)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
          {presets.length > 0 && (
            <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowPreset(!showPreset)}
              style={{ padding: '11px 14px', borderRadius: 12, border: `1px solid ${THEME.gold}`, background: 'rgba(176,141,87,0.06)', color: THEME.gold, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              从列表选
            </motion.button>
          )}
        </div>

        {/* 预设列表 */}
        <AnimatePresence>
          {showPreset && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden', marginTop: 8 }}>
              <div style={{ background: 'rgba(255,255,255,0.8)', borderRadius: 12, padding: '8px', border: '1px solid rgba(0,0,0,0.08)', maxHeight: 200, overflowY: 'auto' }}>
                {presets.map((preset, i) => (
                  <motion.div key={i} whileTap={{ scale: 0.98 }} onClick={() => selectPreset(preset)}
                    style={{ padding: '9px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: THEME.text }}>{preset.name}</div>
                    {preset.location && <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>{preset.location}</div>}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 上课天数 */}
      <div>
        <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 8 }}>上课日期（可多选）</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {DAYS.map(d => (
            <motion.div key={d.key} whileTap={{ scale: 0.9 }}
              onClick={() => toggleDay(d.key)}
              style={{ flex: 1, padding: '8px 4px', borderRadius: 10, textAlign: 'center', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: form.days.includes(d.key) ? THEME.navy : 'rgba(255,255,255,0.6)', color: form.days.includes(d.key) ? '#fff' : THEME.muted, border: form.days.includes(d.key) ? 'none' : '1px solid rgba(0,0,0,0.08)' }}>
              {d.label}
            </motion.div>
          ))}
        </div>
      </div>

      {/* 时间 */}
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 6 }}>开始时间</div>
          <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}
            style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.65)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 6 }}>结束时间</div>
          <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })}
            style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.65)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* 地点 */}
      <div>
        <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 6 }}>地点</div>
        <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
          placeholder="如：尼曼路 Yamaha / 700年体育场"
          style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.65)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
      </div>

      {/* 月费 */}
      <div>
        <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 6 }}>月费（泰铢，可选）</div>
        <input type="number" value={form.monthly_fee} onChange={e => setForm({ ...form, monthly_fee: e.target.value })}
          placeholder="如：3000"
          style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.65)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
      </div>

      {/* 上传课程通知单 */}
      <div>
        <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 6 }}>课程通知单（可选）</div>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={handleAttachment} style={{ display: 'none' }} />
        <motion.button whileTap={{ scale: 0.96 }} onClick={() => fileRef.current?.click()}
          disabled={uploadingAttachment}
          style={{ width: '100%', padding: '11px', borderRadius: 12, border: `1.5px dashed ${attachmentUrl ? '#16a34a' : 'rgba(176,141,87,0.4)'}`, background: attachmentUrl ? 'rgba(34,197,94,0.06)' : 'transparent', color: attachmentUrl ? '#16a34a' : THEME.gold, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {uploadingAttachment ? <Loader size={14} /> : attachmentUrl ? <Check size={14} /> : <Camera size={14} />}
          {uploadingAttachment ? '上传中…' : attachmentUrl ? '已上传 ✓' : '拍照或上传通知单'}
        </motion.button>
      </div>

      {/* 备注 */}
      <div>
        <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 6 }}>备注（可选）</div>
        <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
          placeholder="如：需要带球鞋、老师是外教…"
          rows={2}
          style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.65)', fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
      </div>

      {/* 按钮 */}
      <div style={{ display: 'flex', gap: 10 }}>
        <motion.button whileTap={{ scale: 0.97 }} onClick={onCancel}
          style={{ flex: 1, padding: '13px', borderRadius: 14, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', fontSize: 14, color: THEME.muted, cursor: 'pointer' }}>
          取消
        </motion.button>
        <motion.button whileTap={{ scale: 0.97 }} onClick={onSave} disabled={saving || !form.name.trim()}
          style={{ flex: 2, padding: '13px', borderRadius: 14, border: 'none', background: form.name.trim() ? THEME.navy : 'rgba(0,0,0,0.08)', color: form.name.trim() ? '#fff' : THEME.muted, fontSize: 14, fontWeight: 600, cursor: form.name.trim() ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {saving ? <Loader size={16} /> : <Check size={16} />}
          {saving ? '保存中…' : '保存活动'}
        </motion.button>
      </div>
    </div>
  )
}

function ActivitiesContent() {
  const router = useRouter()
  const params = useParams()
  const childId = params.id as string

  const [activities, setActivities] = useState<Activity[]>([])
  const [childName, setChildName] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    const [childRes, activitiesRes] = await Promise.all([
      supabase.from('children').select('name').eq('id', childId).single(),
      supabase.from('child_activities').select('*').eq('child_id', childId).order('created_at'),
    ])

    if (childRes.data) setChildName(childRes.data.name)
    if (activitiesRes.data) setActivities(activitiesRes.data)
    setLoading(false)
  }

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowForm(true)
  }

  const openEdit = (activity: Activity) => {
    setForm({
      name: activity.name || '',
      category: activity.category || 'sport',
      type: activity.type || 'activity',
      days: activity.days || [],
      start_time: activity.start_time || '',
      end_time: activity.end_time || '',
      location: activity.location || '',
      monthly_fee: activity.monthly_fee?.toString() || '',
      notes: activity.notes || '',
    })
    setEditingId(activity.id)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)

    const { data: { session } } = await supabase.auth.getSession()
    const uid = session?.user?.id
    if (!uid) { setSaving(false); return }

    const payload = {
      child_id: childId,
      user_id: uid,
      name: form.name,
      category: form.category,
      type: form.type,
      days: form.days,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      location: form.location,
      monthly_fee: form.monthly_fee ? parseInt(form.monthly_fee) : null,
      notes: form.notes,
      is_active: true,
      // 预留适配度推算接口
      compatibility_score: null,
      compatibility_notes: null,
      recommended_by: null,
    }

    if (editingId) {
      await supabase.from('child_activities').update(payload).eq('id', editingId)
    } else {
      await supabase.from('child_activities').insert(payload)
    }

    await loadData()
    setShowForm(false)
    setSaving(false)
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    await supabase.from('child_activities').update({ is_active: !isActive }).eq('id', id)
    setActivities(prev => prev.map(a => a.id === id ? { ...a, is_active: !isActive } : a))
  }

  const handleDelete = async (id: string) => {
    await supabase.from('child_activities').delete().eq('id', id)
    setActivities(prev => prev.filter(a => a.id !== id))
    setDeleteConfirm(null)
  }

  // 按类别分组
  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: activities.filter(a => a.category === cat.value),
  })).filter(g => g.items.length > 0)

  const totalMonthly = activities
    .filter(a => a.is_active && a.monthly_fee)
    .reduce((sum, a) => sum + (a.monthly_fee || 0), 0)

  return (
    <main style={{ minHeight: '100dvh', background: THEME.bg, fontFamily: "'Noto Sans SC', sans-serif", paddingBottom: 80 }}>

      {/* 顶部 */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(167,215,217,0.85)', backdropFilter: 'blur(20px)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: THEME.navy, padding: 4 }}>
          <ArrowLeft size={20} />
        </motion.button>
        <span style={{ fontSize: 15, fontWeight: 700, color: THEME.navy }}>
          {childName ? `${childName}的课外活动` : '课外活动'}
        </span>
        <motion.button whileTap={{ scale: 0.9 }} onClick={openAdd}
          style={{ background: THEME.navy, border: 'none', cursor: 'pointer', color: '#fff', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={16} />
        </motion.button>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '16px 14px' }}>

        {/* 月费汇总 */}
        {totalMonthly > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: 16, padding: '14px 16px', marginBottom: 16, border: '1px solid rgba(176,141,87,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: THEME.muted }}>本月课外活动总费用</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: THEME.gold }}>฿{totalMonthly.toLocaleString()}</div>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: THEME.muted, fontSize: 14 }}>加载中…</div>
        ) : activities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: THEME.navy, marginBottom: 8 }}>还没有课外活动</div>
            <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 24 }}>添加孩子的兴趣班和补习课</div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={openAdd}
              style={{ padding: '12px 28px', borderRadius: 20, background: THEME.navy, color: '#fff', border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              + 添加第一个活动
            </motion.button>
          </div>
        ) : (
          <>
            {grouped.map(group => (
              <div key={group.value} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: group.color, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {group.emoji} {group.label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {group.items.map(activity => (
                    <motion.div key={activity.id} whileTap={{ scale: 0.98 }}
                      style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 16, padding: '14px 16px', border: `1px solid ${activity.is_active ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.06)'}`, opacity: activity.is_active ? 1 : 0.5 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text, marginBottom: 4 }}>{activity.name}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {activity.days?.map(d => (
                              <span key={d} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: `${group.color}15`, color: group.color, fontWeight: 600 }}>
                                {DAYS.find(day => day.key === d)?.label}
                              </span>
                            ))}
                            {activity.start_time && (
                              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: 'rgba(0,0,0,0.05)', color: THEME.muted }}>
                                {activity.start_time.slice(0, 5)}{activity.end_time ? ` - ${activity.end_time.slice(0, 5)}` : ''}
                              </span>
                            )}
                            {activity.monthly_fee && (
                              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 8, background: 'rgba(176,141,87,0.1)', color: THEME.gold, fontWeight: 600 }}>
                                ฿{activity.monthly_fee.toLocaleString()}/月
                              </span>
                            )}
                          </div>
                          {activity.location && (
                            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>📍 {activity.location}</div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                          <motion.button whileTap={{ scale: 0.85 }} onClick={() => toggleActive(activity.id, activity.is_active)}
                            style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: activity.is_active ? 'rgba(176,141,87,0.1)' : 'rgba(29,158,117,0.1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {activity.is_active ? <Pause size={12} color={THEME.gold} /> : <Play size={12} color="#1D9E75" />}
                          </motion.button>
                          <motion.button whileTap={{ scale: 0.85 }} onClick={() => openEdit(activity)}
                            style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(26,60,94,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: THEME.navy }}>
                            ✏️
                          </motion.button>
                          <motion.button whileTap={{ scale: 0.85 }} onClick={() => setDeleteConfirm(activity.id)}
                            style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(220,38,38,0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trash2 size={12} color="#DC2626" />
                          </motion.button>
                        </div>
                      </div>
                      {activity.notes && (
                        <div style={{ fontSize: 11, color: THEME.muted, background: 'rgba(0,0,0,0.03)', borderRadius: 8, padding: '6px 10px', marginTop: 4 }}>
                          💬 {activity.notes}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* 添加/编辑表单弹窗 */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={() => setShowForm(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 560, background: 'rgba(255,255,255,0.97)', borderRadius: '20px 20px 0 0', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
                <div style={{ width: 36, height: 4, background: 'rgba(0,0,0,0.1)', borderRadius: 2, margin: '0 auto 16px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: THEME.navy }}>
                    {editingId ? '编辑活动' : '添加课外活动'}
                  </div>
                  <motion.button whileTap={{ scale: 0.85 }} onClick={() => setShowForm(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: THEME.muted }}>
                    <X size={20} />
                  </motion.button>
                </div>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px 40px', WebkitOverflowScrolling: 'touch' as any }}>
                <ActivityForm
                  form={form}
                  setForm={setForm}
                  onSave={handleSave}
                  onCancel={() => setShowForm(false)}
                  saving={saving}
                  childId={childId}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 删除确认 */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 20, padding: '24px 20px', maxWidth: 320, width: '100%', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🗑️</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: THEME.text, marginBottom: 8 }}>确认删除？</div>
              <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 24 }}>删除后无法恢复</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setDeleteConfirm(null)}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', fontSize: 14, color: THEME.muted, cursor: 'pointer' }}>
                  取消
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleDelete(deleteConfirm)}
                  style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#DC2626', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  删除
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </main>
  )
}

export default function ActivitiesPage() {
  return (
    <Suspense>
      <ActivitiesContent />
    </Suspense>
  )
}
