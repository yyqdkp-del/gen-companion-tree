'use client'
import React from 'react'
import { Field, SelectField } from '@/app/_shared/_components/FormField'
import { THEME } from '@/app/_shared/_constants/theme'

function StepEmergency({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, color: THEME.navy, marginBottom: 4 }}>紧急联系人 🆘</div>
      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 20, lineHeight: 1.6 }}>紧急情况时根会优先联系这些人</div>
      <Field label="紧急联系人姓名" value={data.emergency_name} onChange={v => onChange({ ...data, emergency_name: v })} placeholder="爸爸 / 国内家人姓名" />
      <Field label="关系" value={data.emergency_relation} onChange={v => onChange({ ...data, emergency_relation: v })} placeholder="丈夫 / 父母 / 朋友" />
      <Field label="联系电话" value={data.emergency_phone} onChange={v => onChange({ ...data, emergency_phone: v })} placeholder="+86 138 xxxx xxxx" type="tel" />
      <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '20px 0' }} />
      <div style={{ fontSize: 12, color: THEME.gold, fontWeight: 700, marginBottom: 12 }}>健康信息（可选）</div>
      <Field label="血型" value={data.blood_type} onChange={v => onChange({ ...data, blood_type: v })} placeholder="A / B / AB / O" />
      <Field label="过敏史" value={data.allergies} onChange={v => onChange({ ...data, allergies: v })} placeholder="青霉素过敏 / 无" />
      <Field label="慢性病史" value={data.chronic_conditions} onChange={v => onChange({ ...data, chronic_conditions: v })} placeholder="如实填写，或填无" />
      <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(154,183,232,0.12)', marginTop: 8, fontSize: 12, color: THEME.muted, lineHeight: 1.7 }}>
        💡 健康信息用于生成就诊卡，帮助您在泰国医院顺畅就医
      </div>
    </div>
  )
}

// ── 主组件内容（需要 useSearchParams，包在 Suspense 里）──

export { StepEmergency }
