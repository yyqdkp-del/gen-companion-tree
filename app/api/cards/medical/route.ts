export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserLocation } from '@/lib/geofence'

// ══ 各国语言配置 ══
type LangConfig = {
  languages: { code: string; flag: string; label: string }[]
  translations: {
    allergic_to: string
    chronic: string
    blood_type: string
    name_label: string
    complaint_template: (name: string, blood: string, allergy: string) => string
  }
  emergency_section: string
}

const LANG_CONFIG: Record<string, LangConfig> = {
  TH: {
    languages: [
      { code: 'zh', flag: '🇨🇳', label: '中文' },
      { code: 'en', flag: '🇬🇧', label: 'English' },
      { code: 'th', flag: '🇹🇭', label: 'ภาษาไทย' },
    ],
    translations: {
      allergic_to: 'แพ้',
      chronic: 'โรคประจำตัว',
      blood_type: 'กรุ๊ปเลือด',
      name_label: 'ชื่อ',
      complaint_template: (name, blood, allergy) =>
        `ผมชื่อ ${name}${blood ? ` กรุ๊ปเลือด ${blood}` : ''}${allergy ? ` แพ้ ${allergy}` : ''} มาพบแพทย์เพราะ: _______________`,
    },
    emergency_section: 'ผู้ติดต่อฉุกเฉิน',
  },
  SG: {
    languages: [
      { code: 'zh', flag: '🇨🇳', label: '中文' },
      { code: 'en', flag: '🇬🇧', label: 'English' },
    ],
    translations: {
      allergic_to: 'Allergic to',
      chronic: 'Chronic conditions',
      blood_type: 'Blood Type',
      name_label: 'Name',
      complaint_template: (name, blood, allergy) =>
        `My name is ${name}${blood ? `, blood type ${blood}` : ''}${allergy ? `, allergic to ${allergy}` : ''}. I'm here because: _______________`,
    },
    emergency_section: 'Emergency Contact',
  },
  MY: {
    languages: [
      { code: 'zh', flag: '🇨🇳', label: '中文' },
      { code: 'en', flag: '🇬🇧', label: 'English' },
      { code: 'my', flag: '🇲🇾', label: 'Bahasa Melayu' },
    ],
    translations: {
      allergic_to: 'Alahan kepada',
      chronic: 'Penyakit kronik',
      blood_type: 'Kumpulan darah',
      name_label: 'Nama',
      complaint_template: (name, blood, allergy) =>
        `Nama saya ${name}${blood ? `, kumpulan darah ${blood}` : ''}${allergy ? `, alah kepada ${allergy}` : ''}. Saya datang kerana: _______________`,
    },
    emergency_section: 'Kenalan Kecemasan',
  },
  PT: {
    languages: [
      { code: 'zh', flag: '🇨🇳', label: '中文' },
      { code: 'en', flag: '🇬🇧', label: 'English' },
      { code: 'pt', flag: '🇵🇹', label: 'Português' },
    ],
    translations: {
      allergic_to: 'Alérgico a',
      chronic: 'Doenças crónicas',
      blood_type: 'Grupo sanguíneo',
      name_label: 'Nome',
      complaint_template: (name, blood, allergy) =>
        `O meu nome é ${name}${blood ? `, grupo sanguíneo ${blood}` : ''}${allergy ? `, alérgico a ${allergy}` : ''}. Venho porque: _______________`,
    },
    emergency_section: 'Contacto de Emergência',
  },
  ES: {
    languages: [
      { code: 'zh', flag: '🇨🇳', label: '中文' },
      { code: 'en', flag: '🇬🇧', label: 'English' },
      { code: 'es', flag: '🇪🇸', label: 'Español' },
    ],
    translations: {
      allergic_to: 'Alérgico a',
      chronic: 'Enfermedades crónicas',
      blood_type: 'Grupo sanguíneo',
      name_label: 'Nombre',
      complaint_template: (name, blood, allergy) =>
        `Me llamo ${name}${blood ? `, grupo sanguíneo ${blood}` : ''}${allergy ? `, alérgico a ${allergy}` : ''}. Vengo porque: _______________`,
    },
    emergency_section: 'Contacto de Emergencia',
  },
  DE: {
    languages: [
      { code: 'zh', flag: '🇨🇳', label: '中文' },
      { code: 'en', flag: '🇬🇧', label: 'English' },
      { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
    ],
    translations: {
      allergic_to: 'Allergisch gegen',
      chronic: 'Chronische Erkrankungen',
      blood_type: 'Blutgruppe',
      name_label: 'Name',
      complaint_template: (name, blood, allergy) =>
        `Mein Name ist ${name}${blood ? `, Blutgruppe ${blood}` : ''}${allergy ? `, allergisch gegen ${allergy}` : ''}. Ich komme wegen: _______________`,
    },
    emergency_section: 'Notfallkontakt',
  },
}

function getLangConfig(countryCode: string): LangConfig {
  return LANG_CONFIG[countryCode] || LANG_CONFIG['SG']
}

const COMPLAINT_COLORS: Record<string, string> = {
  zh: '#F0FFF4', en: '#F0F9FF', th: '#FFF7ED',
  my: '#FFF7ED', pt: '#FFF7ED', es: '#FFF7ED', de: '#FFF7ED',
}
const COMPLAINT_TEXT_COLORS: Record<string, string> = {
  zh: '#065F46', en: '#0C4A6E', th: '#7C2D12',
  my: '#7C2D12', pt: '#7C2D12', es: '#7C2D12', de: '#7C2D12',
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch { return dateStr }
}

export async function GET(req: NextRequest) {
  const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')
  const childId = searchParams.get('child_id')
  if (!userId) return new NextResponse('Missing user_id', { status: 400 })

  const queries: Promise<any>[] = [
    supabase.from('family_profile').select('*').eq('user_id', userId).single(),
    supabase.from('children').select('*').eq('user_id', userId),
    getUserLocation(userId),
  ]
  if (childId) {
    queries.push(
      supabase.from('child_health_records').select('*').eq('child_id', childId).order('date', { ascending: false }).limit(3),
      supabase.from('child_daily_log').select('*').eq('child_id', childId).order('date', { ascending: false }).limit(1),
    )
  }

  const results = await Promise.all(queries)
  const profile = results[0].data || {}
  const children = results[1].data || []
  const location = results[2]
  const healthRecords = childId ? (results[3]?.data || []) : []
  const dailyLog = childId ? (results[4]?.data?.[0] || null) : null

  const countryCode = location.country_code || 'TH'
  const langConfig = getLangConfig(countryCode)
  const emergency = location.local_config?.emergency || {}

  const targetChild = childId ? children.find((c: any) => c.id === childId) : null
  const isChild = !!targetChild
  const name = isChild ? targetChild.name : profile.member_name || '—'
  const bloodType = isChild ? (targetChild.blood_type || profile.blood_type || '') : (profile.blood_type || '')
  const allergies = isChild ? (targetChild.allergies || profile.allergies || '') : (profile.allergies || '')
  const chronic = isChild ? (targetChild.chronic_conditions || '') : (profile.chronic_conditions || '')
  const emergencyName = profile.emergency_name || '—'
  const emergencyPhone = profile.emergency_phone || '—'
  const emergencyRelation = profile.emergency_relation || '家属'
  const regularDoctor = profile.regular_doctor || '—'
  const regularHospital = profile.regular_hospital || profile.hospital_name || '—'

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>就诊信息卡 · ${name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'PingFang SC', 'Noto Sans SC', sans-serif; background: #F5F9FC; color: #2C3E50; padding: 16px; max-width: 640px; margin: 0 auto; }
  .med-card { background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); margin-bottom: 16px; }
  .card-header { background: linear-gradient(135deg, #DC2626, #EF4444); color: white; padding: 20px 22px; }
  .card-type { font-size: 11px; opacity: 0.8; letter-spacing: 0.1em; margin-bottom: 8px; }
  .card-top { display: flex; justify-content: space-between; align-items: flex-start; }
  .card-name { font-size: 24px; font-weight: 700; margin-bottom: 2px; }
  .card-sub { font-size: 13px; opacity: 0.8; }
  .card-emoji { font-size: 32px; }
  .blood-badge { display: inline-block; background: rgba(255,255,255,0.25); border: 1.5px solid rgba(255,255,255,0.5); border-radius: 8px; padding: 6px 14px; font-size: 18px; font-weight: 700; margin-top: 10px; }
  .location-badge { display: inline-block; background: rgba(255,255,255,0.15); border-radius: 20px; padding: 3px 10px; font-size: 11px; margin-top: 8px; margin-left: 8px; }
  .section { padding: 16px 20px; border-bottom: 0.5px solid #f0f0f0; }
  .section:last-child { border-bottom: none; }
  .section-title { font-size: 10px; font-weight: 700; color: #B08D57; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 10px; }
  .alert-box { background: #FEF2F2; border: 1.5px solid #FCA5A5; border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; }
  .alert-title { font-size: 11px; font-weight: 700; color: #DC2626; margin-bottom: 4px; }
  .alert-content { font-size: 13px; color: #2C3E50; line-height: 1.5; }
  .lang-row { display: grid; grid-template-columns: 24px 1fr; gap: 8px; align-items: center; margin-bottom: 6px; }
  .lang-flag { font-size: 14px; }
  .lang-text { font-size: 13px; color: #2C3E50; line-height: 1.4; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .info-item { background: #F8FAFC; border-radius: 8px; padding: 10px 12px; }
  .info-label { font-size: 10px; color: #6B8BAA; margin-bottom: 3px; }
  .info-value { font-size: 13px; font-weight: 600; color: #2C3E50; }
  .emergency-card { background: #FEF3C7; border: 1.5px solid #F59E0B; border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; }
  .emergency-title { font-size: 12px; font-weight: 700; color: #92400E; margin-bottom: 8px; }
  .emergency-name { font-size: 16px; font-weight: 700; color: #2C3E50; }
  .emergency-phone { font-size: 20px; font-weight: 700; color: #DC2626; margin: 4px 0; }
  .emergency-relation { font-size: 11px; color: #6B8BAA; }
  .local-emergency { background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: 10px; padding: 12px 14px; }
  .local-emergency-title { font-size: 11px; font-weight: 700; color: #DC2626; margin-bottom: 8px; }
  .local-emergency-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; border-bottom: 0.5px solid #FCA5A580; }
  .local-emergency-row:last-child { border-bottom: none; }
  .history-item { padding: 8px 0; border-bottom: 0.5px solid #f0f0f0; }
  .history-item:last-child { border-bottom: none; }
  .history-date { font-size: 10px; color: #6B8BAA; margin-bottom: 2px; }
  .history-desc { font-size: 12px; color: #2C3E50; }
  .history-hospital { font-size: 11px; color: #B08D57; }
  .complaint-box { border-radius: 8px; padding: 12px; font-size: 12px; line-height: 1.8; margin-bottom: 8px; }
  .print-btn { display: block; width: 100%; padding: 14px; background: #DC2626; color: white; border: none; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; text-align: center; margin-bottom: 16px; }
  .footer { text-align: center; font-size: 11px; color: #6B8BAA; padding: 12px 0; line-height: 1.7; }
  @media print { .print-btn { display: none; } body { background: white; padding: 0; } }
</style>
</head>
<body>

<button class="print-btn" onclick="window.print()">🖨️ 打印就诊卡 / 截图保存</button>

<div class="med-card">

  <div class="card-header">
    <div class="card-type">
      MEDICAL INFO CARD · 就诊信息卡
      ${langConfig.languages.filter(l => l.code !== 'zh' && l.code !== 'en').map(l => `· ${l.label}`).join(' ')}
    </div>
    <div class="card-top">
      <div>
        <div class="card-name">${name}</div>
        <div class="card-sub">${profile.member_nationality || '—'}</div>
        ${bloodType ? `<div class="blood-badge">🩸 ${bloodType} · ${langConfig.translations.blood_type} ${bloodType}</div>` : ''}
        <div class="location-badge">📍 ${location.city} · ${location.country}</div>
      </div>
      <div class="card-emoji">${isChild ? '👶' : '🏥'}</div>
    </div>
  </div>

  ${allergies ? `
  <div class="section">
    <div class="section-title">⚠️ Allergies · 过敏史</div>
    <div class="alert-box">
      <div class="alert-title">ALLERGY ALERT</div>
      <div class="alert-content">${allergies}</div>
    </div>
    ${langConfig.languages.map(l => `
    <div class="lang-row">
      <span class="lang-flag">${l.flag}</span>
      <span class="lang-text">${l.code === 'zh' ? `过敏：${allergies}` : l.code === 'en' ? `Allergic to: ${allergies}` : `${langConfig.translations.allergic_to}: ${allergies}`}</span>
    </div>`).join('')}
  </div>` : ''}

  ${chronic ? `
  <div class="section">
    <div class="section-title">📋 Medical History · 病史</div>
    ${langConfig.languages.map(l => `
    <div class="lang-row">
      <span class="lang-flag">${l.flag}</span>
      <span class="lang-text">${l.code === 'zh' ? `慢性病：${chronic}` : l.code === 'en' ? `Chronic conditions: ${chronic}` : `${langConfig.translations.chronic}: ${chronic}`}</span>
    </div>`).join('')}
  </div>` : ''}

  ${dailyLog ? `
  <div class="section">
    <div class="section-title">📊 Today's Status · 今日状态</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">健康 Health</div>
        <div class="info-value">${dailyLog.health_status === 'sick' ? '🤒 生病中' : dailyLog.health_status === 'recovering' ? '💊 恢复中' : '✅ 健康'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">心情 Mood</div>
        <div class="info-value">${dailyLog.mood_status === 'happy' ? '😊 开心' : dailyLog.mood_status === 'upset' ? '😔 低落' : dailyLog.mood_status === 'anxious' ? '😟 焦虑' : '😌 平静'}</div>
      </div>
      ${dailyLog.medication_taken ? `<div class="info-item" style="grid-column:span 2"><div class="info-label">用药</div><div class="info-value">💊 今日已服药</div></div>` : ''}
      ${dailyLog.health_notes ? `<div class="info-item" style="grid-column:span 2"><div class="info-label">备注</div><div class="info-value" style="font-size:12px;font-weight:400">${dailyLog.health_notes}</div></div>` : ''}
    </div>
  </div>` : ''}

  <div class="section">
    <div class="section-title">💬 Chief Complaint · 主诉模板</div>
    <div class="lang-row" style="margin-bottom:8px"><span class="lang-flag">🇨🇳</span><span class="lang-text" style="font-size:12px;color:#065F46">我叫 ${name}${bloodType ? `，血型 ${bloodType}` : ''}${allergies ? `，对${allergies}过敏` : ''}，今天来就诊的原因是：_______________</span></div>
    <div class="lang-row" style="margin-bottom:8px"><span class="lang-flag">🇬🇧</span><span class="lang-text" style="font-size:12px;color:#0C4A6E">My name is ${name}${bloodType ? `, blood type ${bloodType}` : ''}${allergies ? `, allergic to ${allergies}` : ''}. I'm here because: _______________</span></div>
    ${langConfig.languages.filter(l => l.code !== 'zh' && l.code !== 'en').map(l => `
    <div class="lang-row" style="margin-bottom:8px">
      <span class="lang-flag">${l.flag}</span>
      <span class="lang-text" style="font-size:12px;color:#7C2D12">${langConfig.translations.complaint_template(name, bloodType, allergies)}</span>
    </div>`).join('')}
  </div>

  <div class="section">
    <div class="section-title">🏥 Regular Doctor · 固定医生</div>
    <div class="info-grid">
      <div class="info-item"><div class="info-label">医生 Doctor</div><div class="info-value">${regularDoctor}</div></div>
      <div class="info-item"><div class="info-label">医院 Hospital</div><div class="info-value">${regularHospital}</div></div>
    </div>
  </div>

  ${healthRecords.length > 0 ? `
  <div class="section">
    <div class="section-title">📅 Recent Visits · 近期就诊</div>
    ${healthRecords.map((r: any) => `
    <div class="history-item">
      <div class="history-date">${formatDate(r.date)} · ${r.type}</div>
      <div class="history-desc">${r.description || '—'}</div>
      ${r.hospital ? `<div class="history-hospital">🏥 ${r.hospital}${r.doctor_name ? ` · Dr. ${r.doctor_name}` : ''}</div>` : ''}
      ${r.follow_up_date ? `<div class="history-date" style="color:#DC2626">复诊：${formatDate(r.follow_up_date)}</div>` : ''}
    </div>`).join('')}
  </div>` : ''}

  <div class="section">
    <div class="section-title">🆘 ${langConfig.emergency_section} · 紧急联系人</div>
    <div class="emergency-card">
      <div class="emergency-title">IN CASE OF EMERGENCY · 紧急情况联系</div>
      <div class="emergency-name">${emergencyName}</div>
      <div class="emergency-relation">${emergencyRelation}</div>
      <div class="emergency-phone">📞 ${emergencyPhone}</div>
    </div>
    ${Object.keys(emergency).length > 0 ? `
    <div class="local-emergency">
      <div class="local-emergency-title">📍 ${location.city} 本地紧急电话</div>
      ${Object.entries(emergency).map(([k, v]) => `
      <div class="local-emergency-row">
        <span>${k === 'police' ? '警察' : k === 'ambulance' ? '救护车' : k === 'fire' ? '消防' : k === 'tourist_police' ? '旅游警察' : k}</span>
        <strong>${v}</strong>
      </div>`).join('')}
    </div>` : ''}
  </div>

  ${!isChild && children.length > 0 ? `
  <div class="section">
    <div class="section-title">👨‍👩‍👧 Family · 家庭成员</div>
    <div class="info-grid">
      ${children.map((c: any) => `
      <div class="info-item">
        <div class="info-label">${c.emoji || '👶'} ${c.name}</div>
        <div class="info-value" style="font-size:11px;font-weight:400">${c.school_name || '—'}</div>
      </div>`).join('')}
    </div>
  </div>` : ''}

</div>

<div class="footer">
  由根·陪伴生成 · ${new Date().toLocaleDateString('zh-CN')} · 请以实际医嘱为准<br>
  Generated by Gen Companion · For medical reference only · ${location.city}
</div>

</body>
</html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
