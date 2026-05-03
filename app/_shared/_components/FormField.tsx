'use client'
import React from 'react'
import { THEME } from '../_constants/theme'

type FieldProps = {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
}

export function Field({ label, value, onChange, placeholder, type = 'text', required = false }: FieldProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700,
        marginBottom: 6, letterSpacing: '0.08em' }}>
        {label}{required && <span style={{ color: '#E05C45', marginLeft: 3 }}>*</span>}
      </div>
      <input type={type} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', padding: '11px 14px', borderRadius: 12,
          border: '1px solid rgba(0,0,0,0.1)',
          background: 'rgba(255,255,255,0.65)',
          fontSize: 14, color: THEME.text, outline: 'none',
          fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
    </div>
  )
}

type SelectFieldProps = {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}

export function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700,
        marginBottom: 6, letterSpacing: '0.08em' }}>{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: '11px 14px', borderRadius: 12,
          border: '1px solid rgba(0,0,0,0.1)',
          background: 'rgba(255,255,255,0.65)',
          fontSize: 14, color: THEME.text, outline: 'none',
          fontFamily: 'inherit', boxSizing: 'border-box' as const }}>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
