import {
  emptyWeekSchedule,
  normalizeWeekSchedule,
  parseRawSchedule,
  preserveCategories,
  type WeekSchedule,
} from '@/lib/schedule/normalizeSchedule'

import { AI_MODELS } from '@/lib/ai/models'

const CLAUDE_MODEL = AI_MODELS.claude.fast

async function callClaude(body: object, label: string): Promise<{ text: string; ok: boolean }> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()
  if (!response.ok) {
    console.error(`[enrichSchedule] ${label} error:`, JSON.stringify(data).slice(0, 500))
  }

  return {
    ok: response.ok,
    text: data.content?.[0]?.text || '',
  }
}

function parseClaudeJson(raw: string): unknown | null {
  const trimmed = raw.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      // continue
    }
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1].trim())
    } catch {
      // fall through
    }
  }

  const m = raw.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    return JSON.parse(m[0])
  } catch {
    return null
  }
}

/** Claude 语义 enrich：补 name_zh / category / requires_items */
export async function enrichSchedule(step1: WeekSchedule): Promise<WeekSchedule | null> {
  const inputJson = JSON.stringify(step1)

  const result = await callClaude({
    model: CLAUDE_MODEL,
    max_tokens: 3000,
    messages: [{
      role: 'user',
      content: `以下是国际学校课表数据，请为每个 subject 补充：
- name_zh：中文简称2-6字
- category：见下方分类规则
- requires_items：需要携带物品的中文数组（可选）

对每个课程条目，判断 category：
- class：真实学科课程（Math/Science/ELA/Thai 等）
- activity：课外活动/特色课（Stack/Art/Music/PE/Swimming 等）
- transition：过渡性安排（Pick up/Drop off/Morning Routine 等）
- break：休息时间（Snack/Lunch/Rest Time/Recess 等）

返回相同结构，每个条目加上 name_zh、category、requires_items 字段
只返回 JSON

${inputJson}`,
    }],
  }, 'semantic')

  if (!result.ok) return null

  const parsed = parseClaudeJson(result.text)
  if (!parsed) return null

  const raw = parseRawSchedule(parsed)
  const normalized = normalizeWeekSchedule(raw)
  return preserveCategories(normalized, step1)
}
