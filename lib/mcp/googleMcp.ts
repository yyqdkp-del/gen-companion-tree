import { addCalendarEvent } from '@/lib/google/calendar'
import { createGmailDraft as createGmailDraftApi, sendGmail, sendGmailDraft as sendGmailDraftApi } from '@/lib/google/gmail'
import { getValidAccessToken } from '@/lib/google/tokenStore'

const GMAIL_MCP_URL = 'https://gmail.mcp.claude.com/mcp'
const CALENDAR_MCP_URL = 'https://calendar.mcp.claude.com/mcp'

export type MCPService = 'gmail' | 'calendar'

export interface MCPConnectionStatus {
  gmail: boolean
  calendar: boolean
  gmailMessage: string
  calendarMessage: string
}

export async function checkMCPConnection(
  userId: string,
  service: MCPService,
): Promise<boolean> {
  const token = await getValidAccessToken(userId, service)
  return !!token
}

export async function getMCPConnectionStatus(userId: string): Promise<MCPConnectionStatus> {
  const [gmail, calendar] = await Promise.all([
    checkMCPConnection(userId, 'gmail'),
    checkMCPConnection(userId, 'calendar'),
  ])

  return {
    gmail,
    calendar,
    gmailMessage: gmail
      ? '根已连接你的 Gmail，可以直接发送'
      : '连接 Gmail 后根可以帮你直接发送',
    calendarMessage: calendar
      ? '根已连接你的 Google 日历，可以直接写入'
      : '连接 Google 日历后根可以帮你自动加入',
  }
}

function parseMcpToolText(data: { content?: Array<{ type?: string; text?: string; content?: unknown[] }> }): string {
  const blocks = data.content || []
  const texts: string[] = []

  for (const block of blocks) {
    if (block.type === 'text' && block.text) texts.push(block.text)
    if (block.type === 'mcp_tool_result') {
      const inner = block.content as Array<{ text?: string }> | undefined
      if (Array.isArray(inner)) {
        for (const part of inner) {
          if (part.text) texts.push(part.text)
        }
      }
    }
  }

  return texts.join('\n').trim()
}

async function callAnthropicMcp(
  mcpUrl: string,
  mcpName: string,
  prompt: string,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return ''

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'mcp-client-2025-04-04',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        mcp_servers: [{ type: 'url', url: mcpUrl, name: mcpName }],
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      console.error('[googleMcp] anthropic error:', res.status, await res.text().catch(() => ''))
      return ''
    }

    const data = await res.json() as { content?: Array<{ type?: string; text?: string; content?: unknown[] }> }
    return parseMcpToolText(data)
  } catch (e) {
    console.error('[googleMcp] callAnthropicMcp failed:', e)
    return ''
  }
}

export async function createGmailDraft(params: {
  to: string
  subject: string
  body: string
  userId: string
}): Promise<{ draftId: string; previewUrl: string; via: 'mcp' | 'api' }> {
  const mcpText = await callAnthropicMcp(
    GMAIL_MCP_URL,
    'gmail-mcp',
    `请用 Gmail 创建一封邮件草稿（不要发送）：
收件人：${params.to}
主题：${params.subject}
正文：
${params.body}

创建完成后返回草稿 ID。`,
  )

  const draftIdFromMcp = mcpText.match(/draft[_\s-]?id[:\s]+([a-zA-Z0-9_-]+)/i)?.[1]
    || mcpText.match(/\b([0-9]+|[a-f0-9]{10,})\b/i)?.[1]

  if (draftIdFromMcp) {
    return {
      draftId: draftIdFromMcp,
      previewUrl: 'https://mail.google.com/mail/u/0/#drafts',
      via: 'mcp',
    }
  }

  const apiResult = await createGmailDraftApi(
    params.userId,
    params.to,
    params.subject,
    params.body,
  )

  if (apiResult.success && apiResult.draftId) {
    return {
      draftId: apiResult.draftId,
      previewUrl: apiResult.previewUrl || 'https://mail.google.com/mail/u/0/#drafts',
      via: 'api',
    }
  }

  throw new Error(apiResult.error || '创建草稿失败')
}

export async function sendGmailDraft(params: {
  userId: string
  draftId: string
  to: string
  subject: string
  body: string
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const mcpText = await callAnthropicMcp(
    GMAIL_MCP_URL,
    'gmail-mcp',
    `请用 Gmail 发送草稿 ID：${params.draftId}。发送完成后回复「已发送」。`,
  )

  if (/已发送|sent|success/i.test(mcpText)) {
    return { ok: true, messageId: params.draftId }
  }

  const draftSend = await sendGmailDraftApi(params.userId, params.draftId)
  if (draftSend.success) {
    return { ok: true, messageId: draftSend.messageId }
  }

  const direct = await sendGmail(params.userId, params.to, params.subject, params.body)
  if (direct.success) {
    return { ok: true, messageId: direct.messageId }
  }

  return { ok: false, error: draftSend.error || direct.error || '发送失败' }
}

export async function addToGoogleCalendar(params: {
  userId: string
  title: string
  date: string
  notes?: string
}): Promise<{ ok: boolean; eventLink?: string; error?: string; via?: 'mcp' | 'api' | 'web' }> {
  const mcpText = await callAnthropicMcp(
    CALENDAR_MCP_URL,
    'google-calendar-mcp',
    `在 Google Calendar 创建全天事件：
标题：${params.title}
日期：${params.date}
备注：${params.notes || ''}

创建完成后确认。`,
  )

  if (/已创建|created|success|完成/i.test(mcpText)) {
    return { ok: true, eventLink: 'https://calendar.google.com', via: 'mcp' }
  }

  const startISO = `${params.date}T09:00:00`
  const endISO = `${params.date}T10:00:00`
  const apiResult = await addCalendarEvent(params.userId, {
    title: params.title,
    startTime: startISO,
    endTime: endISO,
    description: params.notes,
    timeZone: 'Asia/Bangkok',
  })

  if (apiResult.success) {
    return { ok: true, eventLink: apiResult.htmlLink, via: 'api' }
  }

  return {
    ok: false,
    error: apiResult.error || '添加日历失败',
    via: 'web',
  }
}

export function buildGoogleCalendarWebUrl(title: string, date: string): string {
  const d = date.replace(/-/g, '')
  const text = encodeURIComponent(title)
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${d}/${d}`
}

export function buildMailtoUrl(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
