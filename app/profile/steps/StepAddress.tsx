'use client'
import React from 'react'
import { Field, SelectField } from '@/app/_shared/_components/FormField'
import { THEME } from '@/app/_shared/_constants/theme'

function StepAddress({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, color: THEME.navy, marginBottom: 4 }}>常用地址 📍</div>
      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 20, lineHeight: 1.6 }}>用于导航和表格填写</div>
      <div style={{ fontSize: 12, color: THEME.gold, fontWeight: 700, marginBottom: 12 }}>住所地址</div>
      <SelectField
        label="居住城市"
        value={data.resident_city}
        onChange={v => onChange({ ...data, resident_city: v })}
        options={[
          { value: '', label: '请选择城市' },
          { value: 'Chiang Mai', label: '🇹🇭 清迈' },
          { value: 'Bangkok', label: '🇹🇭 曼谷' },
          { value: 'Phuket', label: '🇹🇭 普吉' },
          { value: 'Pattaya', label: '🇹🇭 芭提雅' },
          { value: 'Singapore', label: '🇸🇬 新加坡' },
          { value: 'Kuala Lumpur', label: '🇲🇾 吉隆坡' },
          { value: 'Bali', label: '🇮🇩 巴厘岛' },
          { value: 'Manila', label: '🇵🇭 马尼拉' },
          { value: 'Lisbon', label: '🇵🇹 里斯本' },
          { value: 'Barcelona', label: '🇪🇸 巴塞罗那' },
          { value: 'Berlin', label: '🇩🇪 柏林' },
          { value: 'Amsterdam', label: '🇳🇱 阿姆斯特丹' },
          { value: 'Vancouver', label: '🇨🇦 温哥华' },
          { value: 'Los Angeles', label: '🇺🇸 洛杉矶' },
          { value: 'Hong Kong', label: '🇭🇰 香港' },
        ]}
      />
      <Field label="地址（英文）" value={data.home_address_en} onChange={v => onChange({ ...data, home_address_en: v })} placeholder="123 Nimman Rd, Chiang Mai 50200" />
      <Field label="地址（中文，可选）" value={data.home_address_zh} onChange={v => onChange({ ...data, home_address_zh: v })} placeholder="清迈市区尼曼路123号" />
      <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '20px 0' }} />
      <div style={{ fontSize: 12, color: THEME.gold, fontWeight: 700, marginBottom: 12 }}>孩子学校</div>
      <Field label="学校名称" value={data.school_name} onChange={v => onChange({ ...data, school_name: v })} placeholder="Lanna International School" />
      <Field label="学校地址" value={data.school_address} onChange={v => onChange({ ...data, school_address: v })} placeholder="Chiang Mai, Thailand" />
      <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '20px 0' }} />
      <div style={{ fontSize: 12, color: THEME.gold, fontWeight: 700, marginBottom: 12 }}>常用医院（可选）</div>
      <Field label="常用医院" value={data.hospital_name} onChange={v => onChange({ ...data, hospital_name: v })} placeholder="清迈国际医院 / Ram Hospital" />
    </div>
  )
}


export { StepAddress }
