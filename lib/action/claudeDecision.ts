import type { FamilyContext, PreparedItem, RootAction, RootDecision } from '@/lib/action/rootBrain'
import { buildDimensionPrompt, detectDimension } from '@/lib/action/dimensionRequirements'
import {
  generateLocalPhrase,
  getLocalLanguage,
  searchNearby,
  searchRealtimeInfo,
} from '@/lib/intelligence/realtime'
import { AI_MODELS } from '@/lib/ai/models'
import { formatMemoryForClaude } from '@/lib/memory/familyMemory'
import { lookupAirlinePhone } from '@/lib/knowledge/base'
import { getEmergencyPhone } from '@/lib/trust/emergencyContacts'
import {
  normalizeSourceLevel,
  resolveItemDisclaimer,
  SOURCE_CONFIG,
} from '@/lib/trust/sourceLabel'

type ToolInput = Record<string, unknown>

type DecisionSession = {
  prepared: PreparedItem[]
  searchCache: Record<string, unknown>
}

const SERVICE_LABELS: Record<string, string> = {
  hospital: '附近医院',
  immigration: '移民局',
  school: '学校',
  shopping: '附近商店',
  airport: '机场',
  pharmacy: '药店',
}

function isEmergencyContext(context: FamilyContext, urgency?: unknown): boolean {
  return urgency === 'emergency'
    || context.child.healthStatus === 'emergency'
    || /急诊|emergency|急救/.test(context.todo.title)
}

function pushPrepared(session: DecisionSession, item: PreparedItem): void {
  const exists = session.prepared.some((p) => p.label === item.label && p.source === item.source)
  if (!exists) session.prepared.push(item)
}

export const INTELLIGENT_TOOLS = [
  {
    name: 'search_local_service',
    description: '搜索用户当前位置附近的本地服务（医院/移民局/商场等）',
    input_schema: {
      type: 'object',
      properties: {
        service_type: {
          type: 'string',
          enum: ['hospital', 'immigration', 'school', 'shopping', 'airport', 'pharmacy'],
        },
        keywords: { type: 'string' },
        urgency: { type: 'string', enum: ['emergency', 'normal'] },
      },
      required: ['service_type'],
    },
  },
  {
    name: 'search_policy',
    description: '搜索当地最新的政策信息（签证/学校规定等），由 Gemini Search 实时获取',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
      },
      required: ['query'],
    },
  },
  {
    name: 'generate_local_phrase',
    description: '用 Gemini 生成当地语言沟通话术',
    input_schema: {
      type: 'object',
      properties: {
        situation: { type: 'string' },
        target_language: { type: 'string' },
        key_points: { type: 'array', items: { type: 'string' } },
      },
      required: ['situation', 'target_language', 'key_points'],
    },
  },
  {
    name: 'present_to_mom',
    description: '向妈妈呈现最终分析和可执行动作（必须在最后一轮调用）',
    input_schema: {
      type: 'object',
      properties: {
        understand: { type: 'string' },
        insight: { type: 'string' },
        primary_action_label: { type: 'string' },
        done_message: { type: 'string' },
        urgency: { type: 'string', enum: ['critical', 'urgent', 'normal', 'low'] },
        emotion: { type: 'string' },
        reassurance: { type: 'string' },
        next_step: { type: 'string' },
        key_facts: { type: 'array', items: { type: 'string' } },
        actions: { type: 'array', items: { type: 'object' } },
        prepared: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['checklist', 'draft', 'phrase', 'info', 'comparison'],
              },
              label: { type: 'string' },
              content: {
                type: 'string',
                description: '必须填写实际内容，不能为空。checklist用换行分隔每项，draft是完整文本，phrase是话术文本',
              },
              copyable: { type: 'boolean' },
            },
            required: ['type', 'label', 'content'],
          },
        },
      },
      required: ['understand', 'insight', 'primary_action_label', 'done_message'],
    },
  },
]

function buildSystemPrompt(context: FamilyContext): string {
  const cityLabel = context.mom.city || context.mom.country || '当地'
  const detectedDimension = detectDimension(context.todo, context)
  const dimensionPrompt = buildDimensionPrompt(detectedDimension)

  return `你是「根」，专门帮助在${cityLabel}独自带娃的华人妈妈的智能决策助手。

${dimensionPrompt}

【通用规则】
- 电话/地址/机构信息必须来自工具搜索结果或 context.localInfo，不能编造
- 政策信息必须来自 search_policy（Gemini Search）结果
- 当地语言话术必须来自 generate_local_phrase（Gemini）
- 邮件/日历/提醒执行通过 present_to_mom 的 actions 里 executor 定义，前端经 MCP 执行
- 严格按上方【当前场景】框架执行，缺一不可

用户位置：${context.location.city} ${context.location.country}（来源：${context.location.source}）
识别场景：${detectedDimension}
时区：${context.mom.timezone}
MCP：Gmail=${context.mcp.gmail ? '已连接' : '未连接'}，Calendar=${context.mcp.calendar ? '已连接' : '未连接'}

工作流程：
1. 按场景要求调用 search_local_service / search_policy / generate_local_phrase
2. 在 present_to_mom 的 actions 中实现 set_reminder / add_calendar / send_email / navigate / call_phone
3. 最后必须调用 present_to_mom

executor 规范（actions 内每项）：
{
  "id": "唯一ID",
  "label": "按钮文案",
  "type": "primary|secondary",
  "requiresConfirm": true/false,
  "confirmMessage": "可选",
  "executor": {
    "service": "gmail|calendar|maps|grab|tel|url|internal",
    "method": "create_draft|send|create_event|open|add_todo|add_calendar|...",
    "params": { ... },
    "fallback": { ... }
  }
}

未连接 Gmail 时邮件 action 需带 mailto fallback；未连接 Calendar 时需 Google Calendar 网页 fallback。`
}

function buildUserMessage(context: FamilyContext): string {
  const memoryText = formatMemoryForClaude(context.familyMemory)

  return `当前家庭情境：
${JSON.stringify(context, null, 2)}

${memoryText}

请帮这位妈妈处理：${context.todo.title}

先用工具补充缺失的实时信息，再调用 present_to_mom 给出完整方案。`
}

function buildTemplateVars(context: FamilyContext): Record<string, string> {
  const hospital = context.localInfo.hospitals?.[0]
  const office = context.localInfo.immigrationOffices?.[0]

  return {
    'child.name': context.child.name,
    'child.nameEn': context.child.nameEn || context.child.name,
    'child.grade': context.child.grade,
    'child.teacherName': context.child.teacherName || 'Teacher',
    'child.teacherEmail': context.child.teacherEmail || '',
    'child.school': context.child.school,
    'mom.city': context.mom.city,
    'mom.country': context.mom.country,
    'todo.title': context.todo.title,
    'todo.daysLeft': context.todo.daysLeft != null ? String(context.todo.daysLeft) : '',
    'todo.id': context.todo.id,
    'realtime.weather': context.realtime.weather?.condition || '',
    'local.hospital.name': hospital?.name || '',
    'local.hospital.phone': hospital?.phone || '',
    'local.hospital.address': hospital?.address || '',
    'local.immigration.name': office?.name || '',
    'local.immigration.phone': office?.phone || '',
    'local.immigration.address': office?.address || '',
  }
}

function resolveTemplates(decision: RootDecision, context: FamilyContext): RootDecision {
  const vars = buildTemplateVars(context)
  const json = JSON.stringify(decision)
  const resolved = json.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
    const val = vars[key.trim()]
    return val != null ? val.replace(/\\/g, '\\\\').replace(/"/g, '\\"') : ''
  })

  try {
    return JSON.parse(resolved) as RootDecision
  } catch {
    return decision
  }
}

function validateDecision(raw: RootDecision): RootDecision {
  return {
    understanding: {
      situation: raw.understanding?.situation || '需要处理的事项',
      urgency: raw.understanding?.urgency || 'normal',
      emotion: raw.understanding?.emotion || '',
      keyFacts: Array.isArray(raw.understanding?.keyFacts) ? raw.understanding.keyFacts.slice(0, 5) : [],
    },
    actions: Array.isArray(raw.actions) ? raw.actions : [],
    prepared: Array.isArray(raw.prepared) ? raw.prepared : [],
    message: {
      headline: raw.message?.headline || '根已准备好',
      detail: raw.message?.detail || '',
      reassurance: raw.message?.reassurance || '你已经做得很好了。',
    },
    completion: {
      message: raw.completion?.message || '搞定了，安心照顾孩子。',
      nextStep: raw.completion?.nextStep,
    },
  }
}

function parseAction(raw: unknown, index: number): RootAction | null {
  if (!raw || typeof raw !== 'object') return null
  const a = raw as Record<string, unknown>
  const executor = a.executor as RootAction['executor'] | undefined
  if (!executor?.service) return null

  return {
    id: String(a.id || `action_${index}`),
    label: String(a.label || '执行'),
    type: a.type === 'secondary' ? 'secondary' : 'primary',
    executor,
    requiresConfirm: a.requiresConfirm !== false,
    confirmMessage: a.confirmMessage ? String(a.confirmMessage) : undefined,
  }
}

function parsePrepared(raw: unknown): PreparedItem {
  const p = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const type = (p.type as PreparedItem['type']) || 'info'

  const itemsField = p.items
  const itemsContent = Array.isArray(itemsField)
    ? itemsField
      .map((i) => {
        if (typeof i === 'string') return i
        if (i && typeof i === 'object') {
          const o = i as Record<string, unknown>
          return String(o.item || o.name || o.label || JSON.stringify(i))
        }
        return String(i)
      })
      .filter(Boolean)
      .join('\n')
    : ''

  const content =
    p.content
    ?? p.text
    ?? p.body
    ?? (itemsContent || undefined)
    ?? p.value
    ?? ''

  const rawLabel = String(p.label || '信息')
  const cleanLabel = rawLabel
    .replace(/Thai/g, '泰语')
    .replace(/视觉提取/g, 'AI生成')
    .slice(0, 30)

  const source = normalizeSourceLevel(p.source)

  return {
    type,
    label: cleanLabel,
    content,
    copyable: p.copyable !== undefined
      ? Boolean(p.copyable)
      : (type === 'draft' || type === 'phrase'),
    source,
    sourceUrl: p.sourceUrl ? String(p.sourceUrl) : undefined,
    disclaimer: p.disclaimer
      ? String(p.disclaimer)
      : resolveItemDisclaimer(source) || undefined,
    requiresConfirm: p.requiresConfirm === true || type === 'draft',
  }
}

function hasPreparedContent(item: PreparedItem): boolean {
  if (item.content == null) return false
  if (typeof item.content === 'string') return item.content.trim().length > 0
  if (Array.isArray(item.content)) return item.content.length > 0
  return true
}

function buildDecisionFromPresent(
  input: ToolInput,
  context: FamilyContext,
  session: DecisionSession,
): RootDecision {
  const urgency = (input.urgency as RootDecision['understanding']['urgency']) || 'normal'
  const rawActions = Array.isArray(input.actions) ? input.actions : []
  const actions = rawActions
    .map((a, i) => parseAction(a, i))
    .filter((a): a is RootAction => !!a)

  const rawPrepared = Array.isArray(input.prepared) ? input.prepared : []
  const prepared = [
    ...session.prepared,
    ...rawPrepared.map(parsePrepared).filter(hasPreparedContent),
  ]

  if (prepared.length === 0 && context.localInfo.visaPolicy) {
    prepared.push({
      type: 'info',
      label: '最新政策参考',
      content: context.localInfo.visaPolicy,
      copyable: true,
      source: 'official_search',
      disclaimer: SOURCE_CONFIG.official_search.disclaimer,
      requiresConfirm: false,
    })
  }

  if (actions.length === 0 && input.primary_action_label) {
    actions.push({
      id: 'primary',
      label: String(input.primary_action_label),
      type: 'primary',
      requiresConfirm: false,
      executor: {
        service: 'internal',
        method: 'complete_todo',
        params: { todoId: context.todo.id },
      },
    })
  }

  return validateDecision({
    understanding: {
      situation: String(input.understand || context.todo.title),
      urgency,
      emotion: String(input.emotion || ''),
      keyFacts: Array.isArray(input.key_facts) ? input.key_facts.map(String) : [],
    },
    actions,
    prepared,
    message: {
      headline: String(input.primary_action_label || '根已准备好'),
      detail: String(input.insight || ''),
      reassurance: String(input.reassurance || '你已经做得很好了，交给我。'),
    },
    completion: {
      message: String(input.done_message || '搞定了。'),
      nextStep: input.next_step ? String(input.next_step) : undefined,
    },
  })
}

function buildFallbackDecision(context: FamilyContext): RootDecision {
  const hospital = context.localInfo.hospitals?.[0]
  const actions: RootAction[] = []

  if (hospital?.google_maps_url || (hospital?.lat && hospital?.lng)) {
    actions.push({
      id: 'navigate',
      label: `导航到${hospital.name || '附近医院'}`,
      type: 'primary',
      requiresConfirm: false,
      executor: hospital.google_maps_url
        ? {
          service: 'url',
          method: 'open',
          params: { url: hospital.google_maps_url },
        }
        : {
          service: 'maps',
          method: 'open',
          params: {
            destination: hospital.name,
            lat: hospital.lat,
            lng: hospital.lng,
          },
        },
    })
  }

  if (context.child.teacherEmail) {
    actions.push({
      id: 'email',
      label: '发邮件给老师',
      type: 'primary',
      requiresConfirm: true,
      confirmMessage: `确认发送邮件给 ${context.child.teacherName || '老师'}？`,
      executor: {
        service: 'gmail',
        method: 'create_draft',
        params: {
          to: context.child.teacherEmail,
          subject: `Regarding ${context.child.nameEn || context.child.name}`,
          body: `Dear ${context.child.teacherName || 'Teacher'},\n\nRegarding: ${context.todo.title}\n\nBest regards`,
        },
        fallback: {
          service: 'url',
          method: 'open',
          params: { url: `mailto:${context.child.teacherEmail}` },
        },
      },
    })
  }

  return validateDecision({
    understanding: {
      situation: context.todo.title,
      urgency: 'normal',
      emotion: '',
      keyFacts: [context.mom.city ? `所在城市：${context.mom.city}` : ''].filter(Boolean),
    },
    actions,
    prepared: [],
    message: {
      headline: '根已根据现有信息准备好',
      detail: '实时搜索暂时不可用，已基于档案和已有本地信息生成方案。',
      reassurance: '你先别慌，我们一步步来。',
    },
    completion: {
      message: '处理完成后记得告诉我。',
    },
  })
}

async function executeToolCall(
  toolName: string,
  toolInput: ToolInput,
  context: FamilyContext,
  session: DecisionSession,
): Promise<unknown> {
  switch (toolName) {
    case 'search_local_service': {
      const queryMap: Record<string, string> = {
        hospital: 'hospital emergency chinese english speaking',
        immigration: 'immigration office visa',
        school: 'international school',
        shopping: String(toolInput.keywords || 'shopping mall'),
        airport: 'international airport',
        pharmacy: 'pharmacy drugstore',
      }
      const serviceType = String(toolInput.service_type || 'shopping')
      const query = String(toolInput.keywords || queryMap[serviceType] || 'service')
      const urgency = toolInput.urgency === 'emergency' ? 'emergency' : 'normal'
      const results = await searchNearby({
        query,
        location: { lat: context.location.lat, lng: context.location.lng },
        city: context.location.city || context.mom.city || context.mom.country,
        urgency,
      })
      session.searchCache[serviceType] = results

      if (isEmergencyContext(context, urgency)) {
        const emergency = getEmergencyPhone(
          context.mom.country || context.location.country,
          'ambulance',
        )
        pushPrepared(session, {
          type: 'info',
          label: '急救电话',
          content: emergency.phone,
          copyable: true,
          source: emergency.source,
          disclaimer: '',
          requiresConfirm: false,
        })
      }

      if (results.length > 0) {
        const top = results[0]
        pushPrepared(session, {
          type: 'info',
          label: SERVICE_LABELS[serviceType] || '附近服务',
          content: results,
          copyable: false,
          source: top.google_maps_url ? 'official_search' : 'ai_generated',
          sourceUrl: top.google_maps_url || undefined,
          disclaimer: top.google_maps_url
            ? '建议出发前致电确认'
            : SOURCE_CONFIG.ai_generated.disclaimer,
          requiresConfirm: false,
        })
      }

      return results
    }

    case 'search_policy': {
      const text = await searchRealtimeInfo(
        String(toolInput.query || ''),
        context.location.city || context.mom.country,
      )
      session.searchCache.policy = text

      if (text) {
        pushPrepared(session, {
          type: 'info',
          label: '签证政策（实时搜索）',
          content: text,
          copyable: true,
          source: 'official_search',
          disclaimer: '政策可能变化，请以官网为准',
          requiresConfirm: false,
        })
      }

      return text
    }

    case 'generate_local_phrase': {
      const targetLang = String(
        toolInput.target_language
        || getLocalLanguage(context.location.country || context.mom.country),
      )
      const text = await generateLocalPhrase({
        situation: String(toolInput.situation || ''),
        targetLanguage: targetLang,
        keyPoints: Array.isArray(toolInput.key_points)
          ? toolInput.key_points.map(String)
          : [],
      })
      if (text) {
        pushPrepared(session, {
          type: 'phrase',
          label: `沟通话术（AI生成）`,
          content: text,
          copyable: true,
          source: 'ai_generated',
          disclaimer: '请核对语意后再使用',
          requiresConfirm: false,
        })
      }
      return text
    }

    default:
      return null
  }
}

export async function makeDecision(context: FamilyContext): Promise<RootDecision> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY 未配置')

  const session: DecisionSession = { prepared: [], searchCache: {} }

  if (isEmergencyContext(context)) {
    const emergency = getEmergencyPhone(
      context.mom.country || context.location.country,
      'ambulance',
    )
    session.prepared.push({
      type: 'info',
      label: '急救电话',
      content: emergency.phone,
      copyable: true,
      source: emergency.source,
      disclaimer: '',
      requiresConfirm: false,
    })
  }

  const messages: Array<{ role: string; content: unknown }> = [
    { role: 'user', content: buildUserMessage(context) },
  ]

  let finalDecision: RootDecision | null = null

  for (let round = 0; round < 5; round++) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: AI_MODELS.claude.default,
        max_tokens: 4000,
        system: buildSystemPrompt(context),
        tools: INTELLIGENT_TOOLS,
        tool_choice: { type: 'auto' },
        messages,
      }),
    })

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(`Claude API 错误: ${response.status} ${errText.slice(0, 200)}`)
    }

    const data = await response.json() as {
      content?: Array<{
        type: string
        id?: string
        name?: string
        input?: ToolInput
        text?: string
      }>
    }

    const content = data.content || []
    messages.push({ role: 'assistant', content })

    const toolUses = content.filter((b) => b.type === 'tool_use')

    if (toolUses.length === 0) {
      const textContent = content.find((b) => b.type === 'text')
      if (textContent?.text) {
        try {
          const cleaned = textContent.text.replace(/```json|```/g, '').trim()
          const match = cleaned.match(/\{[\s\S]*\}/)
          if (match) {
            finalDecision = validateDecision(JSON.parse(match[0]) as RootDecision)
          }
        } catch {
          /* ignore parse error */
        }
      }
      break
    }

    const toolResults = await Promise.all(
      toolUses.map(async (tool) => {
        if (tool.name === 'present_to_mom' && tool.input) {
          finalDecision = buildDecisionFromPresent(tool.input, context, session)
          return {
            type: 'tool_result',
            tool_use_id: tool.id,
            content: 'Presentation prepared',
          }
        }

        const result = await executeToolCall(
          String(tool.name),
          tool.input || {},
          context,
          session,
        )

        return {
          type: 'tool_result',
          tool_use_id: tool.id,
          content: JSON.stringify(result ?? null),
        }
      }),
    )

    messages.push({ role: 'user', content: toolResults })

    if (finalDecision) break
  }

  const decision = finalDecision || buildFallbackDecision(context)

  if (context.todo.title.match(/([A-Z]{2})\d+/i)) {
    const phone = lookupAirlinePhone(context.todo.title)
    if (phone && !decision.actions.some((a) => a.executor.service === 'tel')) {
      decision.actions.push({
        id: 'call_airline',
        label: '致电航空公司',
        type: 'secondary',
        requiresConfirm: false,
        executor: {
          service: 'tel',
          method: 'dial',
          params: {
            phone,
            name: '航空公司',
            phone_source: 'knowledge_base',
          },
        },
      })
    }
  }

  return resolveTemplates(decision, context)
}

export { buildTemplateVars, resolveTemplates }
