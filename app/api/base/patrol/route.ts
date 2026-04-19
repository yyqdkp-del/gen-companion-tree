export const dynamic = 'force-dynamic'
// app/api/base/patrol/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const familyId = 'default'

// 获取默认用户ID（你自己的账号）
async function getDefaultUserId(): Promise<string | null> {
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1 })
  return data?.users?.[0]?.id || null
}

async function getFamilySnapshot(userId: string) {
  const today = new Date().toISOString().split('T')[0]
  const in7days = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

  const [
    { data: profile },
    { data: children },
    { data: places },
    { data: habits },
    { data: interests },
    { data: todayEvents },
    { data: urgentTodos },
    { data: childLog },
  ] = await Promise.all([
    supabase.from('family_profile').select('*').eq('user_id', userId).limit(1).single(),
    supabase.from('children').select('*').eq('user_id', userId).limit(5),
    supabase.from('family_places').select('*').eq('user_id', userId).limit(20),
    supabase.from('family_habits').select('*').eq('user_id', userId).limit(20),
    supabase.from('interest_weights')
      .select('topic, weight')
      .eq('user_id', userId)
      .gte('weight', 20)
      .order('weight', { ascending: false })
      .limit(10),
    supabase.from('child_school_calendar')
      .select('title, date_start, requires_action, requires_items')
      .eq('user_id', userId)
      .gte('date_start', today)
      .lte('date_start', in7days),
    supabase.from('todo_items')
      .select('title, priority, category, due_date')
      .eq('user_id', userId)
      .in('priority', ['red', 'orange'])
      .neq('status', 'done')
      .limit(10),
    supabase.from('child_daily_log')
      .select('health_status, mood_status, health_notes')
      .eq('user_id', userId)
      .eq('date', today)
      .limit(1)
      .single(),
  ])

  return { profile, children, places, habits, interests, todayEvents, urgentTodos, childLog }
}

function buildPatrolInstruction(snap: any): string {
  const { children, places, interests, todayEvents, urgentTodos, childLog, habits } = snap
  const child = children?.[0]
  const hour = new Date().getHours()
  const timeCtx = hour < 10 ? '早上出门前' : hour < 14 ? '午间' : hour < 17 ? '放学前' : '晚间'

  const frequentPlaces = (places || [])
    .filter((p: any) => ['weekly', 'daily'].includes(p.visit_frequency))
    .map((p: any) => p.name).slice(0, 5).join('、')

  const topInterests = (interests || []).slice(0, 5).map((i: any) => i.topic).join('、')
  const todayEventTitles = (todayEvents || []).map((e: any) => e.title).join('、')
  const urgentTitles = (urgentTodos || []).map((t: any) => `${t.title}(截止${t.due_date || '尽快'})`).join('、')
  const habitNotes = (habits || []).filter((h: any) => h.notes).map((h: any) => h.notes).slice(0, 3).join('、')

  return `现在是清迈${timeCtx}，请搜索以下所有内容：

【必查·每次都要】
1. 清迈今日天气+明日预报（含降雨概率）
2. 清迈空气质量AQI
3. ${child?.school_name || '清迈国际学校'}周边路况
4. 清迈今日突发事件（封路/示威/灾害）

【孩子相关】
孩子：${child?.name || '孩子'}，${child?.school_name || '国际学校'}，${child?.grade || ''}
今日事件：${todayEventTitles || '无'}
${todayEventTitles ? `请搜索：${todayEventTitles}的相关地点天气/路况/注意事项` : ''}
${childLog?.health_status === 'sick' ? `孩子生病中，搜索：清迈儿科今日排队、附近24小时药房` : ''}

【紧急待办相关】
${urgentTitles ? `即将截止的事项：${urgentTitles}，搜索相关机构最新信息` : '无紧急待办'}

【妈妈热点·闺蜜级别】
常去地点：${frequentPlaces || 'Central World、Emquartier'}
1. 上述商场今日特卖/新开店/活动
2. 清迈适合家庭的新餐厅（本周评价好的）
3. 泰铢兑人民币今日汇率+近7日走势
4. 清迈儿童活动/优惠（适合${child?.name || '孩子'}）
5. 清迈外籍妈妈圈近期热门话题
${topInterests ? `6. 妈妈特别关注：${topInterests}，最新动态` : ''}
${habitNotes ? `7. 根据家庭习惯关注：${habitNotes}` : ''}

【输出要求】
严格只返回JSON数组：
[{
  "title": "简短标题",
  "category": "safety|education|visa|finance|health|shopping|mom|weather",
  "urgency": "urgent|important|lifestyle",
  "summary": "根发现...（闺蜜语气，2-3句，具体有用）",
  "relevance_reason": "和你有关：...（具体说明）",
  "action_available": true/false,
  "action_type": "navigate|add_todo|calendar|buy|null",
  "action_label": "按钮文字",
  "expires_hours": 6|12|24|72
}]

规则：
- summary必须用"根发现"/"根帮你查了"/"根注意到"开头
- 每条说清楚和这个家庭的具体关联
- 无用信息不输出
- 最多8条，按紧急度排序`
}

async function grokPatrol(instruction: string): Promise<any[]> {
  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
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
            content: '你是根，清迈陪读家庭最了解他们的AI伙伴。用闺蜜语气，说真正有用的信息。严格只返回JSON数组。'
          },
          { role: 'user', content: instruction }
        ],
      }),
    })

    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content || '[]'
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const match = cleaned.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []

  } catch (e: any) {
    console.error('Grok巡逻失败:', e?.message)
    return []
  }
}

async function saveHotspots(items: any[], jobId: string, userId: string): Promise<number> {
  if (!items.length) return 0

  await supabase
    .from('hotspot_items')
    .update({ status: 'dismissed' })
    .eq('user_id', userId)
    .eq('urgency', 'lifestyle')
    .lt('created_at', new Date(Date.now() - 24 * 3600000).toISOString())

  const { error } = await supabase.from('hotspot_items').insert(
    items.map(item => ({
      user_id: userId,
      family_id: familyId,
      patrol_job_id: jobId,
      category: item.category || 'lifestyle',
      urgency: item.urgency || 'lifestyle',
      title: item.title,
      summary: item.summary,
      relevance_reason: item.relevance_reason,
      action_available: item.action_available || false,
      action_type: item.action_type || null,
      action_data: { action_label: item.action_label },
      status: 'unread',
      expires_at: new Date(
        Date.now() + (item.expires_hours || 24) * 3600000
      ).toISOString(),
    }))
  )

  if (error) console.error('热点写入失败:', error)
  return items.length
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const triggerType = body.trigger_type || 'manual'
    const hour = new Date().getHours()
    const patrolTime = hour < 10 ? '早安巡逻' : hour < 14 ? '午间巡逻' : hour < 18 ? '放学巡逻' : '晚间巡逻'

    console.log(`根开始${patrolTime}:`, new Date().toISOString())

    // 获取用户ID
    const userId = body.user_id || await getDefaultUserId()
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'no user found' }, { status: 400 })
    }

    const { data: job } = await supabase.from('patrol_jobs').insert({
      user_id: userId,
      family_id: familyId,
      trigger_type: triggerType,
      status: 'running',
    }).select().single()

    const jobId = job?.id || 'unknown'

    const snapshot = await getFamilySnapshot(userId)
    const instruction = buildPatrolInstruction(snapshot)
    const hotspots = await grokPatrol(instruction)
    console.log(`Grok返回${hotspots.length}条`)

    const saved = await saveHotspots(hotspots, jobId, userId)

    await supabase.from('patrol_jobs').update({
      status: 'done',
      results_count: saved,
      completed_at: new Date().toISOString(),
    }).eq('id', jobId)

    console.log(`根${patrolTime}完成，写入${saved}条热点`)

    return NextResponse.json({ ok: true, patrol_time: patrolTime, found: hotspots.length, saved })

  } catch (e: any) {
    console.error('巡逻错误:', e?.message)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}

export async function GET() {
  const userId = await getDefaultUserId()
  if (!userId) return NextResponse.json({ error: 'no user' }, { status: 400 })

  const [{ data: jobs }, { data: hotspots }] = await Promise.all([
    supabase.from('patrol_jobs').select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(5),
    supabase.from('hotspot_items').select('id, title, urgency, category, created_at')
      .eq('user_id', userId).eq('status', 'unread')
      .order('created_at', { ascending: false }).limit(10),
  ])

  return NextResponse.json({
    recent_jobs: jobs || [],
    unread_hotspots: hotspots || [],
    unread_count: hotspots?.length || 0,
  })
}
