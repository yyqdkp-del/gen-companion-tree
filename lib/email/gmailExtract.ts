export type GmailAttachment = {
  filename: string
  mimeType: string
  data: string
}

export type ExtractedEmail = {
  subject: string
  body: string
  from: string
  date: string
  attachments: GmailAttachment[]
}

function decodeBase64Url(data: string): string {
  const padded = data.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(padded, 'base64').toString('utf8')
}

type GmailPart = {
  mimeType?: string
  filename?: string
  parts?: GmailPart[]
  body?: { data?: string; attachmentId?: string }
}

/**
 * 从 Gmail REST API 拉取邮件正文与附件（base64 仅用于当前处理，不持久化）。
 * @param accessToken OAuth access token
 * @param messageId Gmail message id
 */
export async function extractEmailWithAttachments(
  accessToken: string,
  messageId: string,
): Promise<ExtractedEmail> {
  const msgRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!msgRes.ok) {
    throw new Error(`Gmail message fetch failed (${msgRes.status})`)
  }

  const message = await msgRes.json() as {
    payload?: GmailPart & { headers?: { name: string; value: string }[] }
  }

  const headers = message.payload?.headers || []
  const subject = headers.find((h) => h.name === 'Subject')?.value || ''
  const from = headers.find((h) => h.name === 'From')?.value || ''
  const date = headers.find((h) => h.name === 'Date')?.value || ''

  let body = ''
  const attachmentRefs: Array<{ filename: string; mimeType: string; attachmentId: string }> = []

  function extractParts(parts: GmailPart[] | undefined) {
    if (!parts) return
    for (const part of parts) {
      if (part.parts?.length) {
        extractParts(part.parts)
        continue
      }

      if (part.mimeType === 'text/plain' && part.body?.data && !body) {
        body = decodeBase64Url(part.body.data)
      }

      if (
        (part.mimeType === 'application/pdf' || part.mimeType?.startsWith('image/')) &&
        part.body?.attachmentId
      ) {
        attachmentRefs.push({
          filename: part.filename || 'attachment',
          mimeType: part.mimeType || 'application/octet-stream',
          attachmentId: part.body.attachmentId,
        })
      }
    }
  }

  extractParts(message.payload?.parts || [])

  if (!body && message.payload?.body?.data) {
    body = decodeBase64Url(message.payload.body.data)
  }

  const attachmentData = await Promise.all(
    attachmentRefs.slice(0, 3).map(async (att) => {
      try {
        const res = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${att.attachmentId}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        )
        if (!res.ok) return null
        const json = await res.json() as { data?: string }
        return {
          filename: att.filename,
          mimeType: att.mimeType,
          data: json.data || '',
        } satisfies GmailAttachment
      } catch {
        return null
      }
    }),
  )

  return {
    subject,
    body,
    from,
    date,
    attachments: attachmentData.filter((a): a is GmailAttachment => !!a && !!a.data),
  }
}
