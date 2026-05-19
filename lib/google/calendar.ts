import { getValidAccessToken } from './tokenStore'

export interface CalendarEvent {
  title: string
  startTime: string
  endTime: string
  location?: string
  description?: string
  attendees?: string[]
  timeZone?: string
  recurrence?: string[]
}

export async function addCalendarEvent(
  userId: string,
  event: CalendarEvent,
): Promise<{ success: boolean; eventId?: string; htmlLink?: string; error?: string }> {
  const accessToken = await getValidAccessToken(userId, 'calendar')
  if (!accessToken) {
    return { success: false, error: 'Google 日历未授权，请先在档案页连接' }
  }

  const timeZone = event.timeZone ?? 'Asia/Bangkok'

  const body: Record<string, unknown> = {
    summary: event.title,
    location: event.location,
    description: event.description,
    start: {
      dateTime: event.startTime,
      timeZone,
    },
    end: {
      dateTime: event.endTime,
      timeZone,
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },
        { method: 'popup', minutes: 10 },
      ],
    },
  }

  if (event.attendees?.length) {
    body.attendees = event.attendees.map((email) => ({ email }))
  }

  if (event.recurrence?.length) {
    body.recurrence = event.recurrence
  }

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    let errMsg = '添加失败'
    try {
      const err = (await res.json()) as { error?: { message?: string } }
      errMsg = err.error?.message ?? errMsg
    } catch {
      errMsg = (await res.text().catch(() => errMsg)) || errMsg
    }
    return { success: false, error: errMsg }
  }

  const data = (await res.json()) as { id?: string; htmlLink?: string }
  return { success: true, eventId: data.id, htmlLink: data.htmlLink }
}
