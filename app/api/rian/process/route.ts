export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MAKE_WEBHOOK_URL = process.env.NEXT_PUBLIC_MAKE_WEBHOOK_URL || ''

// ══ 9维度分类 (保持原样) ══
const DIMENSION_MAP: Record<string, string[]> = {
  compliance: ['签证', '护照', '驾照', '税务', '合同', '保险', '移民', '公证', '报到', '续签'],
  estate: ['房产', '物业', '水电', '保养', '维修', '家政', '搬家', '装修', '安防'],
  logistics: ['购物', '采购', '快递', '包裹', '食谱', '库存', '药品', '消耗'],
  education: ['学校', '课表', '成绩', '作业', '考试', '兴趣班', '留学', '奖学金', '中文'],
  social: ['生日', '婚礼', '葬礼', '礼物', '聚会', '派对', '亲友', '配偶', '纪念'],
  wealth: ['账单', '银行', '贷款', '投资', '保险', '退订', '理财', '信用卡', '财务'],
  medical: ['看病', '医院', '复诊', '体检', '药', '疫苗', '手术', '诊断', '处方'],
  mobility: ['机票', '酒店', '旅行', '签证', '出行', '路书', '行程', '导航'],
  selfcare: ['睡眠', '冥想', '运动', '学习', '书单', '影单', '自我', '成长'],
}

function detectDimension(text: string): string {
  for (const [dim, keywords] of Object.entries(DIMENSION_MAP)) {
    if (keywords.some(k => text.includes(k))) return dim
  }
  return 'other'
}

// ══ 触发Make.com (保持原样) ══
async function triggerMake(extracted: any[], input_type: string) {
  if (!MAKE_WEBHOOK_URL) return
  for (const e of extracted) {
    const dimension = detectDimension(
      (e.title || '') + (e.notes || '') + (e.claude_advice || '')
    )
    if (e.due_date) {
      const startTime = new Date(e.due_date)
      const endTime = new Date(startTime)
      endTime.setHours(endTime.getHours() + 2)
      try {
        await fetch(MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'calendar',
            title: e.title,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            description: [
              e.claude_advice,
              e.action_items?.length ? `行动清单：${e.action_items.join('、')}` : null,
              e.carry_items?.length ? `携带：${e.carry_items.join('、')}` : null,
              e.warnings?.length ? `注意：${e.warnings.join('、')}` : null,
            ].filter(Boolean).join('\n'),
            location: '清迈',
            dimension,
            who: e.who,
            priority: e.priority,
          }),
        })
      } catch (err) { console.error('Make calendar error:', err) }
    }
    if (e.priority === 3) {
      try {
        await fetch(MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'urgent_alert', title: e.title, message: e.claude_advice || e.notes, dimension, who: e.who, due_date: e.due_date }),
        })
      } catch (err) { console.error('Make urgent error:', err) }
    }
    if (dimension === 'compliance') {
      try {
        await fetch(MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'compliance_check', title: e.title, due_date: e.due_date, who: e.who, notes: e.notes }),
        })
      } catch (err) { console.error('Make compliance error:', err) }
    }
    if (dimension === 'education') {
      try {
        await fetch(MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'education_sync', title: e.title, who: e.who, due_date: e.due_date, notes: e.notes }),
        })
      } catch (err) { console.error('Make education error:', err) }
    }
  }
}

// ══ Gemini语音转文字 (保持原样) ══
async function transcribeAudio(fileUrl: string): Promise<string> {
  try {
    const audioRes = await fetch(fileUrl)
    const audioBuffer = await audioRes.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: '请把这段音频转成文字，原文输出，不要添加任何解释：' },
            { inline_data: { mime_type: 'audio/webm', data: base64Audio } }
          ]}]
        }),
      }
    )
    const data = await response.json()
    if (data.error) { console.error('Gemini错误:', data.error.message); return '' }
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  } catch (e: any) {
    console.error('Gemini转文字失败:', e?.message || e)
    return ''
  }
}

// ══ Grok实时搜索 (保持原样) ══
async function grokSearch(query: string): Promise<string> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'grok-3-fast',
        search_enabled: true,
        messages: [
          { role: 'system', content: '你是清迈本地情报员。用中文简洁回答，提供实时信息，100字以内。' },
          { role: 'user', content: query }
        ]
      }),
    })
    clearTimeout(timeout)
    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  } catch (e: any) {
    console.error('Grok搜索失败:', e?.message || e)
    return ''
  }
}

// ══ 查询家庭档案 (修改：加入 user_id 过滤) ══
async function getFamilyContext(supabase: any, userId: string): Promise<string> {
  try {
    const [children, recentTodos, recentLogs, habits, interests, observations, places] = await Promise.all([
      supabase.from('children').select('*').eq('user_id', userId),
      supabase.from('todo_items').select('title,category,priority,status,due_date').eq('user_id', userId).neq('status','done').order('created_at',{ascending:false}).limit(20),
      supabase.from('child_daily_log').select('*').eq('user_id', userId).order('date',{ascending:false}).limit(7),
      supabase.from('family_habits').select('*').eq('user_id', userId).limit(20),
      supabase.from('interest_weights').select('*').eq('user_id', userId).order('weight',{ascending:false}).limit(10),
      supabase.from('ai_observations').select('*').eq('user_id', userId).order('created_at',{ascending:false}).limit(5),
      supabase.from('family_places').select('*').eq('user_id', userId),
    ])
    return JSON.stringify({
      children: children.data || [],
      currentTodos: recentTodos.data || [],
      recentChildLogs: recentLogs.data || [],
      habits: habits.data || [],
      interests: interests.data || [],
      observations: observations.data || [],
      places: places.data || [],
    })
  } catch (e) { return '{}' }
}

// ══ Grok触发关键词判断 (保持原样) ══
function buildGrokQuery(content: string): string | null {
  const keywords: Record<string, string[]> = {
    medical: ['看病', '医院', '复诊', '体检', '生病', '发烧', '药', '诊所'],
    weather: ['出门', '外出', '天气', '下雨', '台风', '雾霾', '空气'],
    traffic: ['开车', '堵车', '路况', '接送', '出发'],
    shopping: ['购物', '超市', '买', '采购'],
    visa: ['签证', '报到', '移民', '护照', '续签'],
    school: ['学校', '接孩子', '放学', '开学', '考试'],
    emergency: ['传染病', '疫情', '预警', '台风', '洪水', '停电'],
  }
  const matched: string[] = []
  for (const [type, words] of Object.entries(keywords)) {
    if (words.some(w => content.includes(w))) matched.push(type)
  }
  if (!matched.length) return null
  const parts = ['今天清迈最新情况：']
  if (matched.includes('medical')) parts.push('各大医院排队等待时间、是否有传染病流行')
  if (matched.includes('weather')) parts.push('今明两天天气预报、空气质量指数')
  if (matched.includes('traffic')) parts.push('清迈市区主要道路交通状况')
  if (matched.includes('shopping')) parts.push('超市营业时间、是否有促销')
  if (matched.includes('visa')) parts.push('清迈移民局最新政策、排队情况')
  if (matched.includes('school')) parts.push('清迈学校最新通知、交通状况')
  if (matched.includes('emergency')) parts.push('清迈紧急情况、自然灾害预警')
  return parts.join('')
}

// ══ System Prompt (保持原样) ══
function buildSystemPrompt(familyContext: string, grokInfo: string): string {
  return `你是日安，一个全能人生管家AI，专为清迈陪读家庭服务。

## 你的任务
接收用户的生活碎片，结合家庭档案和实时信息，生成全面的行动方案。

## 家庭档案
${familyContext}

## 实时外部信息
${grokInfo || '暂无实时信息'}

## 输出规则
严格只输出JSON数组，不加任何其他文字：
[
  {
    "title": "事件标题",
    "category": "visa|birthday|medical|school|shopping|family|travel|finance|health|emergency|other",
    "dimension": "compliance|estate|logistics|education|social|wealth|medical|mobility|selfcare",
    "who": "涉及的人",
    "due_date": "截止日期ISO格式或null",
    "recur": "none|daily|weekly|monthly|yearly",
    "priority": 1|2|3,
    "notes": "补充说明",
    "claude_advice": "日安的完整行动建议",
    "action_items": ["具体行动1", "具体行动2", "具体行动3"],
    "carry_items": ["需要携带的物品1", "物品2"],
    "depart_time": "建议出发时间或null",
    "warnings": ["风险提示1", "风险提示2"],
    "related_tasks": ["顺路可以做的事1"],
    "search_keywords": ["办理时Grok要搜的关键词1", "关键词2", "关键词3"],
    "family_data_needed": ["passport", "visa", "medical", "address", "children", "habits", "places", "finance", "insurance"],
    "is_child_related": true|false,
    "child_health_update": null,
    "child_mood_update": null,
    "child_sleep_update": null,
    "child_medication": null,
    "child_notable": null,
    "child_schedule_add": null,
    "child_packing_needs": [],
    "interest_signals": [],
    "learn_pattern": {
      "type": "消费|医疗|出行|社交|其他",
      "cycle_days": null,
      "last_occurrence": null,
      "pattern_note": "规律描述"
    }
  }
]
## 字段说明
- search_keywords: 用户一键办理时Grok需要实时搜索的关键词，根据事件类型和维度生成3-5个精准关键词
  例如签证：["泰国Tourist Visa续签2026最新要求", "清迈移民局排队时间", "TM.7表格下载"]
  例如医疗：["清迈Ram医院儿科今日排队", "清迈儿科预约流程", "清迈24小时药房"]
  例如学校：["Lanna School家长会安排", "学费缴纳方式", "校服购买地点"]
- family_data_needed: 办理时需要从档案读取的字段类型
  可选值：passport（护照信息）、visa（签证信息）、medical（医疗档案）、address（地址）、children（孩子信息）、habits（习惯）、places（常用地点）、finance（财务）、insurance（保险）
- is_child_related: 这件事是否和孩子直接相关
- child_health_update: 孩子健康更新 {"status": "normal|sick|recovering", "notes": "描述"}
- child_mood_update: 孩子心情 {"status": "happy|calm|anxious|upset", "notes": "描述"}
- child_sleep_update: 孩子睡眠 {"start": "22:00", "end": "07:00"}
- child_medication: 用药记录 true/false
- child_notable: 今天值得记录的事 "string"
- child_schedule_add: 新增日程 {"title": "", "date": "YYYY-MM-DD", "time": "HH:MM", "location": "", "requires_action": "", "requires_items": []}
- child_packing_needs: 需要携带/购买 [{"item": "", "event_date": "YYYY-MM-DD", "category": "buy|find|prepare|wear", "need_buy": true}]
- interest_signals: 兴趣信号 [{"topic": "", "weight_delta": 1-5, "signal_type": "mention|question|action"}]

## 9维度search_keywords生成规则
compliance: 签证/护照办理地点排队、最新材料要求、表格下载链接
estate: 水电缴费方式、物业联系、维修工推荐
logistics: 商品价格对比、超市营业时间、代购渠道
education: 学校最新通知、缴费方式、老师联系方式
social: 聚会餐厅推荐、礼品购买、节日习俗
wealth: 实时汇率、最优汇款渠道、账单缴纳方式
medical: 医院今日排队、预约流程、科室电话
mobility: 实时路况、机票价格、交通选项
selfcare: 课程推荐、社群活动、心理资源

## 分析维度
1. 需要携带什么？2. 几点出发？3. 顺路做什么？4. 风险预警？5. 行为规律？6. 孩子健康/证件相关？7. 办理时需要搜索什么？8. 需要读取哪些档案？

优先级判断标准（必须严格遵守）：
- priority 3（紧急/red）：7天内必须处理 OR 签证/护照/医疗紧急 OR 孩子生病/受伤 OR 任何"今天""明天""这周"的事
- priority 2（重要/orange）：8-30天内需处理 OR 需要提前预约 OR 涉及金钱缴费 OR 需要购买物品
- priority 1（普通/yellow）：30天以上 OR 长期规划 OR 无明确截止日期的建议性事项
注意：宁可给高优先级，不要给低优先级。用户说的大部分事情都是近期需要处理的。
今天日期：${new Date().toLocaleDateString('zh-CN')}`
}
// ══ 核心逻辑：同步到三珠数据表 (修改：废除 default，改用 userId) ══
async function syncToThreeDrops(supabase: any, extracted: any[], rawInputId: string | null, userId: string): Promise<string[]> {
  const todoIds: string[] = []
  const today = new Date().toISOString().split('T')[0]

  // ── 获取孩子ID（修改：按 userId 过滤）──
  const { data: children } = await supabase.from('children').select('id, name').eq('user_id', userId).limit(5)
  const childId = children?.[0]?.id || null

  for (const e of extracted) {
    const dimension = detectDimension((e.title || '') + (e.notes || '') + (e.claude_advice || ''))

    // ── 1. 写入 todo_items（修改：加入 user_id） ──
    const priority = e.priority === 3 ? 'red' : e.priority === 2 ? 'orange' : 'yellow'
    let aiDraft: string | null = null
    let aiActionType: string | null = null
    let oneTapReady = false

    if (e.category === 'school' || e.dimension === 'education') {
  aiDraft = `感谢通知，${e.who || '孩子'}的${e.title}相关事宜已收到，请确认详情。`
  aiActionType = 'send_email'
  oneTapReady = true
} else if (e.dimension === 'wealth' || e.category === 'finance') {
  aiActionType = 'pay'
  oneTapReady = !!e.due_date
} else if (e.dimension === 'medical') {
  aiActionType = 'book'
  oneTapReady = true
} else if (e.dimension === 'logistics') {
  aiActionType = 'buy'
  oneTapReady = true
} else if (e.dimension === 'compliance') {
  aiActionType = 'fill_form'
  oneTapReady = true
} else if (e.dimension === 'mobility') {
  aiActionType = 'navigate'
  oneTapReady = true
} else if (e.dimension === 'social') {
  aiActionType = 'whatsapp'
  oneTapReady = true
} else if (e.dimension === 'estate') {
  aiActionType = 'pay'
  oneTapReady = !!e.due_date
} else if (e.dimension === 'selfcare') {
  aiActionType = 'calendar'
  oneTapReady = true
}
    let reminderDays: number | null = null
    if (e.due_date) {
      const daysLeft = Math.ceil((new Date(e.due_date).getTime() - Date.now()) / 86400000)
      if (daysLeft > 30) reminderDays = 90
      else if (daysLeft > 7) reminderDays = 30
    }

    const { data: todoItem } = await supabase.from('todo_items').insert({
      user_id: userId, // 废除 default
      title: e.title,
      description: e.claude_advice,
      category: e.dimension || dimension,
      priority,
      status: 'pending',
      due_date: e.due_date || null,
      source: 'rian',
      source_ref_id: rawInputId,
      ai_draft: aiDraft,
      ai_action_type: aiActionType,
     ai_action_data: {
  action_items: e.action_items,
  carry_items: e.carry_items,
  depart_time: e.depart_time,
  warnings: e.warnings,
  related_tasks: e.related_tasks,
  brain_instruction: {
    dimension: e.dimension,
    intent: e.title,
    context: e.claude_advice,
    search_keywords: e.search_keywords || [],
    family_data_needed: e.family_data_needed || [],
    who: e.who,
    due_date: e.due_date,
  }
},
      one_tap_ready: oneTapReady,
      location_relevant: !!(e.depart_time || e.related_tasks?.length),
    }).select().single()
    if (todoItem?.id) todoIds.push(todoItem.id)

    // ── 2. 三级提醒链（修改：加入 user_id） ──
    if (todoItem && e.due_date && reminderDays) {
      const benefit = e.dimension === 'compliance' ? '提前办理避免逾期罚款' : e.dimension === 'wealth' ? '提前缴费可能有优惠' : '提前准备更从容'
      await supabase.from('reminder_chains').insert([
        { todo_id: todoItem.id, user_id: userId, level: 1, trigger_days_before: reminderDays, trigger_date: new Date(Date.now() - reminderDays * 86400000).toISOString().split('T')[0], status: 'pending', benefit_description: benefit },
        { todo_id: todoItem.id, user_id: userId, level: 2, trigger_days_before: 7, trigger_date: new Date(new Date(e.due_date).getTime() - 7 * 86400000).toISOString().split('T')[0], status: 'pending', benefit_description: benefit },
        { todo_id: todoItem.id, user_id: userId, level: 3, trigger_days_before: 1, trigger_date: new Date(new Date(e.due_date).getTime() - 86400000).toISOString().split('T')[0], status: 'pending', benefit_description: benefit },
      ])
    }

    // ── 3. 孩子状态更新（修改：加入 user_id） ──
    if (childId && e.is_child_related) {
      const logUpdate: any = { child_id: childId, user_id: userId, date: today, source_input_ids: [rawInputId].filter(Boolean) }
      let hasUpdate = false
      if (e.child_health_update) { logUpdate.health_status = e.child_health_update.status; logUpdate.health_notes = e.child_health_update.notes; hasUpdate = true }
      if (e.child_mood_update) { logUpdate.mood_status = e.child_mood_update.status; logUpdate.mood_notes = e.child_mood_update.notes; hasUpdate = true }
      if (e.child_sleep_update) { logUpdate.sleep_start = e.child_sleep_update.start; logUpdate.sleep_end = e.child_sleep_update.end; hasUpdate = true }
      if (e.child_medication !== null && e.child_medication !== undefined) { logUpdate.medication_taken = e.child_medication; hasUpdate = true }
      if (e.child_notable) { logUpdate.notable_events = [e.child_notable]; hasUpdate = true }

      if (hasUpdate) {
        const { data: existing } = await supabase.from('child_daily_log').select('id, notable_events, source_input_ids').eq('child_id', childId).eq('date', today).eq('user_id', userId).single()
        if (existing) {
          const mergedNotable = [...(existing.notable_events || []), ...(logUpdate.notable_events || [])]
          const mergedSources = [...(existing.source_input_ids || []), ...(logUpdate.source_input_ids || [])]
          await supabase.from('child_daily_log').update({ ...logUpdate, notable_events: mergedNotable, source_input_ids: mergedSources, updated_at: new Date().toISOString() }).eq('id', existing.id)
        } else {
          await supabase.from('child_daily_log').insert(logUpdate)
        }
      }
    }

    // ── 4. 孩子校历事件（修改：加入 user_id） ──
    if (childId && e.child_schedule_add) {
      const s = e.child_schedule_add
      await supabase.from('child_school_calendar').insert({
        child_id: childId, user_id: userId, event_type: e.category === 'school' ? 'activity' : e.dimension || 'activity',
        title: s.title || e.title, date_start: s.date || e.due_date || today, date_end: s.date || e.due_date || today,
        description: e.claude_advice, requires_action: s.requires_action, requires_items: s.requires_items || [],
        requires_payment: e.dimension === 'wealth' ? parseFloat(e.notes) || null : null, source: 'rian',
      })
    }

    // ── 5. 携带清单（修改：加入 user_id） ──
    if (childId && e.child_packing_needs?.length > 0) {
      for (const need of e.child_packing_needs) {
        if (!need.event_date) continue
        const newItem = { name: need.item, category: need.category || 'prepare', status: 'pending', need_buy: need.need_buy || false, reminder_15d_sent: false, reminder_7d_sent: false, reminder_1d_sent: false, reminder_day_sent: false }
        const { data: existing } = await supabase.from('packing_lists').select('id, items').eq('child_id', childId).eq('date', need.event_date).eq('user_id', userId).single()
        if (existing) {
          const items = Array.isArray(existing.items) ? existing.items : []
          if (!items.some((i: any) => i.name === need.item)) { await supabase.from('packing_lists').update({ items: [...items, newItem] }).eq('id', existing.id) }
        } else {
          await supabase.from('packing_lists').insert({ child_id: childId, user_id: userId, date: need.event_date, items: [newItem], weather_incorporated: false, health_incorporated: false })
        }
      }
    }

    // ── 6. 兴趣权重更新（修改：加入 user_id） ──
    if (e.interest_signals?.length > 0) {
      for (const sig of e.interest_signals) {
        const { data: existing } = await supabase.from('interest_weights').select('*').eq('user_id', userId).eq('topic', sig.topic).single()
        if (existing) {
          await supabase.from('interest_weights').update({ weight: Math.min(100, existing.weight + (sig.weight_delta || 1)), signal_count: existing.signal_count + 1, last_signal_at: new Date().toISOString(), last_updated: new Date().toISOString() }).eq('id', existing.id)
        } else {
          await supabase.from('interest_weights').insert({ user_id: userId, topic: sig.topic, weight: 10 + (sig.weight_delta || 1), signal_count: 1, last_signal_at: new Date().toISOString() })
        }
      }
    }
  }

  // ── 7. AI情绪观察（修改：加入 user_id） ──
  const stressSignals = extracted.filter(e => e.priority === 3 || e.warnings?.length > 1 || e.action_items?.length > 3)
  if (stressSignals.length >= 2) {
    await supabase.from('ai_observations').insert({ user_id: userId, observation_type: 'stress', content: { level: 'high', signals: stressSignals.map((e: any) => e.title), note: '今天有多件紧急事项，妈妈压力较大' }, confidence: 70, source_input_ids: [rawInputId].filter(Boolean) })
  }
   return todoIds
}

// ══════════════════════════════════════════════════════════════
// 主处理函数
// ══════════════════════════════════════════════════════════════
export async function POST(req: NextRequest) {
  try {
    const { content, input_type, file_url, user_id: body_user_id } = await req.json()
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // ★ 关键拦截层：获取 Auth 用户 ★
   const activeUserId = body_user_id
    if (!activeUserId) {
      
      return NextResponse.json({ ok: false, error: 'Unauthorized: Missing User Context' }, { status: 401 })
    }
    // ★ NVIDIA NemoClaw 安全检测入口 (商业隔离钩子) ★
    const dimension = detectDimension(content || '')
    const isSensitive = dimension === 'compliance' || dimension === 'wealth'
    if (isSensitive) {
      console.log(`[NemoClaw-Guard] 拦截到敏感操作 (${dimension})，正在为用户 ${activeUserId} 建立安全会话隔离`)
      // 未来此处插入 nemoClaw.secureRoute(...)
    }

    // 1. 存入raw_inputs (修改：使用 activeUserId)
    const { data: rawInput } = await supabase.from('raw_inputs').insert({
      user_id: activeUserId,
      input_type,
      raw_content: content,
      file_url: file_url || null,
      processed: false,
    }).select().single()

    // 2. 音频→Gemini转文字 (保持原样)
    let processedContent = content
    if (input_type === 'audio' && file_url) {
      const transcribed = await transcribeAudio(file_url)
      if (transcribed) {
        processedContent = transcribed
        await supabase.from('raw_inputs').update({ raw_content: transcribed }).eq('id', rawInput?.id)
      }
    }

    // 3. 并行：查家庭档案 (修改：传入 activeUserId) + Grok搜索
    const grokQuery = buildGrokQuery(processedContent)
    const [familyContext, grokInfo] = await Promise.all([
      getFamilyContext(supabase, activeUserId),
      grokQuery ? grokSearch(grokQuery) : Promise.resolve(''),
    ])

    // 4. Claude全维度分析 (保持原样)
    const messages: any[] = []
    if (input_type === 'image' && file_url) {
      messages.push({ role: 'user', content: [
        { type: 'image', source: { type: 'url', url: file_url } },
        { type: 'text', text: processedContent || '请分析这张图片，提取所有需要跟进的事件' }
      ]})
    } else {
      messages.push({ role: 'user', content: processedContent })
    }

const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: { ... },
  body: JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    system: buildSystemPrompt(familyContext, grokInfo),
    messages,
    tools: [{
      name: 'extract_events',
      description: '提取用户输入中的所有生活事件',
      input_schema: {
        type: 'object',
        properties: {
          events: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                category: { type: 'string' },
                dimension: { type: 'string' },
                who: { type: 'string' },
                due_date: { type: 'string' },
                recur: { type: 'string' },
                priority: { type: 'number' },
                notes: { type: 'string' },
                claude_advice: { type: 'string' },
                action_items: { type: 'array', items: { type: 'string' } },
                carry_items: { type: 'array', items: { type: 'string' } },
                depart_time: { type: 'string' },
                warnings: { type: 'array', items: { type: 'string' } },
                related_tasks: { type: 'array', items: { type: 'string' } },
                search_keywords: { type: 'array', items: { type: 'string' } },
                family_data_needed: { type: 'array', items: { type: 'string' } },
                is_child_related: { type: 'boolean' },
                child_health_update: { type: 'object' },
                child_mood_update: { type: 'object' },
                child_sleep_update: { type: 'object' },
                child_medication: { type: 'boolean' },
                child_notable: { type: 'string' },
                child_schedule_add: { type: 'object' },
                child_packing_needs: { type: 'array', items: { type: 'object' } },
                interest_signals: { type: 'array', items: { type: 'object' } },
                learn_pattern: { type: 'object' },
              },
              required: ['title', 'priority']
            }
          }
        },
        required: ['events']
      }
    }],
    tool_choice: { type: 'tool', name: 'extract_events' },
  }),
})

const data = await response.json()
const toolUse = data.content?.find((c: any) => c.type === 'tool_use')
const extracted: any[] = toolUse?.input?.events || []
    // 5. 存入结果
let todoIds: string[] = []
if (extracted.length > 0) {
  const patterns = extracted.filter((e: any) => e.learn_pattern?.type)
  if (patterns.length > 0) {
    await supabase.from('family_habits').insert(
      patterns.map((e: any) => ({ user_id: activeUserId, habit_type: e.learn_pattern.type, cycle_days: e.learn_pattern.cycle_days || null, last_done: e.learn_pattern.last_occurrence || null, notes: e.learn_pattern.pattern_note || e.title }))
    )
  }
  await triggerMake(extracted, input_type)
  todoIds = await syncToThreeDrops(supabase, extracted, rawInput?.id || null, activeUserId)
}
// 异步预热 Grok 结果存库（不阻塞返回）
;(async () => {
  for (const e of extracted) {
    const keywords = e.search_keywords
    if (!keywords?.length) continue
    const idx = extracted.indexOf(e)
    const todoId = todoIds[idx]
    if (!todoId) continue
    try {
      const grokResult = await grokSearch(keywords.join('，') + '，清迈本地最新情况')
      if (!grokResult) continue
      const { data: todo } = await supabase.from('todo_items').select('ai_action_data').eq('id', todoId).single()
      await supabase.from('todo_items').update({
        ai_action_data: {
          ...(todo?.ai_action_data || {}),
          grok_result: grokResult,
        }
      }).eq('id', todoId)
    } catch (e) {
      console.error('Grok预热失败:', e)
    }
  }
})()
// 8. 标记已处理
await supabase.from('raw_inputs').update({ processed: true, extracted_events: extracted }).eq('id', rawInput?.id).eq('user_id', activeUserId)

return NextResponse.json({ 
  ok: true, 
  events: extracted,
  todo_ids: todoIds
})
} catch (e: any) {
  console.error('PROCESS ERROR:', e?.message || e)
  return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
}
}
