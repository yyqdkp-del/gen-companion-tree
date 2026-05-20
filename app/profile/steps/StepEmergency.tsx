'use client'
import React, { useEffect, useState } from 'react'
import { Field, SelectField } from '@/app/_shared/_components/FormField'
import { THEME } from '@/app/_shared/_constants/theme'

const BLOOD_TYPES = ['A型', 'B型', 'AB型', 'O型', 'A型RH-', 'B型RH-', 'AB型RH-', 'O型RH-', '不知道']

function StepEmergency({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  const [showSecond, setShowSecond] = useState(
    !!(data.emergency_name_2 || data.emergency_phone_2),
  )

  useEffect(() => {
    if (data.emergency_name_2?.trim() || data.emergency_phone_2?.trim()) setShowSecond(true)
  }, [data.emergency_name_2, data.emergency_phone_2])

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#2d322f', marginBottom: 4 }}>紧急联系人 🆘</div>
      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 20, lineHeight: 1.6 }}>紧急情况时根会优先联系这些人</div>
      <Field label="紧急联系人姓名" value={data.emergency_name} onChange={v => onChange({ ...data, emergency_name: v })} placeholder="爸爸 / 国内家人姓名" />
      <Field label="关系" value={data.emergency_relation} onChange={v => onChange({ ...data, emergency_relation: v })} placeholder="丈夫 / 父母 / 朋友" />
      <Field label="联系电话" value={data.emergency_phone} onChange={v => onChange({ ...data, emergency_phone: v })} placeholder="+86 138 xxxx xxxx" type="tel" />
      {!showSecond ? (
        <button
          type="button"
          onClick={() => setShowSecond(true)}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px 0',
            fontSize: 13,
            color: '#a46355',
            cursor: 'pointer',
            fontFamily: 'sans-serif',
          }}
        >
          + 添加第二紧急联系人
        </button>
      ) : (
        <div>
          <div style={{ fontSize: 13, color: 'rgba(45,50,47,0.5)', marginBottom: 8, fontFamily: 'sans-serif' }}>
            第二紧急联系人
          </div>
          <Field
            label="姓名"
            value={data.emergency_name_2 || ''}
            onChange={v => onChange({ ...data, emergency_name_2: v })}
          />
          <Field
            label="关系"
            value={data.emergency_relation_2 || ''}
            onChange={v => onChange({ ...data, emergency_relation_2: v })}
          />
          <Field
            label="联系电话"
            value={data.emergency_phone_2 || ''}
            onChange={v => onChange({ ...data, emergency_phone_2: v })}
            type="tel"
          />
        </div>
      )}
      <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '20px 0' }} />
      <div style={{ fontSize: 12, color: '#8a7355', fontWeight: 700, marginBottom: 12 }}>家长健康信息</div>
      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 14, lineHeight: 1.6 }}>
        用于紧急情况，孩子健康信息请在孩子档案填写
      </div>
      <SelectField
        label="血型"
        value={data.blood_type || ''}
        onChange={v => onChange({ ...data, blood_type: v })}
        options={[
          { value: '', label: '请选择血型（可选）' },
          ...BLOOD_TYPES.map(t => ({ value: t, label: t })),
        ]}
      />
      <Field label="过敏史" value={data.allergies} onChange={v => onChange({ ...data, allergies: v })} placeholder="青霉素过敏 / 无" />
      <Field label="慢性病史" value={data.chronic_conditions} onChange={v => onChange({ ...data, chronic_conditions: v })} placeholder="如实填写，或填无" />
      <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(154,183,232,0.12)', marginTop: 8, fontSize: 12, color: THEME.muted, lineHeight: 1.7 }}>
        💡 家长健康信息用于紧急情况与家庭档案；就诊卡中的儿童健康信息请在各孩子档案中维护
      </div>
    </div>
  )
}

export { StepEmergency }
