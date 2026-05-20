'use client'
import React, { useCallback } from 'react'
import { THEME } from '../_constants/theme'

const INPUT_BASE: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 12,
  border: '1.5px solid rgba(164,99,85,0.15)',
  background: '#f7f4ee',
  fontSize: 14,
  color: THEME.text,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

function applyFocus(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  el.style.borderColor = '#a46355'
  el.style.boxShadow = '0 0 0 3px rgba(164,99,85,0.08)'
}

function applyBlur(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement) {
  el.style.borderColor = 'rgba(164,99,85,0.15)'
  el.style.boxShadow = 'none'
}

type FieldProps = {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
}

export function Field({ label, value, onChange, placeholder, type = 'text', required = false }: FieldProps) {
  const onFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => applyFocus(e.currentTarget), [])
  const onBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => applyBlur(e.currentTarget), [])

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 6, letterSpacing: '0.08em' }}>
        {label}{required && <span style={{ color: '#a46355', marginLeft: 3 }}>*</span>}
      </div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        style={INPUT_BASE}
      />
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
  const onFocus = useCallback((e: React.FocusEvent<HTMLSelectElement>) => applyFocus(e.currentTarget), [])
  const onBlur = useCallback((e: React.FocusEvent<HTMLSelectElement>) => applyBlur(e.currentTarget), [])

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 6, letterSpacing: '0.08em' }}>
        {label}
      </div>
      <select value={value} onChange={e => onChange(e.target.value)} onFocus={onFocus} onBlur={onBlur} style={INPUT_BASE}>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
