export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const VISA_INFO: Record<string, { name: string; duration: string; purpose: string; office: string }> = {
  'TR':    { name: 'Tourist Visa', duration: '60天（可延期30天）', purpose: '旅游', office: '移民局 Immigration Office' },
  'ED':    { name: 'Education Visa', duration: '90天（可多次延期）', purpose: '就学', office: '移民局 Immigration Office' },
  'NON-O': { name: 'Non-Immigrant O', duration: '90天（可延期1年）', purpose: '家属陪同', office: '移民局 Immigration Office' },
  'NON-B': { name: 'Non-Immigrant B', duration: '90天（可延期1年）', purpose: '工作/商务', office: '移民局 Immigration Office' },
  'LTR':   { name: 'Long Term Resident', duration: '10年', purpose: '长居', office: '投资局 BOI' },
}

const TM_FORMS: Record<string, { id: string; name: string; purpose: string; url: string; fields: { th: string; en: string; value: string }[] }[]> = {
  'TR': [
    {
      id: 'TM7', name: 'TM.7', purpose: '签证延期申请',
      url: 'https://www.immigration.go.th/content/tm7',
      fields: [
        { th: 'ชื่อ-นามสกุล', en: 'Full Name', value: '' },
        { th: 'สัญชาติ', en: 'Nationality', value: '' },
        { th: 'เลขที่หนังสือเดินทาง', en: 'Passport No.', value: '' },
        { th: 'วันหมดอายุหนังสือเดินทาง', en: 'Passport Expiry', value: '' },
        { th: 'ประเภทวีซ่า', en: 'Visa Type', value: '' },
        { th: 'ที่อยู่ในประเทศไทย', en: 'Address in Thailand', value: '' },
      ]
    },
    {
      id: 'TM47', name: 'TM.47', purpose: '90天报到',
      url: 'https://www.immigration.go.th/content/tm47',
      fields: [
        { th: 'ชื่อ-นามสกุล', en: 'Full Name', value: '' },
        { th: 'สัญชาติ', en: 'Nationality', value: '' },
        { th: 'เลขที่หนังสือเดินทาง', en: 'Passport No.', value: '' },
        { th: 'ที่อยู่ในประเทศไทย', en: 'Address in Thailand', value: '' },
      ]
    }
  ],
  'NON-O': [
    {
      id: 'TM7', name: 'TM.7', purpose: '签证延期申请',
      url: 'https://www.immigration.go.th/content/tm7',
      fields: [
        { th: 'ชื่อ-นามสกุล', en: 'Full Name', value: '' },
        { th: 'สัญชาติ', en: 'Nationality', value: '' },
        { th: 'เลขที่หนังสือเดินทาง', en: 'Passport No.', value: '' },
        { th: 'วันหมดอายุหนังสือเดินทาง', en: 'Passport Expiry', value: '' },
        { th: 'ประเภทวีซ่า', en: 'Visa Type', value: '' },
        { th: 'ที่อยู่ในประเทศไทย', en: 'Address in Thailand', value: '' },
      ]
    },
    {
      id: 'TM47', name: 'TM.47', purpose: '90天报到',
      url: 'https://www.immigration.go.th/content/tm47',
      fields: [
        { th: 'ชื่อ-นามสกุล', en: 'Full Name', value: '' },
        { th: 'สัญชาติ', en: 'Nationality', value: '' },
        { th: 'เลขที่หนังสือเดินทาง', en: 'Passport No.', value: '' },
        { th: 'ที่อยู่ในประเทศไทย', en: 'Address in Thailand', value: '' },
      ]
    },
    {
      id: 'TM8', name: 'TM.8', purpose: '重入境许可',
      url: 'https://www.immigration.go.th/content/tm8',
      fields: [
        { th: 'ชื่อ-นามสกุล', en: 'Full Name', value: '' },
        { th: 'สัญชาติ', en: 'Nationality', value: '' },
        { th: 'เลขที่หนังสือเดินทาง', en: 'Passport No.', value: '' },
        { th: 'ประเภทวีซ่า', en: 'Visa Type', value: '' },
      ]
    }
  ],
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')

  if (!userId) {
    return new NextResponse('Missing user_id', { status: 400 })
  }

  // 读取用户数据
  const [profileRes, placesRes] = await Promise.all([
    supabase.from('family_profile').select('*').eq('user_id', userId).single(),
    supabase.from('family_places').select('*').eq('user_id', userId).eq('is_primary', true).single(),
  ])

  const p = profileRes.data || {}
  const place = placesRes.data || {}
  const address = p.home_address_en || place.address || '未填写'
  const visaInfo = VISA_INFO[p.visa_type] || VISA_INFO['TR']
  const forms = TM_FORMS[p.visa_type] || TM_FORMS['TR']

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
  .card { background: white; border-radius: 14px; padding: 20px; margin-bottom: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
  .card-title { font-size: 14px; font-weight: 700; color: #B08D57; margin-bottom: 14px; display: flex; align-items: center; gap: 6px; }
  .info-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 0.5px solid #f0f0f0; }
  .info-row:last-child { border-bottom: none; }
  .info-label { font-size: 12px; color: #6B8BAA; }
  .info-value { font-size: 13px; font-weight: 600; color: #2C3E50; text-align: right; max-width: 60%; }
  .status-badge { font-size: 11px; padding: 3px 8px; border-radius: 10px; font-weight: 600; }
  .form-card { border: 1.5px solid #E1F5EE; border-radius: 12px; margin-bottom: 12px; overflow: hidden; }
  .form-header { background: #E1F5EE; padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; }
  .form-name { font-size: 14px; font-weight: 700; color: #0F6E56; }
  .form-purpose { font-size: 11px; color: #1D9E75; }
  .form-download { font-size: 11px; color: #0F6E56; text-decoration: none; padding: 4px 10px; border: 1px solid #0F6E56; border-radius: 8px; }
  .form-body { padding: 12px 14px; }
  .field-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; padding: 8px 0; border-bottom: 0.5px solid #f5f5f5; align-items: start; }
  .field-row:last-child { border-bottom: none; }
  .field-th { font-size: 11px; color: #E07B2A; }
  .field-en { font-size: 11px; color: #6B8BAA; }
  .field-value { font-size: 12px; font-weight: 600; color: #1A3C5E; background: #F5F9FC; padding: 4px 8px; border-radius: 6px; }
  .warning { background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 10px; padding: 12px 14px; margin-bottom: 16px; font-size: 12px; color: #92400E; line-height: 1.6; }
  .tip { background: #E1F5EE; border-radius: 10px; padding: 12px 14px; font-size: 12px; color: #0F6E56; line-height: 1.7; margin-bottom: 16px; }
  .print-btn { display: block; width: 100%; padding: 14px; background: #1A3C5E; color: white; border: none; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; text-align: center; margin-bottom: 20px; }
  .footer { text-align: center; font-size: 11px; color: #6B8BAA; padding: 12px 0; }
  @media print { .print-btn { display: none; } body { background: white; } }
</style>
</head>
<body>

<div class="header">
  <div class="header-title">📋 签证填写指引</div>
  <div class="header-sub">${p.member_name || '用户'} · 生成于 ${new Date().toLocaleDateString('zh-CN')}</div>
</div>

<button class="print-btn" onclick="window.print()">🖨️ 打印 / 保存为 PDF</button>

${visaDays < 60 ? `<div class="warning">⚠️ 您的签证将在 <strong>${visaDays} 天</strong>后到期（${formatDate(p.visa_expiry)}），请尽快办理延期手续。</div>` : ''}
${passportDays < 180 ? `<div class="warning">⚠️ 您的护照将在 <strong>${passportDays} 天</strong>后到期（${formatDate(p.passport_expiry)}），建议提前更换。</div>` : ''}

<!-- 个人信息 -->
<div class="card">
  <div class="card-title">👤 您的信息</div>
  <div class="info-row">
    <span class="info-label">姓名 Full Name</span>
    <span class="info-value">${p.member_name || '未填写'}</span>
  </div>
  <div class="info-row">
    <span class="info-label">国籍 Nationality</span>
    <span class="info-value">${p.member_nationality || '未填写'}</span>
  </div>
  <div class="info-row">
    <span class="info-label">护照号 Passport No.</span>
    <span class="info-value">${p.passport_number || '未填写'}</span>
  </div>
  <div class="info-row">
    <span class="info-label">护照到期 Expiry Date</span>
    <span class="info-value" style="color:${passportColor}">${formatDate(p.passport_expiry)}（还剩 ${passportDays} 天）</span>
  </div>
  <div class="info-row">
    <span class="info-label">护照签发地 Issue Place</span>
    <span class="info-value">${p.passport_issue_place || '未填写'}</span>
  </div>
  <div class="info-row">
    <span class="info-label">签证类型 Visa Type</span>
    <span class="info-value">${p.visa_type || '未填写'} · ${visaInfo.name}</span>
  </div>
  <div class="info-row">
    <span class="info-label">签证到期 Visa Expiry</span>
    <span class="info-value" style="color:${visaColor}">${formatDate(p.visa_expiry)}（还剩 ${visaDays} 天）</span>
  </div>
  <div class="info-row">
    <span class="info-label">泰国住址 Address</span>
    <span class="info-value">${address}</span>
  </div>
</div>

<!-- 需要填写的表格 -->
<div class="card">
  <div class="card-title">📝 需要填写的表格</div>
  ${forms.map(form => `
  <div class="form-card">
    <div class="form-header">
      <div>
        <div class="form-name">${form.name} · ${form.purpose}</div>
        <div class="form-purpose">移民局官方表格</div>
      </div>
      <a href="${form.url}" target="_blank" class="form-download">下载表格 →</a>
    </div>
    <div class="form-body">
      <div style="font-size:11px;color:#6B8BAA;margin-bottom:8px;">对照填写（泰文 / English / 您的信息）</div>
      ${form.fields.map(f => {
        let value = '—'
        if (f.en.includes('Name')) value = p.member_name || '—'
        else if (f.en.includes('Nationality')) value = p.member_nationality || '—'
        else if (f.en.includes('Passport No')) value = p.passport_number || '—'
        else if (f.en.includes('Passport Expiry')) value = formatDate(p.passport_expiry)
        else if (f.en.includes('Visa Type')) value = p.visa_type || '—'
        else if (f.en.includes('Address')) value = address
        return `
        <div class="field-row">
          <div class="field-th">${f.th}</div>
          <div class="field-en">${f.en}</div>
          <div class="field-value">${value}</div>
        </div>`
      }).join('')}
    </div>
  </div>
  `).join('')}
</div>

<!-- 办理提示 -->
<div class="tip">
  💡 <strong>办理提示：</strong><br>
  · 携带护照原件 + 复印件（首页 + 签证页）<br>
  · 携带 4x6cm 白底照片 2 张<br>
  · 携带住址证明（房租合同或房东信）<br>
  · 办理时间：周一至周五 08:30-16:30<br>
  · ${visaInfo.office}
</div>

<div class="footer">
  由根·陪伴生成 · 信息基于您的家庭档案 · 请以移民局官方最新要求为准
</div>

</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
}
