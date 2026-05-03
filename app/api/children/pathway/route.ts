export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { waitUntil } from '@vercel/functions'

// ── 年级到申请倒计时计算 ──
function gradeToApplyYear(grade: string, path: string): number {
  const gradeMap: Record<string, number> = {
    'K1': 1, 'K2': 2, 'K3': 3,
    'G1': 4, 'G2': 5, 'G3': 6, 'G4': 7, 'G5': 8,
    'G6': 9, 'G7': 10, 'G8': 11, 'G9': 12, 'G10': 13,
    'G11': 14, 'G12': 15,
  }
  const currentGradeNum = gradeMap[grade] || 3

  // 申请年级
  const applyGradeMap: Record<string, number> = {
    'us_boarding': 9,     // G9申请
    'uk_school': 6,       // G6 11+（或更早）
    'us_university': 12,  // G12申请
    'uk_university': 12,  // G12申请
    'flexible': 9,
    'other': 12,
  }
  const applyGradeNum = gradeMap[`G${applyGradeMap[path] || 9}`] || 9
  return Math.max(0, applyGradeNum - currentGradeNum)
}

// ── 路线图节点定义（全球通用，不写死城市）──
function buildRoadmapTemplate(grade: string, path: string, currentYear: number): any[] {
  const gradeMap: Record<string, number> = {
    'K1': 1, 'K2': 2, 'K3': 3,
    'G1': 4, 'G2': 5, 'G3': 6, 'G4': 7, 'G5': 8,
    'G6': 9, 'G7': 10, 'G8': 11, 'G9': 12,
    'G10': 13, 'G11': 14, 'G12': 15,
  }
  const gradeNum = gradeMap[grade] || 3

  const nodes: any[] = []

  if (path === 'us_boarding') {
    if (gradeNum <= 3) nodes.push({
      id: 'spike_discovery',
      grade_target: 'G1',
      year_target: currentYear + (4 - gradeNum),
      title: '确立Spike方向',
      urgency: 'high',
      description: '申请时需要3-5年连续记录，现在是最后的窗口期',
      conditions: [
        { id: 'try_3_activities', text: '尝试过至少3类不同课外活动', type: 'activities_count', threshold: 3 },
        { id: 'consistent_1', text: '有一项活动坚持超过3个月', type: 'activity_duration', threshold: 3 },
        { id: 'found_passion', text: '发现让孩子眼睛发光的方向', type: 'manual' },
      ],
    })
    if (gradeNum <= 6) nodes.push({
      id: 'core_record',
      grade_target: 'G3',
      year_target: currentYear + (6 - gradeNum),
      title: '建立核心活动记录',
      urgency: 'high',
      description: '申请需要展示持续投入，不是临时抱佛脚',
      conditions: [
        { id: 'main_spike', text: '确定1个核心Spike方向', type: 'activities_count', threshold: 1 },
        { id: 'spike_1year', text: '核心活动参与超过1年', type: 'activity_duration', threshold: 12 },
        { id: 'first_achievement', text: '获得第一个相关领域成就', type: 'achievements_count', threshold: 1 },
      ],
    })
    if (gradeNum <= 8) nodes.push({
      id: 'language_test',
      grade_target: 'G5',
      year_target: currentYear + (8 - gradeNum),
      title: '语言成绩达标',
      urgency: 'medium',
      description: '美高要求TOEFL 100+，需要提前备考',
      conditions: [
        { id: 'english_level', text: '英语达到学术写作水平', type: 'manual' },
        { id: 'toefl_ready', text: 'TOEFL备考开始', type: 'manual' },
        { id: 'chinese_maintained', text: '中文保持母语水平', type: 'manual' },
      ],
    })
    if (gradeNum <= 9) nodes.push({
      id: 'ssat_prep',
      grade_target: 'G6',
      year_target: currentYear + (9 - gradeNum),
      title: 'SSAT备考开始',
      urgency: 'high',
      description: '顶尖美高要求SSAT 85-90百分位，至少备考2年',
      conditions: [
        { id: 'ssat_start', text: 'SSAT备考课程开始', type: 'manual' },
        { id: 'mock_test', text: '完成第一次模拟测试', type: 'manual' },
        { id: 'target_score', text: '设定目标分数线', type: 'manual' },
      ],
    })
    if (gradeNum <= 10) nodes.push({
      id: 'summer_program',
      grade_target: 'G7',
      year_target: currentYear + (10 - gradeNum),
      title: '国际夏校/竞赛布局',
      urgency: 'medium',
      description: '美高申请者中参加过夏校的录取率显著更高',
      conditions: [
        { id: 'summer_applied', text: '申请至少1个学术夏校项目', type: 'manual' },
        { id: 'competition_1', text: '参加至少1个学科竞赛', type: 'achievements_count', threshold: 1 },
        { id: 'leadership_role', text: '在某活动中担任领导职务', type: 'manual' },
      ],
    })
    nodes.push({
      id: 'application',
      grade_target: 'G9',
      year_target: currentYear + (12 - gradeNum),
      title: '美高申请',
      urgency: gradeNum >= 8 ? 'critical' : 'low',
      description: '截止日期通常为1月15日，提前准备材料',
      conditions: [
        { id: 'school_list', text: '确定申请学校名单（8-12所）', type: 'manual' },
        { id: 'ssat_score', text: 'SSAT正式成绩达目标分', type: 'manual' },
        { id: 'recommendation', text: '推荐信老师确认', type: 'manual' },
        { id: 'essay_done', text: '申请文书完成', type: 'essay_count', threshold: 1 },
        { id: 'interview_prep', text: '面试准备完成', type: 'manual' },
      ],
    })
  }

  if (path === 'uk_school') {
    if (gradeNum <= 5) nodes.push({
      id: 'eton_register',
      grade_target: 'K5',
      year_target: currentYear + (5 - gradeNum),
      title: '顶级英校注册报名',
      urgency: 'critical',
      description: 'Eton/Winchester等需Year 5前注册，错过无法弥补',
      conditions: [
        { id: 'school_research', text: '确定目标英国学校', type: 'manual' },
        { id: 'registered', text: '完成注册（Eton截止Year5）', type: 'manual' },
        { id: 'ce_understand', text: '了解CE考试要求', type: 'manual' },
      ],
    })
    if (gradeNum <= 7) nodes.push({
      id: 'ce_prep',
      grade_target: 'G3',
      year_target: currentYear + (6 - gradeNum),
      title: 'Common Entrance备考',
      urgency: 'high',
      description: 'CE考试是13+入学核心，数学/英语/科学需达标',
      conditions: [
        { id: 'ce_tutor', text: 'CE专项辅导开始', type: 'manual' },
        { id: 'mock_ce', text: '完成CE模拟题', type: 'manual' },
        { id: 'subject_gaps', text: '找到薄弱科目并针对性补强', type: 'manual' },
      ],
    })
    nodes.push({
      id: 'uk_application',
      grade_target: 'G5',
      year_target: currentYear + (8 - gradeNum),
      title: '英校正式申请',
      urgency: gradeNum >= 7 ? 'critical' : 'medium',
      description: '英国13+申请通常提前1-2年，面试是关键',
      conditions: [
        { id: 'uk_essay', text: '个人陈述完成', type: 'essay_count', threshold: 1 },
        { id: 'uk_interview', text: '面试准备完成', type: 'manual' },
        { id: 'ce_score', text: 'CE成绩达标', type: 'manual' },
      ],
    })
  }

  if (path === 'us_university' || path === 'other') {
    if (gradeNum <= 9) nodes.push({
      id: 'spike_deep',
      grade_target: 'G6',
      year_target: currentYear + (9 - gradeNum),
      title: '深化核心特长',
      urgency: 'high',
      description: 'T50大学申请需要有世界级深度的Spike，不是广度',
      conditions: [
        { id: 'spike_confirm', text: '确定申请核心特长方向', type: 'manual' },
        { id: 'spike_3year', text: '核心特长持续3年以上', type: 'activity_duration', threshold: 36 },
        { id: 'national_level', text: '获得至少1个国家级成就', type: 'achievements_count', threshold: 1 },
      ],
    })
    if (gradeNum <= 11) nodes.push({
      id: 'sat_prep',
      grade_target: 'G9',
      year_target: currentYear + (12 - gradeNum),
      title: 'SAT/ACT备考',
      urgency: 'high',
      description: 'MIT/Stanford等要求SAT 1550+，需要系统备考',
      conditions: [
        { id: 'sat_start', text: 'SAT备考课程开始', type: 'manual' },
        { id: 'sat_mock', text: '模拟测试分数达1400+', type: 'manual' },
        { id: 'sat_target', text: '设定并锁定目标1550+', type: 'manual' },
      ],
    })
    nodes.push({
      id: 'us_uni_application',
      grade_target: 'G12',
      year_target: currentYear + (15 - gradeNum),
      title: '美本申请',
      urgency: gradeNum >= 11 ? 'critical' : 'low',
      description: 'EA/ED截止11月1日，RD截止1月1日',
      conditions: [
        { id: 'college_list', text: '确定申请名单（12-15所）', type: 'manual' },
        { id: 'sat_final', text: 'SAT正式成绩1550+', type: 'manual' },
        { id: 'common_app', text: 'Common App主文书完成', type: 'essay_count', threshold: 1 },
        { id: 'supplemental', text: '补充文书全部完成', type: 'manual' },
        { id: 'rec_letters', text: '推荐信全部提交', type: 'manual' },
      ],
    })
  }

  if (path === 'flexible') {
    // 多路并进：取美高+英校的关键节点
    return buildRoadmapTemplate(grade, 'us_boarding', currentYear)
      .concat(buildRoadmapTemplate(grade, 'uk_school', currentYear))
      .filter((n: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === n.id) === i)
  }

  return nodes
}

// ── 计算节点完成度 ──
function calculateCompletion(node: any, data: {
  activities: any[], achievements: any[], essays: any[]
}): number {
  const { conditions } = node
  if (!conditions?.length) return 0

  let completed = 0
  for (const cond of conditions) {
    if (cond.type === 'activities_count') {
      if (data.activities.length >= (cond.threshold || 1)) completed++
    } else if (cond.type === 'activity_duration') {
      const longEnough = data.activities.some((a: any) => {
        const months = Math.round(
          (Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30)
        )
        return months >= (cond.threshold || 3)
      })
      if (longEnough) completed++
    } else if (cond.type === 'achievements_count') {
      if (data.achievements.length >= (cond.threshold || 1)) completed++
    } else if (cond.type === 'essay_count') {
      if (data.essays.length >= (cond.threshold || 1)) completed++
    }
    // manual类型由用户手动勾选，默认0
  }
  return Math.round((completed / conditions.length) * 100)
}

async function generateAndSave(body: any, authHeader: string) {
  const { child, activities, achievements, essays, assessment, vision, childId, geofence } = body

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  const uid = user?.id || null

  const currentYear = new Date().getFullYear()
  const grade = child?.grade || 'K3'
  const path = vision?.target_school_type || 'us_boarding'

  // 构建路线图节点模板
  const roadmapNodes = buildRoadmapTemplate(grade, path, currentYear)

  // 计算每个节点的完成度
  const nodesWithCompletion = roadmapNodes.map((node: any) => ({
    ...node,
    completion: calculateCompletion(node, {
      activities: activities || [],
      achievements: achievements || [],
      essays: essays || [],
    }),
  }))

  // 找到当前最紧的节点
  const urgentNode = nodesWithCompletion.find((n: any) =>
    n.urgency === 'critical' || n.urgency === 'high'
  )

  // 地理围栏资源上下文
  const locationCtx = geofence?.city
    ? `孩子所在城市：${geofence.city}（${geofence.country}）。所有本地资源建议必须结合${geofence.city}真实可用的机构和活动，不要泛泛而谈。`
    : '孩子所在城市：未知。给出国际通用建议，并说明如何在当地寻找类似资源。'

  const yearsToApply = gradeToApplyYear(grade, path)

  const prompt = `你是一位顶尖的国际升学规划顾问，服务过数百个海外华人家庭，帮助孩子成功申请美高、英国顶尖独立学校和欧美T50大学。你同时是这位妈妈最信任的朋友，说话直接、温暖、专业。

【孩子信息】
姓名：${child?.name || '孩子'}
当前年级：${grade}
就读学校：${child?.school_name || child?.school || '国际学校'}
家庭语言：${(child?.languages || []).join('、') || '未知'}
距申请还有：约${yearsToApply}年

【妈妈的愿景】
孩子未来成为：${vision?.vision_statement || '未设定'}
目标申请路径：${path}
核心期待：${(vision?.priorities || []).join('、') || '未设定'}
主要担忧：${(vision?.concerns || []).join('、') || '未设定'}

【当前活动档案】
课外活动数量：${activities?.length || 0}个
${activities?.length ? activities.map((a: any) => `- ${a.name}（${a.category}，参与约${Math.round((Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))}个月）`).join('\n') : '暂无记录'}

【荣誉奖项】
${achievements?.length ? achievements.map((a: any) => `- ${a.title}（${a.level}级别，${a.category}类，${a.date}）`).join('\n') : '暂无记录'}

【中文水平】
${assessment ? JSON.stringify(assessment) : '暂无测评'}

【地理位置】
${locationCtx}

【系统已计算的路线图节点】
${JSON.stringify(nodesWithCompletion, null, 2)}

请以专业升学顾问的视角，生成以下内容。直接输出JSON对象，不加任何其他内容：

{
  "profile_scores": {
    "academic": 整数0到100,
    "spike_depth": 整数0到100,
    "leadership": 整数0到100,
    "language": 整数0到100,
    "community": 整数0到100,
    "diversity": 整数0到100
  },
  "profile_summary": "一句话精准描述孩子现在的申请画像，20字以内，要有洞见不要废话",
  "narrative": "这个孩子的申请故事主线。不是泛泛的描述，而是一个具体的故事弧线：他是谁、他的独特性在哪、如果一切顺利他会成为什么样的申请者。3到5句，感性有力，像顾问对妈妈说的话",
  "spike_options": [
    {
      "direction": "Spike方向名称",
      "rationale": "为什么适合这个孩子，结合他现有的特点",
      "pros": "优势",
      "cons": "挑战",
      "first_step": "本月可以开始的第一步行动"
    }
  ],
  "today_priority": {
    "action": "今天最重要的一件事，具体可执行",
    "reason": "为什么是现在最重要的，讲清楚时间窗口",
    "urgency": "high或medium"
  },
  "this_month": [
    {
      "action": "本月必须完成的行动，具体到可以当天执行",
      "why": "价值说明，不超过30字",
      "urgency": "high或medium",
      "local_resource": "当地可用的具体资源或机构类型"
    }
  ],
  "gaps": [
    "缺口描述，要带时间紧迫感，不超过40字"
  ],
  "risks": [
    "风险描述，要带具体后果，不超过40字"
  ],
  "key_insight": "顾问给妈妈说的一句最重要的话，可能是提醒、鼓励或者警告，50字以内，真诚直接"
}

要求：
- spike_options给2到3个方向
- this_month最多3条
- gaps最多3条
- risks最多2条
- 所有建议必须结合孩子实际情况，不能是通用套话
- local_resource不要写死城市名，描述资源类型即可`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        system: '你只输出合法的JSON对象，不加任何其他内容、注释或markdown代码块标记。所有数字字段必须是整数，不能是字符串。',
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const raw = data.content?.[0]?.text || ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) {
      console.error('no JSON in response', raw.slice(0, 300))
      return
    }

    const aiResult = JSON.parse(match[0])

    // 合并AI输出 + 系统计算的路线图
    const finalReport = {
      ...aiResult,
      roadmap_nodes: nodesWithCompletion,  // 系统计算，不依赖AI
      years_to_apply: yearsToApply,
      target_path: path,
      grade: grade,
    }

    const { error: insertError } = await supabase.from('pathway_reports').insert({
      child_id: childId,
      user_id: uid,
      profile_scores: finalReport.profile_scores,
      narrative: finalReport.narrative,
      gaps: finalReport.gaps,
      roadmap: finalReport.roadmap_nodes,
      this_semester: finalReport.this_month,
      // 扩展字段存入jsonb
      // 注意：以下字段需要在pathway_reports表中存在
    })

    if (insertError) {
      console.error('insert error', insertError)
      // 尝试用最小字段集重新插入
      await supabase.from('pathway_reports').insert({
  child_id: childId,
  user_id: uid,
  profile_scores: finalReport.profile_scores,
  narrative: finalReport.narrative,
  gaps: finalReport.gaps,
  roadmap: finalReport.roadmap_nodes,
  this_semester: finalReport.this_month,
  spike_options: finalReport.spike_options,
  today_priority: finalReport.today_priority,
  key_insight: finalReport.key_insight,
  years_to_apply: finalReport.years_to_apply,
  target_path: finalReport.target_path,
  grade: finalReport.grade,
})
    } else {
      console.log('pathway report saved', { childId, uid, nodes: nodesWithCompletion.length })
    }

  } catch (e: any) {
    console.error('generateAndSave error', e?.message || e)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const authHeader = req.headers.get('authorization') || ''

  if (!body.child || !body.vision) {
    return NextResponse.json({ error: '缺少必要数据' }, { status: 400 })
  }

  waitUntil(generateAndSave(body, authHeader))

  return NextResponse.json({ status: 'processing' })
}
