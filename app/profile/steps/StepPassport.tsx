'use client'
import React from 'react'
import { Field, SelectField } from '@/app/_shared/_components/FormField'
import { THEME } from '@/app/_shared/_constants/theme'

function StepPassport({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, color: THEME.navy, marginBottom: 4 }}>证件信息 📋</div>
      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 20, lineHeight: 1.6 }}>仅用于预填表格，不会对外共享</div>
      <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(176,141,87,0.08)', borderLeft: '3px solid rgba(176,141,87,0.4)', marginBottom: 20, fontSize: 12, color: THEME.text, lineHeight: 1.7 }}>
        🔐 证件信息存储于加密数据库
      </div>
      <div style={{ fontSize: 12, color: THEME.gold, fontWeight: 700, marginBottom: 12 }}>护照</div>
      <Field label="护照号码" value={data.passport_number} onChange={v => onChange({ ...data, passport_number: v })} placeholder="E12345678" />
      <Field label="护照到期日" value={data.passport_expiry} onChange={v => onChange({ ...data, passport_expiry: v })} type="date" />
      <Field label="护照签发地" value={data.passport_issue_place} onChange={v => onChange({ ...data, passport_issue_place: v })} placeholder="北京" />
      <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '20px 0' }} />
      <div style={{ fontSize: 12, color: THEME.gold, fontWeight: 700, marginBottom: 12 }}>泰国签证</div>
      <SelectField
        label="当前签证类型"
        value={data.visa_type}
        onChange={v => onChange({ ...data, visa_type: v })}
        options={[
          { value: '', label: '请选择' },
          { value: 'TR', label: 'TR · 旅游签证' },
          { value: 'ED', label: 'ED · 教育签证' },
          { value: 'NON-O', label: 'Non-O · 家属签证' },
          { value: 'NON-B', label: 'Non-B · 商务签证' },
          { value: 'LTR', label: 'LTR · 长居签证' },
          { value: 'other', label: '其他' },
        ]}
      />
      <Field label="签证到期日" value={data.visa_expiry} onChange={v => onChange({ ...data, visa_expiry: v })} type="date" />
      <Field label="TM30 报到号码" value={data.tm30_number} onChange={v => onChange({ ...data, tm30_number: v })} placeholder="如有填写" />
    </div>
  )
}


export { StepPassport }
