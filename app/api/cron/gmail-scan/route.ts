// app/api/cron/gmail-scan/route.ts
// Vercel Cron Job：每天4次自动扫描Gmail，兜底Make.com
// 使用fetch调用Anthropic API，无需额外安装SDK

import { NextRequest, NextResponse } from 'next/server'

const GMAIL_MCP_URL = 'https://gmail.mcp.claude.com/mcp'

const SCHOOL_FILTERS = [
  'school', 'academy', 'college', 'international',
  'parent', 'student', 'class', 'grade', 'term',
  'holiday', 'schedule', 'fee', 'payment', 'field trip',
  'sports day', 'graduation', 'report card',
  '学校', '幼儿园', '家长', '通知', '课表', '成绩',
  '缴费', '活动', '假期', '运动会', '家长会',
  'lanna', 'prem', 'maerim', 'chiang mai',
]

async function fetchRecentEmails(): Promise<any[]> {
  try {
    const since = new Date(Date.now() - 6 * 60 * 60 * 1000)
    const sinceStr = since.toISOString().split('T')[0]

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'mcp-client-2025-04-04',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 8000,
        mcp_servers: [{
          type: 'url',
          url: GMAIL_MCP_URL,
          name: 'gmail-mcp',
        }],
        messages: [{
          role: 'user',
          content: `搜索Gmail中 ${sinceStr} 之后的邮件，优先找学校/通知/缴费相关。

每封邮件提取以下信息，输出JSON数组：
[{"message_id":"","from":"","subject":"","date":"","body":"正文最多2000字","snippet":""}]

只返回JSON数组，无邮件返回[]`
        }],
      }),
    })

    const data = await response.json()
    const text = (data.content || [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('')

    const jsonMatch = text.match(/\[[\s\S]*\]/)
    return jsonMatch ? JSON.parse(jsonMatch[0]) : []

  } catch (e: any) {
    console.error('Gmail MCP读取失败:', e?.message || e)
    return []
  }
}

function filterRelevantEmails(emails: any[]): any[] {
  return emails.filter(email => {
    const text = `${email.subject} ${email.from} ${email.snippet || ''}`.toLowerCase()
    return SCHOOL_FILTERS.some(kw => text.includes(kw.toLowerCase()))
  })
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('Gmail扫描开始:', new Date().toISOString())

  try {
    const allEmails = await fetchRecentEmails()
    console.log('读取邮件:', allEmails.length)

    if (!allEmails.length) {
      return NextResponse.json({ ok: true, message: '无新邮件', scanned: 0 })
    }

    const relevant = filterRelevantEmails(allEmails)
    console.log('相关邮件:', relevant.length)

    if (!relevant.length) {
      return NextResponse.json({ ok: true, message: '无相关邮件', scanned: allEmails.length })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gen-companion-tree.vercel.app'
    const parseRes = await fetch(`${baseUrl}/api/email/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(relevant.map(e => ({ ...e, source: 'mcp_scan' }))),
    })

    const result = await parseRes.json()

    return NextResponse.json({
      ok: true,
      scanned: allEmails.length,
      relevant: relevant.length,
      processed: result.processed,
    })

  } catch (e: any) {
    console.error('Gmail扫描错误:', e?.message || e)
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
