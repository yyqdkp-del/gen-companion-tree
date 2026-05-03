export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserLocation } from '@/lib/geofence'

// ══ 各国签证表格配置 ══
type FormField = { label_local: string; label_en: string; key: string }
type VisaForm = { id: string; name: string; purpose: string; url: string; fields: FormField[] }
type CountryVisaConfig = {
  office_name: string
  office_hours: string
  visa_types: Record<string, { name: string; duration: string; purpose: string }>
  forms: VisaForm[]
  carry_items: string[]
  tips: string[]
}

const COUNTRY_VISA_CONFIG: Record<string, CountryVisaConfig> = {
  TH: {
    office_name: '泰国移民局 Immigration Bureau',
    office_hours: '周一至周五 08:30–16:30',
    visa_types: {
      'TR':    { name: 'Tourist Visa', duration: '60天（可延期30天）', purpose: '旅游' },
      'ED':    { name: 'Education Visa', duration: '90天（可多次延期）', purpose: '就学' },
      'NON-O': { name: 'Non-Immigrant O', duration: '90天（可延期1年）', purpose: '家属陪同' },
      'NON-B': { name: 'Non-Immigrant B', duration: '90天（可延期1年）', purpose: '工作/商务' },
      'LTR':   { name: 'Long Term Resident', duration: '10年', purpose: '长居' },
    },
    forms: [
      {
        id: 'TM7', name: 'TM.7', purpose: '签证延期申请',
        url: 'https://www.immigration.go.th/content/tm7',
        fields: [
          { label_local: 'ชื่อ-นามสกุล', label_en: 'Full Name', key: 'member_name' },
          { label_local: 'สัญชาติ', label_en: 'Nationality', key: 'member_nationality' },
          { label_local: 'เลขที่หนังสือเดินทาง', label_en: 'Passport No.', key: 'passport_number' },
          { label_local: 'วันหมดอายุหนังสือเดินทาง', label_en: 'Passport Expiry', key: 'passport_expiry' },
          { label_local: 'ประเภทวีซ่า', label_en: 'Visa Type', key: 'visa_type' },
          { label_local: 'ที่อยู่ในประเทศไทย', label_en: 'Address in Thailand', key: 'address' },
        ]
      },
      {
        id: 'TM47', name: 'TM.47', purpose: '90天报到',
        url: 'https://www.immigration.go.th/content/tm47',
        fields: [
          { label_local: 'ชื่อ-นามสกุล', label_en: 'Full Name', key: 'member_name' },
          { label_local: 'สัญชาติ', label_en: 'Nationality', key: 'member_nationality' },
          { label_local: 'เลขที่หนังสือเดินทาง', label_en: 'Passport No.', key: 'passport_number' },
          { label_local: 'ที่อยู่ในประเทศไทย', label_en: 'Address in Thailand', key: 'address' },
        ]
      },
      {
        id: 'TM8', name: 'TM.8', purpose: '重入境许可',
        url: 'https://www.immigration.go.th/content/tm8',
        fields: [
          { label_local: 'ชื่อ-นามสกุล', label_en: 'Full Name', key: 'member_name' },
          { label_local: 'สัญชาติ', label_en: 'Nationality', key: 'member_nationality' },
          { label_local: 'เลขที่หนังสือเดินทาง', label_en: 'Passport No.', key: 'passport_number' },
          { label_local: 'ประเภทวีซ่า', label_en: 'Visa Type', key: 'visa_type' },
        ]
      },
    ],
    carry_items: ['护照原件 + 复印件（首页 + 签证页）', '4×6cm 白底照片 2 张', '住址证明（房租合同或房东信）', '签证费（现金，约1,900泰铢）'],
    tips: ['建议提前预约，避免排队', '携带证件复印件备用', '部分移民局要求穿着正式'],
  },

  SG: {
    office_name: '新加坡移民与关卡局 ICA',
    office_hours: '周一至周五 08:00–17:00，周六 08:00–13:00',
    visa_types: {
      'EP':  { name: 'Employment Pass', duration: '1-2年', purpose: '工作' },
      'DP':  { name: 'Dependant Pass', duration: '随主申请人', purpose: '家属' },
      'LTVP': { name: 'Long Term Visit Pass', duration: '1-5年', purpose: '长期探访' },
      'PR':  { name: 'Permanent Resident', duration: '永久', purpose: '永久居留' },
    },
    forms: [
      {
        id: 'LTVP_FORM', name: 'LTVP Application', purpose: '长期探访准证申请',
        url: 'https://www.ica.gov.sg/reside/LTVP/apply',
        fields: [
          { label_local: '姓名', label_en: 'Full Name', key: 'member_name' },
          { label_local: '国籍', label_en: 'Nationality', key: 'member_nationality' },
          { label_local: '护照号', label_en: 'Passport No.', key: 'passport_number' },
          { label_local: '护照到期', label_en: 'Passport Expiry', key: 'passport_expiry' },
          { label_local: '新加坡地址', label_en: 'Singapore Address', key: 'address' },
        ]
      },
    ],
    carry_items: ['护照原件（至少6个月有效期）', '近期照片（35×45mm，白底）', '主申请人EP/工作准证复印件', '结婚证明（如适用）', '子女出生证明（如适用）'],
    tips: ['所有文件需提交英文版本', '建议网上预约后到访', '处理时间约3-6周'],
  },

  MY: {
    office_name: '马来西亚移民局 Jabatan Imigresen',
    office_hours: '周一至周四 08:00–17:00，周五 08:00–16:15',
    visa_types: {
      'MM2H':  { name: 'Malaysia My Second Home', duration: '10年', purpose: '长居' },
      'DP':    { name: 'Dependant Pass', duration: '随主申请人', purpose: '家属' },
      'LTSVP': { name: 'Long Term Social Visit Pass', duration: '1年', purpose: '长期探访' },
    },
    forms: [
      {
        id: 'IMM_55', name: 'IMM.55', purpose: '签证延期申请',
        url: 'https://www.imi.gov.my/portal2017/index.php/ms/sumber/borang-imigresen.html',
        fields: [
          { label_local: 'Nama Penuh', label_en: 'Full Name', key: 'member_name' },
          { label_local: 'Warganegara', label_en: 'Nationality', key: 'member_nationality' },
          { label_local: 'No. Passport', label_en: 'Passport No.', key: 'passport_number' },
          { label_local: 'Tarikh Luput Passport', label_en: 'Passport Expiry', key: 'passport_expiry' },
          { label_local: 'Alamat di Malaysia', label_en: 'Address in Malaysia', key: 'address' },
        ]
      },
    ],
    carry_items: ['护照原件 + 复印件', '近期照片', '担保人信件（如适用）', '入境卡'],
    tips: ['部分移民局需要提前预约', '携带证件复印件备用', '处理时间约1-2个工作日'],
  },

  PT: {
    office_name: '葡萄牙移民局 AIMA',
    office_hours: '周一至周五 09:00–17:00（建议预约）',
    visa_types: {
      'D7':    { name: 'Passive Income Visa', duration: '1年（可续）', purpose: '被动收入/退休' },
      'D8':    { name: 'Digital Nomad Visa', duration: '1年（可续）', purpose: '数字游民' },
      'NHR':   { name: 'Non-Habitual Resident', duration: '10年税务优惠', purpose: '税务居民' },
      'AR':    { name: 'Autorização de Residência', duration: '2年（可续）', purpose: '居留许可' },
    },
    forms: [
      {
        id: 'AIMA_FORM', name: 'Pedido de AR', purpose: '居留许可申请',
        url: 'https://www.aima.gov.pt',
        fields: [
          { label_local: 'Nome Completo', label_en: 'Full Name', key: 'member_name' },
          { label_local: 'Nacionalidade', label_en: 'Nationality', key: 'member_nationality' },
          { label_local: 'Nº do Passaporte', label_en: 'Passport No.', key: 'passport_number' },
          { label_local: 'Validade do Passaporte', label_en: 'Passport Expiry', key: 'passport_expiry' },
          { label_local: 'Morada em Portugal', label_en: 'Address in Portugal', key: 'address' },
        ]
      },
    ],
    carry_items: ['护照原件 + 认证复印件', '近期照片（3.5×4.5cm）', '住所证明', '财力证明（银行存款证明）', '犯罪记录证明（公证）', 'NIF（税务号码）'],
    tips: ['建议提前3-6个月准备材料', '所有外文文件需公证翻译成葡萄牙语', '预约等待时间可能较长'],
  },

  SG_DEFAULT: {
    office_name: '当地移民局',
    office_hours: '请查询当地移民局官网',
    visa_types: {},
    forms: [],
    carry_items: ['护照原件 + 复印件', '近期照片', '相关申请表格', '费用（现金或刷卡）'],
    tips: ['建议提前查询当地移民局官网', '携带证件复印件备用', '部分机构需要提前预约'],
  },
}

function getCountryConfig(countryCode: string): CountryVisaConfig {
  return COUNTRY_VISA_CONFIG[countryCode] || COUNTRY_VISA_CONFIG['SG_DEFAULT']
}

function daysUntil(dateStr: string): number {
  if (!dateStr) return 999
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '未填写'
  try {
    return new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch { return dateStr }
}

function getFieldValue(key: string, p: any, address: string): string {
  switch (key) {
    case 'member_name': return p.member_name || '—'
    case 'member_nationality': return p.member_nationality || '—'
    case 'passport_number': return p.passport_number || '—'
    case 'passport_expiry': return formatDate(p.passport_expiry)
    case 'visa_type': return p.visa_type || '—'
    case 'address': return address
    default: return '—'
  }
}

export async function GET(req: NextRequest) {
  const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')
  if (!userId) return new NextResponse('Missing user_id', { status: 400 })

  const [profileRes, placesRes, locationRes] = await Promise.all([
    supabase.from('family_profile').select('*').eq('user_id', userId).single(),
    supabase.from('family_places').select('*').eq('user_id', userId).eq('is_primary', true).single(),
    getUserLocation(userId),
  ])

  const p = profileRes.data || {}
  const place = placesRes.data || {}
  const location = locationRes

  const address = p.home_address_en || place.address || '未填写'
  const countryCode = location.country_code || 'TH'
  const config = getCountryConfig(countryCode)
  const visaInfo = config.visa_types[p.visa_type] || { name: p.visa_type || '未知', duration: '—', purpose: '—' }
  const forms = config.forms

  const passportDays = daysUntil(p.passport_expiry)
  const visaDays = daysUntil(p.visa_expiry)
  const passportColor = passportDays < 90 ? '#DC2626' : passportDays < 180 ? '#D97706' : '#0F6E56'
  const visaColor = visaDays < 30 ? '#DC2626' : visaDays < 60 ? '#D97706' : '#0F6E56'

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>签证填写指引 · ${p.member_name || '用户'}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'PingFang SC', 'Noto Sans SC', sans-serif; background: #F5F9FC; color: #2C3E50; padding: 20px; max-width: 680px; margin: 0 auto; }
  .header { background: linear-gradient(135deg, #1A3C5E, #2C5F8A); color: white; padding: 24px; border-radius: 16px; margin-bottom: 20px; }
  .header-title { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
  .header-sub { font-size: 13px; opacity: 0.7; }
  .location-badge { display: inline-block; background: rgba(255,255,255,0.2); border-radius: 20px; padding: 4px 12px; font-size: 11px; margin-top: 8px; }
  .card { background: white; border-radius: 14px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
  .card-title { font-size: 14px; font-weight: 700; color: #B08D57; margin-bottom: 14px; }
  .info-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 0.5px solid #f0f0f0; }
  .info-row:last-child { border-bottom: none; }
  .info-label { font-size: 12px; color: #6B8BAA; }
  .info-value { font-size: 13px; font-weight: 600; color: #2C3E50; text-align: right; max-width: 60%; }
  .form-card { border: 1.5px solid #E1F5EE; border-radius: 12px; margin-bottom: 12px; overflow: hidden; }
  .form-header { background: #E1F5EE; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; }
  .form-name { font-size: 14px; font-weight: 700; color: #0F6E56; }
  .form-purpose { font-size: 11px; color: #1D9E75; }
  .form-download { font-size: 11px; color: #0F6E56; text-decoration: none; padding: 4px 10px; border: 1px solid #0F6E56; border-radius: 8px; }
  .form-body { padding: 12px 14px; }
  .field-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; padding: 8px 0; border-bottom: 0.5px solid #f5f5f5; align-items: start; }
  .field-row:last-child { border-bottom: none; }
  .field-local { font-size: 11px; color: #E07B2A; }
  .field-en { font-size: 11px; color: #6B8BAA; }
  .field-value { font-size: 12px; font-weight: 600; color: #1A3C5E; background: #F5F9FC; padding: 4px 8px; border-radius: 6px; }
  .warning { background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 10px; padding: 12px 14px; margin-bottom: 16px; font-size: 12px; color: #92400E; line-height: 1.6; }
  .tip { background: #E1F5EE; border-radius: 10px; padding: 12px 14px; font-size: 12px; color: #0F6E56; line-height: 1.9; margin-bottom: 16px; }
  .carry-item { padding: 5px 0; font-size: 12px; color: #2C3E50; border-bottom: 0.5px solid #f5f5f5; }
  .carry-item:last-child { border-bottom: none; }
  .print-btn { display: block; width: 100%; padding: 14px; background: #1A3C5E; color: white; border: none; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; text-align: center; margin-bottom: 20px; }
  .footer { text-align: center; font-size: 11px; color: #6B8BAA; padding: 12px 0; }
  @media print { .print-btn { display: none; } body { background: white; } }
</style>
</head>
<body>

<div class="header">
  <div class="header-title">📋 签证填写指引</div>
  <div class="header-sub">${p.member_name || '用户'} · 生成于 ${new Date().toLocaleDateString('zh-CN')}</div>
  <div class="location-badge">📍 ${location.city} · ${location.country}</div>
</div>

<button class="print-btn" onclick="window.print()">🖨️ 打印 / 保存为 PDF</button>

${visaDays < 60 ? `<div class="warning">⚠️ 您的签证将在 <strong>${visaDays} 天</strong>后到期（${formatDate(p.visa_expiry)}），请尽快办理延期手续。</div>` : ''}
${passportDays < 180 ? `<div class="warning">⚠️ 您的护照将在 <strong>${passportDays} 天</strong>后到期（${formatDate(p.passport_expiry)}），建议提前更换。</div>` : ''}

<div class="card">
  <div class="card-title">👤 您的信息</div>
  <div class="info-row"><span class="info-label">姓名 Full Name</span><span class="info-value">${p.member_name || '未填写'}</span></div>
  <div class="info-row"><span class="info-label">国籍 Nationality</span><span class="info-value">${p.member_nationality || '未填写'}</span></div>
  <div class="info-row"><span class="info-label">护照号 Passport No.</span><span class="info-value">${p.passport_number || '未填写'}</span></div>
  <div class="info-row"><span class="info-label">护照到期</span><span class="info-value" style="color:${passportColor}">${formatDate(p.passport_expiry)}（还剩 ${passportDays} 天）</span></div>
  <div class="info-row"><span class="info-label">护照签发地</span><span class="info-value">${p.passport_issue_place || '未填写'}</span></div>
  <div class="info-row"><span class="info-label">签证类型</span><span class="info-value">${p.visa_type || '未填写'} · ${visaInfo.name}</span></div>
  <div class="info-row"><span class="info-label">签证到期</span><span class="info-value" style="color:${visaColor}">${formatDate(p.visa_expiry)}（还剩 ${visaDays} 天）</span></div>
  <div class="info-row"><span class="info-label">当地住址</span><span class="info-value">${address}</span></div>
</div>

${forms.length > 0 ? `
<div class="card">
  <div class="card-title">📝 需要填写的表格</div>
  ${forms.map(form => `
  <div class="form-card">
    <div class="form-header">
      <div>
        <div class="form-name">${form.name} · ${form.purpose}</div>
        <div class="form-purpose">${config.office_name}</div>
      </div>
      <a href="${form.url}" target="_blank" class="form-download">下载表格 →</a>
    </div>
    <div class="form-body">
      <div style="font-size:11px;color:#6B8BAA;margin-bottom:8px;">对照填写</div>
      ${form.fields.map(f => `
      <div class="field-row">
        <div class="field-local">${f.label_local}</div>
        <div class="field-en">${f.label_en}</div>
        <div class="field-value">${getFieldValue(f.key, p, address)}</div>
      </div>`).join('')}
    </div>
  </div>`).join('')}
</div>` : ''}

<div class="card">
  <div class="card-title">🎒 需要携带的材料</div>
  ${config.carry_items.map(item => `<div class="carry-item">· ${item}</div>`).join('')}
</div>

<div class="tip">
  💡 <strong>办理信息：</strong><br>
  · 办公机构：${config.office_name}<br>
  · 办公时间：${config.office_hours}<br>
  ${config.tips.map(t => `· ${t}`).join('<br>')}
</div>

<div class="footer">由根·陪伴生成 · 信息基于您的家庭档案 · 请以当地移民局官方最新要求为准</div>
</body>
</html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
