export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const BLOOD_TYPE_TH: Record<string, string> = {
  'A': 'เลือดกรุ๊ป A', 'B': 'เลือดกรุ๊ป B',
  'AB': 'เลือดกรุ๊ป AB', 'O': 'เลือดกรุ๊ป O',
  'A-': 'เลือดกรุ๊ป A-', 'B-': 'เลือดกรุ๊ป B-',
  'AB-': 'เลือดกรุ๊ป AB-', 'O-': 'เลือดกรุ๊ป O-',
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
  } catch { return dateStr }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')
  const childId = searchParams.get('child_id') // 可选，指定孩子

  if (!userId) {
    return new NextResponse('Missing user_id', { status: 400 })
  }

  // 读取数据
  const queries: Promise<any>[] = [
    supabase.from('family_profile').select('*').eq('user_id', userId).single(),
    supabase.from('children').select('*').eq('user_id', userId),
  ]

  if (childId) {
    queries.push(
      supabase.from('child_health_records').select('*')
        .eq('child_id', childId).order('date', { ascending: false }).limit(3),
      supabase.from('child_daily_log').select('*')
        .eq('child_id', childId).order('date', { ascending: false }).limit(1)
    )
  }

  const results = await Promise.all(queries)
  const profile = results[0].data || {}
  const children = results[1].data || []
  const healthRecords = childId ? (results[2]?.data || []) : []
  const dailyLog = childId ? (results[3]?.data?.[0] || null) : null

  // 选择显示的主体（家长 or 孩子）
  const targetChild = childId ? children.find((c: any) => c.id === childId) : null
  const isChild = !!targetChild

  const name = isChild ? targetChild.name : profile.member_name || '—'
  const bloodType = isChild ? (targetChild.blood_type || profile.blood_type || '—') : (profile.blood_type || '—')
  const allergies = isChild ? (targetChild.allergies || profile.allergies || '无') : (profile.allergies || '无')
  const chronic = isChild ? (targetChild.chronic_conditions || '无') : (profile.chronic_conditions || '无')
  const nationality = profile.member_nationality || '—'
  const emergencyName = profile.emergency_name || '—'
  const emergencyPhone = profile.emergency_phone || '—'
  const emergencyRelation = profile.emergency_relation || '家属'
  const regularDoctor = profile.regular_doctor || targetChild?.regular_doctor || '—'
  const regularHospital = profile.regular_hospital || targetChild?.regular_hospital || profile.hospital_name || '—'

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
  .card-header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
  .card-type { font-size: 11px; opacity: 0.8; letter-spacing: 0.1em; }
  .card-emoji { font-size: 32px; }
  .card-name { font-size: 24px; font-weight: 700; margin-bottom: 2px; }
  .card-name-en { font-size: 13px; opacity: 0.8; }

  .blood-badge { display: inline-block; background: rgba(255,255,255,0.25); border: 1.5px solid rgba(255,255,255,0.5); border-radius: 8px; padding: 6px 14px; font-size: 18px; font-weight: 700; margin-top: 10px; }

  .section { padding: 16px 20px; border-bottom: 0.5px solid #f0f0f0; }
  .section:last-child { border-bottom: none; }
  .section-title { font-size: 10px; font-weight: 700; color: #B08D57; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 10px; }

  .trilingual { display: grid; gap: 6px; }
  .lang-row { display: grid; grid-template-columns: 24px 1fr; gap: 8px; align-items: center; }
  .lang-flag { font-size: 14px; }
  .lang-text { font-size: 13px; color: #2C3E50; line-height: 1.4; }
  .lang-text.th { color: #E07B2A; font-size: 12px; }
  .lang-text.en { color: #6B8BAA; }

  .alert-box { background: #FEF2F2; border: 1.5px solid #FCA5A5; border-radius: 10px; padding: 12px 14px; margin-bottom: 8px; }
  .alert-title { font-size: 11px; font-weight: 700; color: #DC2626; margin-bottom: 4px; }
  .alert-content { font-size: 13px; color: #2C3E50; line-height: 1.5; }

  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .info-item { background: #F8FAFC; border-radius: 8px; padding: 10px 12px; }
  .info-item-label { font-size: 10px; color: #6B8BAA; margin-bottom: 3px; }
  .info-item-value { font-size: 13px; font-weight: 600; color: #2C3E50; }

  .emergency-card { background: #FEF3C7; border: 1.5px solid #F59E0B; border-radius: 12px; padding: 14px 16px; }
  .emergency-title { font-size: 12px; font-weight: 700; color: #92400E; margin-bottom: 8px; }
  .emergency-name { font-size: 16px; font-weight: 700; color: #2C3E50; }
  .emergency-phone { font-size: 20px; font-weight: 700; color: #DC2626; margin: 4px 0; }
  .emergency-relation { font-size: 11px; color: #6B8BAA; }

  .history-item { padding: 8px 0; border-bottom: 0.5px solid #f0f0f0; }
  .history-item:last-child { border-bottom: none; }
  .history-date { font-size: 10px; color: #6B8BAA; margin-bottom: 2px; }
  .history-desc { font-size: 12px; color: #2C3E50; }
  .history-hospital { font-size: 11px; color: #B08D57; }

  .print-btn { display: block; width: 100%; padding: 14px; background: #DC2626; color: white; border: none; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; text-align: center; margin-bottom: 16px; }
  .footer { text-align: center; font-size: 11px; color: #6B8BAA; padding: 12px 0; line-height: 1.7; }
  @media print { .print-btn { display: none; } body { background: white; padding: 0; } }
</style>
</head>
<body>

<button class="print-btn" onclick="window.print()">🖨️ 打印就诊卡 / 截图保存</button>

<div class="med-card">

  <!-- 顶部信息 -->
  <div class="card-header">
    <div class="card-header-top">
      <div>
        <div class="card-type">MEDICAL INFO CARD · บัตรข้อมูลสุขภาพ · 就诊信息卡</div>
        <div class="card-name">${name}</div>
        <div class="card-name-en">${nationality}</div>
      </div>
      <div class="card-emoji">${isChild ? '👶' : '🏥'}</div>
    </div>
    ${bloodType !== '—' ? `<div class="blood-badge">🩸 Blood Type ${bloodType} · กรุ๊ปเลือด ${BLOOD_TYPE_TH[bloodType] || bloodType} · 血型 ${bloodType}</div>` : ''}
  </div>

  <!-- 过敏史 -->
  ${allergies && allergies !== '无' && allergies !== '—' ? `
  <div class="section">
    <div class="section-title">⚠️ Allergies · การแพ้ · 过敏史</div>
    <div class="alert-box">
      <div class="alert-title">ALLERGY ALERT · แพ้ · 过敏</div>
      <div class="alert-content">${allergies}</div>
    </div>
    <div class="trilingual">
      <div class="lang-row"><span class="lang-flag">🇨🇳</span><span class="lang-text">过敏：${allergies}</span></div>
      <div class="lang-row"><span class="lang-flag">🇬🇧</span><span class="lang-text en">Allergic to: ${allergies}</span></div>
      <div class="lang-row"><span class="lang-flag">🇹🇭</span><span class="lang-text th">แพ้: ${allergies}</span></div>
    </div>
  </div>` : ''}

  <!-- 慢性病史 -->
  ${chronic && chronic !== '无' && chronic !== '—' ? `
  <div class="section">
    <div class="section-title">📋 Medical History · ประวัติการรักษา · 病史</div>
    <div class="trilingual">
      <div class="lang-row"><span class="lang-flag">🇨🇳</span><span class="lang-text">慢性病：${chronic}</span></div>
      <div class="lang-row"><span class="lang-flag">🇬🇧</span><span class="lang-text en">Chronic conditions: ${chronic}</span></div>
      <div class="lang-row"><span class="lang-flag">🇹🇭</span><span class="lang-text th">โรคประจำตัว: ${chronic}</span></div>
    </div>
  </div>` : ''}

  <!-- 当前状态（孩子）-->
  ${dailyLog ? `
  <div class="section">
    <div class="section-title">📊 Today's Status · สถานะวันนี้ · 今日状态</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-item-label">健康 Health</div>
        <div class="info-item-value">${dailyLog.health_status === 'sick' ? '🤒 生病中' : dailyLog.health_status === 'recovering' ? '💊 恢复中' : '✅ 健康'}</div>
      </div>
      <div class="info-item">
        <div class="info-item-label">心情 Mood</div>
        <div class="info-item-value">${dailyLog.mood_status === 'happy' ? '😊 开心' : dailyLog.mood_status === 'upset' ? '😔 低落' : dailyLog.mood_status === 'anxious' ? '😟 焦虑' : '😌 平静'}</div>
      </div>
      ${dailyLog.medication_taken ? `<div class="info-item" style="grid-column:span 2"><div class="info-item-label">用药 Medication</div><div class="info-item-value">💊 今日已服药</div></div>` : ''}
      ${dailyLog.health_notes ? `<div class="info-item" style="grid-column:span 2"><div class="info-item-label">备注 Notes</div><div class="info-item-value" style="font-size:12px;font-weight:400">${dailyLog.health_notes}</div></div>` : ''}
    </div>
  </div>` : ''}

  <!-- 固定医生/医院 -->
  <div class="section">
    <div class="section-title">🏥 Regular Doctor · แพทย์ประจำ · 固定医生</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-item-label">医生 Doctor</div>
        <div class="info-item-value">${regularDoctor}</div>
      </div>
      <div class="info-item">
        <div class="info-item-label">医院 Hospital</div>
        <div class="info-item-value">${regularHospital}</div>
      </div>
    </div>
  </div>

  <!-- 就诊描述模板 -->
  <div class="section">
    <div class="section-title">💬 Chief Complaint Template · แบบฟอร์มอาการ · 主诉模板</div>
    <div style="background:#F0FFF4;border-radius:8px;padding:12px;font-size:12px;color:#065F46;line-height:1.8;margin-bottom:8px">
      我叫 ${name}，${bloodType !== '—' ? `血型 ${bloodType}，` : ''}${allergies && allergies !== '无' ? `对${allergies}过敏，` : ''}今天来就诊的原因是：_______________
    </div>
    <div style="background:#F0F9FF;border-radius:8px;padding:12px;font-size:12px;color:#0C4A6E;line-height:1.8;margin-bottom:8px">
      My name is ${name}. ${bloodType !== '—' ? `Blood type ${bloodType}. ` : ''}${allergies && allergies !== '无' ? `Allergic to ${allergies}. ` : ''}I'm here because: _______________
    </div>
    <div style="background:#FFF7ED;border-radius:8px;padding:12px;font-size:12px;color:#7C2D12;line-height:1.8">
      ผมชื่อ ${name} ${bloodType !== '—' ? `กรุ๊ปเลือด ${bloodType} ` : ''}${allergies && allergies !== '无' ? `แพ้ ${allergies} ` : ''}มาพบแพทย์เพราะ: _______________
    </div>
  </div>

  <!-- 就诊历史 -->
  ${healthRecords.length > 0 ? `
  <div class="section">
    <div class="section-title">📅 Recent Visits · ประวัติการรักษา · 近期就诊</div>
    ${healthRecords.map((r: any) => `
    <div class="history-item">
      <div class="history-date">${formatDate(r.date)} · ${r.type}</div>
      <div class="history-desc">${r.description || '—'}</div>
      ${r.hospital ? `<div class="history-hospital">🏥 ${r.hospital}${r.doctor_name ? ` · Dr. ${r.doctor_name}` : ''}</div>` : ''}
      ${r.follow_up_date ? `<div class="history-date" style="color:#DC2626">复诊日期：${formatDate(r.follow_up_date)}</div>` : ''}
    </div>`).join('')}
  </div>` : ''}

  <!-- 紧急联系人 -->
  <div class="section">
    <div class="section-title">🆘 Emergency Contact · ผู้ติดต่อฉุกเฉิน · 紧急联系人</div>
    <div class="emergency-card">
      <div class="emergency-title">IN CASE OF EMERGENCY · กรณีฉุกเฉิน · 紧急情况联系</div>
      <div class="emergency-name">${emergencyName}</div>
      <div class="emergency-relation">${emergencyRelation}</div>
      <div class="emergency-phone">📞 ${emergencyPhone}</div>
    </div>
  </div>

  <!-- 所有孩子（如果是家长卡）-->
  ${!isChild && children.length > 0 ? `
  <div class="section">
    <div class="section-title">👨‍👩‍👧 Family Members · สมาชิกในครอบครัว · 家庭成员</div>
    <div class="info-grid">
      ${children.map((c: any) => `
      <div class="info-item">
        <div class="info-item-label">${c.emoji || '👶'} ${c.name}</div>
        <div class="info-item-value" style="font-size:11px;font-weight:400">${c.school_name || '—'}</div>
      </div>`).join('')}
    </div>
  </div>` : ''}

</div>

<div class="footer">
  由根·陪伴生成 · ${new Date().toLocaleDateString('zh-CN')} · 请以实际医嘱为准<br>
  Generated by Gen Companion · For medical reference only
</div>

</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
}
