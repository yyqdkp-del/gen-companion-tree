export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { waitUntil } from '@vercel/functions'
import { getUserLocation } from '@/lib/geofence'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { getTodayStrInTimeZone } from '@/lib/date/localDate'
import { isValidHotspotUrl } from '@/lib/hotspot/url'

function normalizePatrolSourceUrl(item: Record<string, unknown>): string {
  const raw = String(item.source_url || (item.action_data as { url?: string } | undefined)?.url || '').trim()
  return isValidHotspotUrl(raw) ? raw : ''
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

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

async function fetchFamilyContextForHotspots(userId: string, locationCityFallback: string) {
  const { data: profile } = await supabase
    .from('family_profile')
    .select('visa_type, member_nationality, resident_city, resident_city_custom')
    .eq('user_id', userId)
    .maybeSingle()

  const { data: kids } = await supabase
    .from('children')
    .select('name, grade, school_name, languages, passport_expiry, nationality')
    .eq('user_id', userId)
    .limit(3)

  const residentDisplay =
    profile?.resident_city === 'other' && profile?.resident_city_custom?.trim()
      ? profile.resident_city_custom.trim()
      : (profile?.resident_city || locationCityFallback)

  const firstLangs = kids?.[0]?.languages as unknown
  const langLine = Array.isArray(firstLangs) && firstLangs.length
    ? firstLangs.join('、')
    : '中文/英文'

  const kidsLine =
    kids?.length
      ? kids
        .map((k: any) => `${k.name}(${k.grade || ''}，就读${k.school_name || '国际学校'})`)
        .join('、')
      : '有孩子'

  const passportLine = kids?.some(k => k.passport_expiry)
    ? `\n- 护照到期提醒：${kids!.filter(k => k.passport_expiry).map(k => `${k.name}护照${k.passport_expiry}`).join('、')}`
    : ''

  return `
家庭背景：
- 居住城市：${residentDisplay}
- 签证类型：${profile?.visa_type || '未知'}
- 家长国籍：${profile?.member_nationality || '华人'}
- 孩子：${kidsLine}
- 孩子语言：${langLine}${passportLine}
`.trim()
}

// ── Grok 实时快数据 ──
async function callGrok(snapshot: any, location: string, patrolPrompt?: string): Promise<string> {
  const child = snapshot.children?.[0]
  const topInterests = snapshot.interests?.map((i: any) => i.topic).slice(0, 5).join('、') || ''
  const frequentPlaces = snapshot.places
    ?.filter((p: any) => ['weekly', 'daily'].includes(p.visit_frequency))
    ?.map((p: any) => p.name).slice(0, 5).join('、') || ''
  const hour = new Date().getHours()
  const timeCtx = hour < 10 ? '早上出门前' : hour < 14 ? '午间' : hour < 17 ? '放学前' : '晚间'

  // 用地理围栏的本地搜索提示，没有则用默认
  const searchPrompt = patrolPrompt || `${location}今日本地情况：天气AQI、突发事件、汇率、路况、活动`

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
2. ${location}过去6小时突发事件（封路/火灾/示威/事故）
3. 当地主要货币兑人民币今日汇率+近7日走势
4. ${child?.school_name || location + '国际学校'}周边今日路况
5. ${frequentPlaces ? `${frequentPlaces}近期活动/特卖预告` : location + '当地商场近期活动'}
${topInterests ? `6. 关注话题最新动态：${topInterests}` : ''}
搜索重点：${searchPrompt}
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
async function callGemini(snapshot: any, location: string, officialSites: string[] = []): Promise<string> {
  const child = snapshot.children?.[0]
  const sitesText = officialSites.length
    ? `\n参考官方网站：${officialSites.join('、')}`
    : ''

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `用Google Search搜索${location}本地信息：\n1. ${location}本地官方媒体今日停水停电行政通知\n2. 当地移民局官网近期签证政策变化\n3. ${location}近30天新开亲子餐厅或活动场所（Google Maps 4星以上）\n4. ${location}登革热/流感等健康疾病官方最新数据\n5. ${child?.school_name || location + '国际学校'}官方近期公告\n6. 当地政府官网近期影响外籍家庭的政策${sitesText}\n每条必须注明来源网址和可信度（官方/社交/用户），用中文输出。无真实信息不输出。`
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

function buildPatrolSystem(familyContext: string): string {
  return `你是海外华人家庭的私人安全秘书，专门过滤对妈妈真正重要的信息。

## 必须推送（高价值）
1. 签证/居留政策突变（ED签、MM2H、PR等）
2. 儿童传染病社区爆发（手足口、登革热、麻疹）
3. 学校停课/教育局紧急通知
4. 极端天气影响接送（暴雪停校、PM2.5>150）
5. 治安突发事件（学区周边）
6. 升学关键节点（报名截止、抽签结果）
7. 财税政策变动（印花税、外籍购房限制）

## 可推送（中价值，需有实质影响）
8. 学费缴费季汇率创6个月新低
9. 华人妈妈实测高分亲子活动（非商业）
10. 新开高品质华人生活配套（中超/中医诊所）

## 严禁推送（无差异化价值）
- 普通天气（晴天/小雨/正常气温）
- 日常交通路况
- 日常汇率波动（非缴费季）
- 普通餐厅开业
- 任何可以用Google Maps/天气App替代的信息

## 标题格式（三段式）
【类别】核心事件｜影响：对华人家庭的具体影响｜建议：立刻可做的一件事

示例：
【签证预警】泰国ED签严查挂靠学校｜影响：出入境可能被盘问｜建议：准备最近3个月出勤证明
【健康预警】清迈登革热病例本周上升30%｜影响：蚊虫活跃期｜建议：检查孩子疫苗，备驱蚊液
【停课预警】多伦多教育局明晨校车取消概率80%｜影响：明天需要自行接送｜建议：提前确认学校是否开放

## 个性化要求
${familyContext}

## 输出要求
JSON数组，最多6条，每条包含：
- title: 三段式标题
- summary: 50字内的具体影响说明
- urgency: urgent/important/lifestyle
- action: 妈妈可以立刻做的一件事
- source_url: 必须是真实可访问的 https 链接；不确定则填空字符串 ""，禁止编造或占位假链接`
}

// ── Claude 整合润色 ──
async function callClaude(
  grokData: string,
  geminiData: string,
  snapshot: any,
  location: string,
  familyContext: string,
): Promise<any[]> {
  const children = snapshot.children?.map((c: any) => `${c.name}(${c.school_name})`).join('、') || '孩子'
  const patrolSystem = buildPatrolSystem(familyContext)

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
          content: `${patrolSystem}

服务地区：${location}
孩子：${children}
关注兴趣：${snapshot.interests?.map((i: any) => i.topic).slice(0, 5).join('、') || '无'}

Grok实时数据：
${grokData || '（无数据）'}

Gemini本地数据：
${geminiData || '（无数据）'}

严格只返回JSON数组，不加任何其他文字，最多6条：
[{
  "title": "【类别】核心事件｜影响：XXX｜建议：XXX",
  "category": "safety|education|visa|finance|health|shopping|mom|weather",
  "urgency": "urgent|important|lifestyle",
  "summary": "50字内具体影响说明",
  "action": "妈妈可以立刻做的一件事",
  "source_url": "https://官方或新闻原文链接，不确定则填 \"\"",
  "relevance_reason": "与这个家庭的具体关联（可选）",
  "action_available": false,
  "action_type": null,
  "action_data": {},
  "expires_hours": 6
}]`
        }]
      }),
    })
    const data = await res.json()
    const raw = data.content?.[0]?.text || '[]'
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const match = cleaned.match(/\[[\s\S]*\]/)
    const parsed = match ? JSON.parse(match[0]) : []
    if (!Array.isArray(parsed)) return []
    return parsed.slice(0, 6).map((item: Record<string, unknown>) => {
      const source_url = normalizePatrolSourceUrl(item)
      const action_data = (item.action_data && typeof item.action_data === 'object')
        ? { ...(item.action_data as Record<string, unknown>) }
        : {}
      if (source_url) action_data.url = source_url
      else delete action_data.url
      return { ...item, source_url, action_data }
    })
  } catch (e: any) {
    console.error('Claude整合失败:', e?.message)
    return []
  }
}

// ── 保存热点（按天去重）──
async function saveHotspots(
  items: any[],
  userId: string,
  todayYmd: string,
): Promise<{ ok: boolean; count: number }> {
  if (!items.length) return { ok: true, count: 0 }

  // 今天已有的 category
  const { data: existing } = await supabase
    .from('hotspot_items')
    .select('category')
    .eq('user_id', userId)
    .gte('created_at', `${todayYmd}T00:00:00`)
    .neq('status', 'dismissed')

  const existingCategories = new Set(existing?.map((e: any) => e.category) || [])

  // 过滤掉今天已有同 category 的，urgent 除外（urgent 可以重复写入）
  const toInsert = items.filter(item =>
    item.urgency === 'urgent' || !existingCategories.has(item.category)
  )

  if (!toInsert.length) return { ok: true, count: 0 }

  const { error } = await supabase.from('hotspot_items').insert(
    toInsert.map(item => {
      const source_url = normalizePatrolSourceUrl(item)
      const action_data = (item.action_data && typeof item.action_data === 'object')
        ? { ...(item.action_data as Record<string, unknown>) }
        : {}
      if (source_url) action_data.url = source_url
      else delete action_data.url
      return {
        user_id: userId,
        category: item.category || 'lifestyle',
        urgency: item.urgency || 'lifestyle',
        title: item.title,
        summary: item.summary,
        action: item.action || null,
        source_url: source_url || null,
        relevance_reason: item.relevance_reason,
        action_available: item.action_available || false,
        action_type: item.action_type || null,
        action_data,
        status: 'unread',
        expires_at: new Date(Date.now() + (item.expires_hours || 24) * 3600000).toISOString(),
      }
    })
  )

  if (error) {
    console.error('saveHotspots failed:', error)
    return { ok: false, count: 0 }
  }
  return { ok: true, count: toInsert.length }
}

// ── 归档：仅处理已过期且带 expires_at 的热点（与客户端按 expires_at 过滤一致）──
async function archiveOldHotspots(userId: string) {
  const nowIso = new Date().toISOString()
  await supabase
    .from('hotspot_items')
    .update({ status: 'dismissed' })
    .eq('user_id', userId)
    .lt('expires_at', nowIso)
    .not('expires_at', 'is', null)
    .neq('status', 'dismissed')
}

async function resolveProfileCity(userId: string): Promise<string | null> {
  const { data: profile } = await supabase
    .from('family_profile')
    .select('resident_city, resident_city_custom')
    .eq('user_id', userId)
    .maybeSingle()

  const raw =
    profile?.resident_city === 'other'
      ? profile?.resident_city_custom
      : profile?.resident_city

  const trimmed = typeof raw === 'string' ? raw.trim() : ''
  return trimmed || null
}

// ── POST：立即 202，后台跑巡逻（waitUntil 保证 Vercel 上任务继续执行）──
async function runPatrolForUsers(userIds: string[], _patrolTime: string) {
  const results: Array<Record<string, unknown>> = []

  for (const userId of userIds) {
    try {
      const userLocation = await getUserLocation(userId)
      const profileCity = await resolveProfileCity(userId)

      if (!userLocation && !profileCity) {
        console.warn(`patrol: skip user ${userId.slice(0, 8)} (no resident city)`)
        results.push({ userId: userId.slice(0, 8), skipped: 'no_resident_city' })
        continue
      }

      const location = profileCity
        ? profileCity
        : `${userLocation!.city} ${userLocation!.country}`
      const todayYmd = userLocation
        ? getTodayStrInTimeZone(userLocation.timezone)
        : getTodayStrInTimeZone('UTC')
      const patrolPrompt = userLocation?.local_config.patrol_prompt || ''

      await archiveOldHotspots(userId)
      const snapshot = await getFamilySnapshot(userId)

      const [grokData, geminiData, familyContext] = await Promise.all([
        callGrok(snapshot, location, patrolPrompt),
        callGemini(snapshot, location, userLocation?.local_config.official_sites || []),
        fetchFamilyContextForHotspots(userId, profileCity || userLocation?.city || ''),
      ])

      const hotspots = await callClaude(grokData, geminiData, snapshot, location, familyContext)
      const saved = await saveHotspots(hotspots, userId, todayYmd)
      if (!saved.ok) {
        console.error('hotspots not saved for user:', userId)
      }

      await supabase
        .from('family_profile')
        .update({ updated_at: new Date().toISOString() })
        .eq('user_id', userId)

      results.push({
        userId: userId.slice(0, 8),
        location,
        generated: hotspots.length,
        saved: saved.count,
      })
    } catch (e: any) {
      console.error(`用户${userId.slice(0, 8)}巡逻失败:`, e?.message)
      results.push({ userId: userId.slice(0, 8), error: e?.message })
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const hour = new Date().getHours()
    const patrolTime = hour < 10 ? '早安巡逻' : hour < 14 ? '午间巡逻' : hour < 18 ? '放学巡逻' : '晚间巡逻'

    const { user, error: authError } = await getAuthUser(req)
    const cronSecret = process.env.CRON_SECRET
    const cronOk = Boolean(cronSecret && req.headers.get('authorization') === `Bearer ${cronSecret}`)

    let userIds: string[] = []
    if (user && !authError) {
      userIds = [user.id]
    } else if (cronOk) {
      if (body.user_id) userIds = [body.user_id]
      else {
        const { data } = await supabase.auth.admin.listUsers({ perPage: 100 })
        userIds = data?.users?.map((u: { id: string }) => u.id) || []
      }
    } else {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (!userIds.length) {
      return NextResponse.json({ ok: false, error: 'no users found' }, { status: 400 })
    }

    waitUntil(
      runPatrolForUsers(userIds, patrolTime).catch((err: unknown) => {
        console.error('巡逻批次未捕获错误:', err)
      }),
    )

    return NextResponse.json(
      {
        ok: true,
        message: '巡逻中',
        patrol_time: patrolTime,
        users: userIds.length,
      },
      { status: 202 },
    )
  } catch (e: any) {
    console.error('巡逻错误:', e?.message)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}
export async function GET(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = user.id

  const userLocation = await getUserLocation(userId)
  const today = getTodayStrInTimeZone(userLocation?.timezone || 'UTC')

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
