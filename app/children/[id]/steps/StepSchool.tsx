'use client'
import React, { useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { THEME } from '@/app/_shared/_constants/theme'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'

function Field({ label, value, onChange, placeholder, type = 'text', onBlur }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; onBlur?: () => void
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 6, letterSpacing: '0.08em' }}>{label}</div>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} onBlur={onBlur} placeholder={placeholder}
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

function StepSchool({ data, onChange, schools }: { data: any; onChange: (d: any) => void; schools: any[] }) {
  const params = useParams()
  const childId = typeof params?.id === 'string' && params.id !== 'new' ? params.id : null
  const lastSyncKeyRef = useRef('')

  const triggerCalendarSync = useCallback((
    schoolName: string,
    grade: string,
    schoolWebsite?: string,
  ) => {
    const name = schoolName.trim()
    if (!childId || !name) return
    const website = (schoolWebsite || '').trim()
    const syncKey = `${childId}:${name}:${website}`
    if (lastSyncKeyRef.current === syncKey) return
    lastSyncKeyRef.current = syncKey

    void fetchWithAuth('/api/children/sync-school-calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        childId,
        schoolName: name,
        schoolWebsite: website || undefined,
        grade: grade || '',
      }),
    }).catch(() => {
      /* 后台同步，失败不打断填表；保存后 page 会再触发一次 */
    })
  }, [childId])

  const handleSchoolSelect = (schoolId: string) => {
    const school = schools.find(s => s.id === schoolId)
    const schoolName = school?.name_full || ''
    const next = {
      ...data,
      school_id: schoolId,
      school: schoolName,
      school_name: schoolName,
    }
    onChange(next)
    if (schoolId && schoolId !== 'other' && schoolName) {
      triggerCalendarSync(schoolName, next.grade || '', data.school_website)
    }
  }

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, color: THEME.navy, marginBottom: 20 }}>学校信息 🏫</div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 6, letterSpacing: '0.08em' }}>就读学校</div>
        <select value={data.school_id || ''} onChange={e => handleSchoolSelect(e.target.value)}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.65)', fontSize: 14, color: THEME.text, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', appearance: 'none' }}>
          <option value="">请选择学校</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.name_full} ({s.name_short})</option>)}
          <option value="other">其他学校</option>
        </select>
      </div>

      {data.school_id === 'other' && (
        <Field
          label="学校名称"
          value={data.school || data.school_name || ''}
          onChange={v => onChange({ ...data, school: v, school_name: v })}
          onBlur={() => {
            const name = (data.school || data.school_name || '').trim()
            if (name) triggerCalendarSync(name, data.grade || '', data.school_website)
          }}
          placeholder="输入学校全名"
        />
      )}

      <Field
        label="学校官网（选填）"
        type="url"
        value={data.school_website || ''}
        onChange={v => onChange({ ...data, school_website: v })}
        onBlur={() => {
          const website = (data.school_website || '').trim()
          const name = (data.school_name || data.school || '').trim()
          if (website && name) triggerCalendarSync(name, data.grade || '', website)
        }}
        placeholder="学校官网（选填，如 https://www.nis.ac.th）"
      />

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

export { StepSchool }
