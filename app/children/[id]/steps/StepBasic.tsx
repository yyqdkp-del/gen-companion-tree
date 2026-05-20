'use client'
import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Loader, Camera, Check } from 'lucide-react'
import { THEME } from '@/app/_shared/_constants/theme'
import { createClient } from '@/lib/supabase/client'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'
import { sanitizeFileName } from '@/lib/storage/sanitizeFileName'

const supabase = createClient()

const EMOJIS = ['🌟', '🌈', '🦁', '🐼', '🦊', '🐬', '🦋', '🌸', '🍀', '🎨', '🚀', '⚽']

const BLOOD_TYPES = ['不知道', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

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

function TextAreaField({ label, value, onChange, placeholder }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 6, letterSpacing: '0.08em' }}>{label}</div>
      <textarea
        rows={3}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)',
          background: 'rgba(255,255,255,0.65)', fontSize: 14, color: THEME.text, outline: 'none',
          boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical',
        }}
      />
    </div>
  )
}

function StepBasic({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [showPassport, setShowPassport] = useState(
    !!(data.passport_number || data.passport_expiry),
  )
  const photoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setShowPassport(!!(data.passport_number || data.passport_expiry))
  }, [data.passport_number, data.passport_expiry])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadSuccess(false)
    try {
      const path = `children/${sanitizeFileName(file.name)}`
      const { error } = await supabase.storage.from('companion-files').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('companion-files').getPublicUrl(path)
      onChange({ ...data, avatar_url: urlData.publicUrl })
      setUploadSuccess(true)
      setTimeout(() => setUploadSuccess(false), 3000)
    } catch (e) {
      logOrAlertNetworkError(e)
    }
    setUploading(false)
  }

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, color: THEME.navy, marginBottom: 20 }}>孩子是谁？🌱</div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 10, letterSpacing: '0.08em' }}>头像</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, overflow: 'hidden', border: '2px solid rgba(164,99,85,0.3)', flexShrink: 0, background: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
            {data.avatar_url
              ? <img src={data.avatar_url} alt="头像" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : data.emoji || '🌟'
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => photoRef.current?.click()}
              disabled={uploading}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: `1.5px dashed rgba(164,99,85,0.4)`, background: uploadSuccess ? 'rgba(34,197,94,0.08)' : 'rgba(164,99,85,0.06)', color: uploadSuccess ? '#16a34a' : THEME.gold, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
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
                style={{ width: 42, height: 42, borderRadius: 12, background: data.emoji === e ? 'rgba(164,99,85,0.2)' : 'rgba(255,255,255,0.5)', border: data.emoji === e ? `2px solid ${THEME.gold}` : '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, cursor: 'pointer' }}>
                {e}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Field label="孩子名字" value={data.name} onChange={v => onChange({ ...data, name: v })} placeholder="小明 / William" />
      <Field label="生日" value={data.birthdate} onChange={v => onChange({ ...data, birthdate: v })} type="date" />

      <SelectField
        label="血型"
        value={data.blood_type || '不知道'}
        onChange={v => onChange({ ...data, blood_type: v })}
        options={BLOOD_TYPES.map(bt => ({ value: bt, label: bt }))}
      />
      <TextAreaField
        label="过敏史"
        value={data.allergies_text || ''}
        onChange={v => onChange({ ...data, allergies_text: v })}
        placeholder="无过敏可留空，或写明过敏原与反应"
      />

      <div>
        <button
          type="button"
          onClick={() => setShowPassport(!showPassport)}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px 0',
            fontSize: 13,
            color: '#a46355',
            cursor: 'pointer',
            fontFamily: 'sans-serif',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {showPassport ? '▼' : '▶'} 护照信息（选填）
        </button>
        {showPassport && (
          <div>
            <Field label="护照号" value={data.passport_number || ''} onChange={v => onChange({ ...data, passport_number: v })} placeholder="如有请填写" />
            <Field label="护照到期日" value={data.passport_expiry || ''} onChange={v => onChange({ ...data, passport_expiry: v })} type="date" />
            <Field label="国籍" value={data.nationality || ''} onChange={v => onChange({ ...data, nationality: v })} placeholder="如：中国" />
          </div>
        )}
      </div>

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
                style={{ padding: '7px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', background: selected ? 'rgba(164,99,85,0.15)' : 'rgba(255,255,255,0.5)', border: selected ? `1.5px solid ${THEME.gold}` : '1px solid rgba(0,0,0,0.1)', color: selected ? THEME.gold : THEME.text, fontWeight: selected ? 600 : 400 }}>
                {lang}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export { StepBasic }
