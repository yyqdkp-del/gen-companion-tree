export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

async function getDefaultUserId(): Promise<string | null> {
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1 })
  return data?.users?.[0]?.id || null
}

async function getFamilySnapshot(userId: string) {
  const [
    { data: children },
    { data: places },
    { data: interests },
    { data: habits },
  ] = await Promise.all([
    supabase.from('children').select('name, school_name, grade').eq('user_id', userId).limit(5),
    supabase.from('family_places').select('name, city, lat, lng, is_primary, visit_frequency').eq('user_id', userId).limit(20),
    supabase.from('interest_weights').select('topic, weight').eq('user_id', userId).gte('weight', 20).order('weight', { ascending: false }).limit(10),
    supabase.from('family_habits').select('notes').eq('user_id', userId).limit(10),
  ])
  return { children, places, interests, habits }
}

// ── Grok 实时快数据 ──
async function callGrok(snapshot: any, location: string): Promise<string> {
  const child = snapshot.children?.[0]
  const topInterests = snapshot.interests?.map((i: any) => i.topic).slice(0, 5).join('、') || ''
  const frequentPlaces = snapshot.places
    ?.filter((p: any) => ['weekly', 'daily'].includes(p.visit_frequency))
    ?.map((p: any) => p.name).slice(0, 5).join('、') || ''

  const hour = new Date().getHours()
  const timeCtx = hour < 10 ? '早上出门前' : hour < 14 ? '午间' : hour < 17 ? '放学前' : '晚间'

  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'grok-3-fast',
        search_enabled: true,
        messages: [
          {
            role: 'system',
            content: '你是实时情报员，只返回真实搜索到的信息，不编造任何内容。'
          },
          {
            role: 'user',
            content: `现在是${location} ${timeCtx}，搜索以下内容并返回真实数据：

1. ${location}今日天气+明日预报（含降雨概率和AQI）
2. X/Twitter #ChiangMai 过去6小时突发事件（封路/火灾/示威/事故）
3. 泰铢兑人民币今日汇率+近7日走势
4. ${child?.school_name || '清迈国际学校'}周边今日路况
5. ${frequentPlaces ? `${frequentPlaces}近期活动/特卖预告` : 'Central Festival/Maya近期活动'}
${topInterests ? `6. 关注话题最新动态：${topInterests}` : ''}

每条必须包含具体数据、时间、来源。无真实信息不输出。`
          }
        ],
      }),
    })
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  } catch (e: any) {
    console.error('Grok调用失败:', e?.message)
    return ''
  }
}

// ── Gemini 深度本地化 ──
async function callGemini(snapshot: any, location: string): Promise<string> {
  const child = snapshot.children?.[0]
try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `用Google Search搜索${location}本地信息：\n1. 本地官方媒体（Chiang Mai 108/CM108）今日停水停电行政通知\n2. 泰国移民局官网近期签证政策变化\n3. ${location}近30天新开亲子餐厅或活动场所（Google Maps 4星以上）\n4. ${location}登革热/流感等健康疾病官方最新数据\n5. ${child?.school_name || '清迈国际学校'}官方近期公告\n6. 泰国政府官网近期影响外籍家庭的政策\n每条必须注明来源网址和可信度（官方/社交/用户），用中文输出。无真实信息不输出。`
            }]
          }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0.2 }
        }),
      }
    )
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  } catch (e: any) {
    console.error('Gemini调用失败:', e?.message)
    return ''
  }
}

// ── Claude 整合润色 ──
async function callClaude(grokData: string, geminiData: string, snapshot: any, location: string): Promise<any[]> {
  const children = snapshot.children?.map((c: any) => `${c.name}(${c.school_name})`).join('、') || '孩子'

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: `你是「根」，清迈陪读家庭最懂你的AI闺蜜。

Grok实时数据：
${grokData || '（无数据）'}

Gemini本地数据：
${geminiData || '（无数据）'}

家庭信息：
- 地区：${location}
- 孩子：${children}
- 关注兴趣：${snapshot.interests?.map((i: any) => i.topic).slice(0, 5).join('、') || '无'}

要求：
1. 合并两份数据，去除重复内容
2. 绝对不包含任何待办任务相关内容
3. 最多8条，按紧急度排序
4. 只写外部真实发生的事，不编造
5. 闺蜜语气，具体有用，每条说清楚和这个家庭的关联
6. 不同来源交叉验证，可信度高的优先

严格只返回JSON数组，不加任何其他文字：
[{
  "title": "简短标题（10字以内）",
  "category": "safety|education|visa|finance|health|shopping|mom|weather",
  "urgency": "urgent|important|lifestyle",
  "summary": "根发现...（2-3句，具体数据，闺蜜语气）",
  "relevance_reason": "和你有关：...（具体说明与这个家庭的关联）",
  "action_available": true,
  "action_type": "navigate|call|open_url|null",
  "action_data": {"url": "", "destination": "", "phone": ""},
  "expires_hours": 6,
  "source_credibility": "官方|社交|用户"
}]`
        }]
      }),
    })
    const data = await res.json()
    const raw = data.content?.[0]?.text || '[]'
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const match = cleaned.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch (e: any) {
    console.error('Claude整合失败:', e?.message)
    return []
  }
}

// ── 保存热点（按天去重）──
async function saveHotspots(items: any[], userId: string): Promise<number> {
  if (!items.length) return 0

  const today = new Date().toISOString().split('T')[0]

  // 今天已有的 category
  const { data: existing } = await supabase
    .from('hotspot_items')
    .select('category')
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00`)
    .neq('status', 'dismissed')

  const existingCategories = new Set(existing?.map((e: any) => e.category) || [])

  // 过滤掉今天已有同 category 的，urgent 除外（urgent 可以重复写入）
  const toInsert = items.filter(item =>
    item.urgency === 'urgent' || !existingCategories.has(item.category)
  )

  if (!toInsert.length) return 0

  const { error } = await supabase.from('hotspot_items').insert(
    toInsert.map(item => ({
      user_id: userId,
      category: item.category || 'lifestyle',
      urgency: item.urgency || 'lifestyle',
      title: item.title,
      summary: item.summary,
      relevance_reason: item.relevance_reason,
      action_available: item.action_available || false,
      action_type: item.action_type || null,
      action_data: item.action_data || {},
      status: 'unread',
      expires_at: new Date(Date.now() + (item.expires_hours || 24) * 3600000).toISOString(),
    }))
  )

  if (error) console.error('热点写入失败:', error)
  return toInsert.length
}

// ── 归档昨天的热点 ──
async function archiveOldHotspots(userId: string) {
  const today = new Date().toISOString().split('T')[0]
  await supabase
    .from('hotspot_items')
    .update({ status: 'dismissed' })
    .eq('user_id', userId)
    .lt('created_at', `${today}T00:00:00`)
    .neq('status', 'dismissed')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const userId = body.user_id || await getDefaultUserId()
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'no user found' }, { status: 400 })
    }

    const hour = new Date().getHours()
    const patrolTime = hour < 10 ? '早安巡逻' : hour < 14 ? '午间巡逻' : hour < 18 ? '放学巡逻' : '晚间巡逻'
    console.log(`根开始${patrolTime}:`, new Date().toISOString())

    // 归档昨天热点
    await archiveOldHotspots(userId)

    // 获取家庭快照
    const snapshot = await getFamilySnapshot(userId)
    const primaryPlace = snapshot.places?.find((p: any) => p.is_primary) || snapshot.places?.[0]
    const location = primaryPlace?.city || primaryPlace?.name || 'Chiang Mai Thailand'

    // Grok 和 Gemini 并行调用
    const [grokData, geminiData] = await Promise.all([
      callGrok(snapshot, location),
      callGemini(snapshot, location),
    ])

    console.log('Grok数据长度:', grokData.length)
    console.log('Gemini数据长度:', geminiData.length)

    // Claude 整合
    const hotspots = await callClaude(grokData, geminiData, snapshot, location)
    console.log(`Claude生成${hotspots.length}条热点`)

    // 保存
    const saved = await saveHotspots(hotspots, userId)
    console.log(`根${patrolTime}完成，写入${saved}条热点`)

    return NextResponse.json({
      ok: true,
      patrol_time: patrolTime,
      grok_length: grokData.length,
      gemini_length: geminiData.length,
      generated: hotspots.length,
      saved,
    })

  } catch (e: any) {
    console.error('巡逻错误:', e?.message)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}

export async function GET() {
  const userId = await getDefaultUserId()
  if (!userId) return NextResponse.json({ error: 'no user' }, { status: 400 })

  const today = new Date().toISOString().split('T')[0]

  const { data: hotspots } = await supabase
    .from('hotspot_items')
    .select('id, title, urgency, category, created_at, status')
    .eq('user_id', userId)
    .neq('status', 'dismissed')
    .gte('created_at', `${today}T00:00:00`)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({
    unread_hotspots: hotspots?.filter(h => h.status === 'unread') || [],
    unread_count: hotspots?.filter(h => h.status === 'unread').length || 0,
    total_today: hotspots?.length || 0,
  })
}
