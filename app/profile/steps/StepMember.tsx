'use client'
import React from 'react'
import { Field, SelectField } from '@/app/_shared/_components/FormField'
import { THEME } from '@/app/_shared/_constants/theme'

function StepMember({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, color: THEME.navy, marginBottom: 20 }}>告诉根你是谁 🌿</div>
      <Field label="姓名" value={data.member_name} onChange={v => onChange({ ...data, member_name: v })} placeholder="中文姓名或英文名" required />
      <SelectField
        label="国籍"
        value={data.member_nationality}
        onChange={v => onChange({ ...data, member_nationality: v })}
        options={[
          { value: '中国', label: '🇨🇳 中国' },
          { value: '中国香港', label: '🇭🇰 中国香港' },
          { value: '中国台湾', label: '🇹🇼 中国台湾' },
          { value: '新加坡', label: '🇸🇬 新加坡' },
          { value: '马来西亚', label: '🇲🇾 马来西亚' },
          { value: '其他', label: '其他' },
        ]}
      />
      <SelectField
        label="身份"
        value={data.member_role}
        onChange={v => onChange({ ...data, member_role: v })}
        options={[
          { value: 'admin', label: '👩 妈妈（主要管理者）' },
          { value: 'spouse', label: '👨 爸爸' },
          { value: 'other', label: '其他' },
        ]}
      />
      <Field label="手机号码" value={data.phone} onChange={v => onChange({ ...data, phone: v })} placeholder="+66 8x xxxx xxxx" type="tel" />
      <Field label="电子邮箱" value={data.email} onChange={v => onChange({ ...data, email: v })} placeholder="常用邮箱" type="email" />
    </div>
  )
}


export { StepMember }
