export interface CorrelatedInsight {
  type: string
  title: string
  reason: string
  urgency: 'high' | 'medium' | 'low'
  suggestedActions: Array<{
    label: string
    action: string
    value?: string
    timing: string
  }>
  relatedItems: string[]
}

export type FamilyDataForCorrelation = {
  visa: { daysLeft: number; type: string; country: string }
  schoolCalendar: Array<{
    id?: string
    event_type?: string
    title?: string
    date_start?: string
    requires_items?: string[]
    description?: string
  }>
  todos: Array<{
    id?: string
    title?: string
    category?: string
    dimension?: string
    status?: string
    due_date?: string
  }>
  children: Array<{
    id?: string
    name?: string
    display_health?: string
    teacher_email?: string
    today_classes?: Array<{ subject?: string; category?: string }>
  }>
  flights: Array<{
    id?: string
    title?: string
    description?: string
    date_start?: string
  }>
  weather?: unknown
}

function daysUntil(dateStr: string): number {
  const t = new Date(`${String(dateStr).slice(0, 10)}T12:00:00`).getTime()
  return Math.floor((t - Date.now()) / (1000 * 60 * 60 * 24))
}

function isWealthTodo(t: { category?: string; dimension?: string; title?: string }): boolean {
  if (t.category === 'wealth' || t.dimension === 'wealth') return true
  const title = String(t.title || '')
  return /缴费|学费|账单|付款|续费/.test(title)
}

export async function analyzeCorrelations(
  familyData: FamilyDataForCorrelation,
): Promise<CorrelatedInsight[]> {
  const insights: CorrelatedInsight[] = []

  const visaDaysLeft = familyData.visa?.daysLeft
  const schoolEndEvents = familyData.schoolCalendar
    .filter((e) =>
      e.event_type === 'holiday'
      || e.title?.includes('Term End')
      || e.title?.includes('学期结束')
      || e.title?.includes('放假'),
    )
    .filter((e) => e.date_start && daysUntil(e.date_start) >= 0)
    .sort((a, b) => String(a.date_start).localeCompare(String(b.date_start)))

  if (visaDaysLeft != null && visaDaysLeft <= 90 && visaDaysLeft >= 0 && schoolEndEvents.length > 0) {
    const nearestEnd = schoolEndEvents[0]
    insights.push({
      type: 'visa_school_correlation',
      title: '续签与学期结束时机分析',
      reason: `签证还有${visaDaysLeft}天，${nearestEnd.title}在即，是处理续签和回国安排的最佳窗口`,
      urgency: visaDaysLeft <= 30 ? 'high' : 'medium',
      suggestedActions: [
        {
          label: '查续签要求',
          action: 'open_url',
          value: 'https://extranet.immigration.go.th',
          timing: 'now',
        },
        {
          label: '查回国机票',
          action: 'open_url',
          value: 'https://www.skyscanner.com',
          timing: 'this_week',
        },
      ],
      relatedItems: nearestEnd.id ? [nearestEnd.id] : [],
    })
  }

  const flights = familyData.flights.filter((f) => {
    if (!f.date_start) return false
    const flightDate = new Date(`${String(f.date_start).slice(0, 10)}T12:00:00`)
    const month = flightDate.getMonth() + 1
    return month >= 5 && month <= 10
  })

  for (const flight of flights) {
    const daysUntilFlight = daysUntil(String(flight.date_start))

    if (daysUntilFlight <= 7 && daysUntilFlight >= 0) {
      const isTransfer = flight.title?.includes('中转')
        || flight.description?.includes('转')

      insights.push({
        type: 'flight_weather_risk',
        title: `${flight.title || '航班'} · 出行风险提醒`,
        reason: isTransfer
          ? '雨季出行+中转航班，延误风险较高，建议提前确认改签政策'
          : '雨季出行，建议提前确认航班状态',
        urgency: daysUntilFlight <= 2 ? 'high' : 'medium',
        suggestedActions: [
          {
            label: '查航班状态',
            action: 'open_url',
            value: 'https://www.flightradar24.com',
            timing: 'now',
          },
          {
            label: '致电航空公司',
            action: 'call',
            value: 'tel:95530',
            timing: 'today',
          },
          {
            label: '查天气预报',
            action: 'open_url',
            value: 'https://www.weather.com',
            timing: 'today',
          },
        ],
        relatedItems: flight.id ? [flight.id] : [],
      })
    }
  }

  const sickChildren = familyData.children.filter((c) => c.display_health === 'sick')

  for (const child of sickChildren) {
    const todayClasses = child.today_classes?.filter((c) =>
      c.category === 'class' || c.category === 'activity',
    ) || []

    if (todayClasses.length > 0) {
      insights.push({
        type: 'sick_school_correlation',
        title: `${child.name || '孩子'}生病 · 需要请假`,
        reason: `${child.name || '孩子'}今天生病，但有${todayClasses.length}节课，需要联系学校请假`,
        urgency: 'high',
        suggestedActions: [
          {
            label: '生成请假信',
            action: 'generate_leave_letter',
            value: JSON.stringify({ childName: child.name, classes: todayClasses }),
            timing: 'now',
          },
          {
            label: '发邮件给老师',
            action: 'open_email',
            value: child.teacher_email || '',
            timing: 'now',
          },
        ],
        relatedItems: child.id ? [child.id] : [],
      })
    }
  }

  const paymentTodos = familyData.todos.filter((t) =>
    isWealthTodo(t)
    && t.status !== 'done'
    && t.due_date,
  )

  for (const todo of paymentTodos) {
    const daysUntilDue = daysUntil(String(todo.due_date))

    if (daysUntilDue <= 7 && daysUntilDue > 0) {
      insights.push({
        type: 'payment_timing',
        title: `${todo.title || '待付款项'} · 付款提醒`,
        reason: `还有${daysUntilDue}天截止，建议尽快处理`,
        urgency: daysUntilDue <= 3 ? 'high' : 'medium',
        suggestedActions: [
          {
            label: '查今日汇率',
            action: 'open_url',
            value: 'https://wise.com/gb/currency-converter/thb-to-cny-rate',
            timing: 'now',
          },
          {
            label: '立即付款',
            action: 'one_tap',
            value: todo.id,
            timing: 'now',
          },
        ],
        relatedItems: todo.id ? [todo.id] : [],
      })
    }
  }

  const upcomingEvents = familyData.schoolCalendar.filter((e) => {
    if (!e.date_start || !e.requires_items?.length) return false
    return daysUntil(String(e.date_start)) === 1
  })

  for (const event of upcomingEvents) {
    insights.push({
      type: 'event_packing_reminder',
      title: `明天${event.title || '活动'} · 今晚准备`,
      reason: `明天有${event.title || '活动'}，需要提前准备：${event.requires_items!.join('、')}`,
      urgency: 'medium',
      suggestedActions: [
        {
          label: '查看携带清单',
          action: 'open_packing',
          value: event.id,
          timing: 'tonight',
        },
      ],
      relatedItems: event.id ? [event.id] : [],
    })
  }

  return insights
}
