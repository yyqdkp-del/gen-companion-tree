import { getValidAccessToken } from './tokenStore'

export async function sendGmail(
  userId: string,
  to: string,
  subject: string,
  body: string,
  isHtml = false,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const accessToken = await getValidAccessToken(userId, 'gmail')
  if (!accessToken) {
    return { success: false, error: 'Gmail 未授权，请先在档案页连接 Gmail' }
  }

  const email = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: ${isHtml ? 'text/html' : 'text/plain'}; charset=UTF-8`,
    'Content-Transfer-Encoding: 8bit',
    '',
    body,
  ].join('\r\n')

  const encoded = Buffer.from(email, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: encoded }),
  })

  if (!res.ok) {
    let errMsg = '发送失败'
    try {
      const err = (await res.json()) as { error?: { message?: string } }
      errMsg = err.error?.message ?? errMsg
    } catch {
      errMsg = await res.text().catch(() => errMsg)
    }
    return { success: false, error: errMsg }
  }

  const data = (await res.json()) as { id?: string }
  return { success: true, messageId: data.id }
}
