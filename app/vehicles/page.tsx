'use client'

import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Car, Loader, Plus, Trash2, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { THEME } from '@/app/_shared/_constants/theme'
import { NAV_HEIGHT_CSS } from '@/app/_shared/_constants/layout'
import type { Vehicle } from '@/app/_shared/_types'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'

const supabase = createClient()

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return null
  return Math.ceil((t - Date.now()) / 86400000)
}

function expiryStyle(days: number | null) {
  if (days == null) return { color: THEME.muted, bg: 'transparent' }
  if (days <= 7) return { color: '#B91C1C', bg: 'rgba(239,68,68,0.12)' }
  if (days <= 30) return { color: '#B45309', bg: 'rgba(251,191,36,0.15)' }
  return { color: THEME.muted, bg: 'transparent' }
}

const emptyForm: Vehicle = {
  nickname: '', make: '', model: '', year: '', license_plate: '', color: '', vin: '',
  insurance_company: '', insurance_policy: '', insurance_expiry: '', insurance_phone: '',
  roadside_assistance: '', registration_expiry: '',
}

export default function VehiclesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [list, setList] = useState<Vehicle[]>([])
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<Vehicle>(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) {
      router.push('/auth')
      return
    }
    const { data, error } = await supabase.from('vehicles').select('*').eq('user_id', session.user.id).order('updated_at', { ascending: false })
    if (error) {
      console.warn(error.message)
      setList([])
    } else {
      setList(data || [])
    }
    setLoading(false)
  }, [router])

  useEffect(() => { void load() }, [load])

  const openNew = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  const openEdit = (v: Vehicle) => {
    setEditing(v)
    setForm({ ...emptyForm, ...v })
    setFormOpen(true)
  }

  const save = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const uid = session?.user?.id
    if (!uid) return
    setSaving(true)
    try {
      const row = {
        user_id: uid,
        nickname: form.nickname || null,
        make: form.make || null,
        model: form.model || null,
        year: form.year || null,
        license_plate: form.license_plate || null,
        color: form.color || null,
        vin: form.vin || null,
        insurance_company: form.insurance_company || null,
        insurance_policy: form.insurance_policy || null,
        insurance_expiry: form.insurance_expiry || null,
        insurance_phone: form.insurance_phone || null,
        roadside_assistance: form.roadside_assistance || null,
        registration_expiry: form.registration_expiry || null,
        updated_at: new Date().toISOString(),
      }
      if (editing?.id) {
        const { error } = await supabase.from('vehicles').update(row).eq('id', editing.id).eq('user_id', uid)
        if (error) throw error
      } else {
        const { error } = await supabase.from('vehicles').insert(row)
        if (error) throw error
      }
      setEditing(null)
      setForm(emptyForm)
      setFormOpen(false)
      await load()
    } catch (e) {
      logOrAlertNetworkError(e)
    }
    setSaving(false)
  }

  const remove = async (id: string) => {
    if (!confirm('确定删除这辆车？')) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return
    await supabase.from('vehicles').delete().eq('id', id).eq('user_id', session.user.id)
    await load()
  }

  const Field = ({ label, value, onChange, type = 'text', placeholder }: {
    label: string
    value: string
    onChange: (v: string) => void
    type?: string
    placeholder?: string
  }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.1)',
          background: 'rgba(255,255,255,0.75)', fontSize: 14, color: THEME.text, boxSizing: 'border-box',
        }}
      />
    </div>
  )

  return (
    <main style={{
      minHeight: '100dvh', background: THEME.bg, fontFamily: "'Noto Sans SC', sans-serif",
      paddingBottom: NAV_HEIGHT_CSS,
    }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 16px', background: 'rgba(167,215,217,0.9)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.35)',
      }}>
        <motion.button type="button" whileTap={{ scale: 0.92 }} onClick={() => router.back()}
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: THEME.navy }}>
          <ArrowLeft size={22} />
        </motion.button>
        <Car size={22} color={THEME.navy} />
        <span style={{ fontSize: 17, fontWeight: 700, color: THEME.navy }}>车辆档案</span>
      </header>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '16px 16px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 13, color: THEME.muted }}>车险 · 年检 · 事故一键办会用到</span>
          <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={openNew}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 12,
              border: 'none', background: THEME.navy, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
            <Plus size={16} /> 添加车辆
          </motion.button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: THEME.muted, display: 'flex', justifyContent: 'center' }}>
            <Loader size={28} style={{ animation: 'spin 0.9s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : list.length === 0 && !formOpen ? (
          <div style={{ textAlign: 'center', padding: 32, color: THEME.muted, fontSize: 14 }}>
            暂无车辆，点击「添加车辆」录入保险与救援电话，便于事故处理一键办。
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {list.map(v => {
              const insD = daysUntil(v.insurance_expiry)
              const regD = daysUntil(v.registration_expiry)
              const insS = expiryStyle(insD)
              const regS = expiryStyle(regD)
              return (
                <div key={v.id}
                  style={{
                    borderRadius: 16, padding: '14px 16px',
                    background: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.85)',
                    boxShadow: '0 6px 24px rgba(0,0,0,0.06)',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: THEME.text }}>
                        {v.nickname || '未命名车辆'}
                      </div>
                      <div style={{ fontSize: 13, color: THEME.muted, marginTop: 4 }}>
                        {[v.make, v.model, v.year].filter(Boolean).join(' · ') || '—'}
                        {v.license_plate ? ` · ${v.license_plate}` : ''}
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 8, ...insS }}>
                          保险到期 {v.insurance_expiry || '未填'}
                          {insD != null && insD <= 30 ? `（${insD} 天）` : ''}
                        </span>
                        <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 8, ...regS }}>
                          年检到期 {v.registration_expiry || '未填'}
                          {regD != null && regD <= 30 ? `（${regD} 天）` : ''}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={() => v.id && openEdit(v)}
                        style={{ border: 'none', background: 'rgba(0,0,0,0.05)', borderRadius: 10, padding: 8, cursor: 'pointer' }}>
                        <Pencil size={16} color={THEME.navy} />
                      </motion.button>
                      <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={() => v.id && remove(v.id)}
                        style={{ border: 'none', background: '#fff2f0', borderRadius: 10, padding: 8, cursor: 'pointer' }}>
                        <Trash2 size={16} color="#7d3f37" />
                      </motion.button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {(formOpen) && (
          <div style={{
            marginTop: 20, borderRadius: 18, padding: '18px 16px',
            background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.9)',
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: THEME.navy, marginBottom: 12 }}>
              {editing ? '编辑车辆' : '新车辆'}
            </div>
            <Field label="昵称（如：妈妈的车）" value={form.nickname || ''} onChange={v => setForm({ ...form, nickname: v })} />
            <Field label="品牌" value={form.make || ''} onChange={v => setForm({ ...form, make: v })} />
            <Field label="型号" value={form.model || ''} onChange={v => setForm({ ...form, model: v })} />
            <Field label="年份" value={form.year || ''} onChange={v => setForm({ ...form, year: v })} />
            <Field label="车牌号" value={form.license_plate || ''} onChange={v => setForm({ ...form, license_plate: v })} />
            <Field label="颜色" value={form.color || ''} onChange={v => setForm({ ...form, color: v })} />
            <Field label="车架号 VIN" value={form.vin || ''} onChange={v => setForm({ ...form, vin: v })} />
            <Field label="保险公司" value={form.insurance_company || ''} onChange={v => setForm({ ...form, insurance_company: v })} />
            <Field label="保险单号" value={form.insurance_policy || ''} onChange={v => setForm({ ...form, insurance_policy: v })} />
            <Field label="保险到期日" value={form.insurance_expiry || ''} onChange={v => setForm({ ...form, insurance_expiry: v })} type="date" />
            <Field label="保险公司电话" value={form.insurance_phone || ''} onChange={v => setForm({ ...form, insurance_phone: v })} placeholder="+66…" />
            <Field label="道路救援电话" value={form.roadside_assistance || ''} onChange={v => setForm({ ...form, roadside_assistance: v })} />
            <Field label="年检到期日" value={form.registration_expiry || ''} onChange={v => setForm({ ...form, registration_expiry: v })} type="date" />
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <motion.button type="button" whileTap={{ scale: 0.97 }} onClick={() => { setFormOpen(false); setEditing(null); setForm(emptyForm) }}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', cursor: 'pointer' }}>
                取消
              </motion.button>
              <motion.button type="button" whileTap={{ scale: 0.97 }} disabled={saving} onClick={() => void save()}
                style={{ flex: 2, padding: 12, borderRadius: 12, border: 'none', background: THEME.navy, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                {saving ? '保存中…' : '保存'}
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
