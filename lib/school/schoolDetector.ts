export interface SchoolProfile {
  name: string
  curriculum: 'american' | 'british' | 'ib' | 'unknown'
  website?: string
  city: string
  calendarPattern: string
}

export const KNOWN_SCHOOLS: Record<string, SchoolProfile> = {
  'nakornpayap international school': {
    name: 'Nakornpayap International School',
    curriculum: 'american',
    website: 'https://www.nis.ac.th',
    city: 'Chiang Mai',
    calendarPattern: 'Aug start, Jun end, 2 semesters',
  },
  nis: {
    name: 'Nakornpayap International School',
    curriculum: 'american',
    website: 'https://www.nis.ac.th',
    city: 'Chiang Mai',
    calendarPattern: 'Aug start, Jun end, 2 semesters',
  },
  'chiang mai international school': {
    name: 'Chiang Mai International School',
    curriculum: 'american',
    website: 'https://www.cmis.ac.th',
    city: 'Chiang Mai',
    calendarPattern: 'Aug start, Jun end, 2 semesters',
  },
  cmis: {
    name: 'Chiang Mai International School',
    curriculum: 'american',
    website: 'https://www.cmis.ac.th',
    city: 'Chiang Mai',
    calendarPattern: 'Aug start, Jun end, 2 semesters',
  },
  'prem tinsulanonda international school': {
    name: 'Prem Tinsulanonda International School',
    curriculum: 'ib',
    website: 'https://www.ptis.ac.th',
    city: 'Chiang Mai',
    calendarPattern: 'Aug start, Jun end, IB curriculum',
  },
  'lanna international school': {
    name: 'Lanna International School',
    curriculum: 'british',
    website: 'https://www.lannaist.ac.th',
    city: 'Chiang Mai',
    calendarPattern: 'Aug start, Jul end, 3 terms',
  },
  'meritton british international school': {
    name: 'Meritton British International School',
    curriculum: 'british',
    website: 'https://www.meritton.ac.th',
    city: 'Chiang Mai',
    calendarPattern: 'Aug start, Jul end, 3 terms with half-terms',
  },
  'international school bangkok': {
    name: 'International School Bangkok',
    curriculum: 'american',
    website: 'https://www.isb.ac.th',
    city: 'Bangkok',
    calendarPattern: 'Aug start, Jun end, 2 semesters',
  },
  isb: {
    name: 'International School Bangkok',
    curriculum: 'american',
    website: 'https://www.isb.ac.th',
    city: 'Bangkok',
    calendarPattern: 'Aug start, Jun end, 2 semesters',
  },
  'bangkok patana school': {
    name: 'Bangkok Patana School',
    curriculum: 'british',
    website: 'https://www.patana.ac.th',
    city: 'Bangkok',
    calendarPattern: 'Aug start, Jul end, 3 terms',
  },
  'shrewsbury international school': {
    name: 'Shrewsbury International School',
    curriculum: 'british',
    website: 'https://www.shrewsbury.ac.th',
    city: 'Bangkok',
    calendarPattern: 'Aug start, Jul end, 3 terms',
  },
  'ruamrudee international school': {
    name: 'Ruamrudee International School',
    curriculum: 'american',
    website: 'https://www.rism.ac.th',
    city: 'Bangkok',
    calendarPattern: 'Aug start, Jun end, 2 semesters',
  },
}

const CURRICULUM_GUIDE: Record<'american' | 'british' | 'ib', string> = {
  american: `美制学校校历特征：
- 8月中旬开学，6月初结束
- 分两学期（Semester 1: Aug-Dec, Semester 2: Jan-Jun）
- 圣诞假期约2周（12月下旬-1月上旬）
- 春假约1周（3-4月）
- 感恩节假期（美国学校）`,

  british: `英制学校校历特征：
- 8月下旬或9月初开学，7月中旬结束
- 分三学期（Term 1/2/3）
- 每学期中间有Half-Term Break（1-2周）
- 圣诞假期约2周
- 复活节假期约2周`,

  ib: `IB学校校历特征：
- 通常8月开学
- IB考试在4-5月
- 结合美制或英制学期结构`,
}

export function detectSchool(schoolName: string): SchoolProfile | null {
  const key = schoolName.toLowerCase().trim()

  if (KNOWN_SCHOOLS[key]) return KNOWN_SCHOOLS[key]

  for (const [k, profile] of Object.entries(KNOWN_SCHOOLS)) {
    if (key.includes(k) || k.includes(key)) return profile
  }

  if (key.includes('british') || key.includes('英国')) {
    return {
      name: schoolName,
      curriculum: 'british',
      city: 'unknown',
      calendarPattern: 'Aug start, Jul end, 3 terms with half-terms',
    }
  }
  if (key.includes('american') || key.includes('美国')) {
    return {
      name: schoolName,
      curriculum: 'american',
      city: 'unknown',
      calendarPattern: 'Aug start, Jun end, 2 semesters',
    }
  }

  return null
}

export function buildCalendarPrompt(
  profile: SchoolProfile,
  year: number = 2026,
): string {
  const guide =
    profile.curriculum !== 'unknown'
      ? CURRICULUM_GUIDE[profile.curriculum]
      : ''

  return `请从以下学校网页中提取${year}至${year + 1}学年的校历关键日期。

学校：${profile.name}
学制：${profile.curriculum}
${guide}

只提取以下类型的重要日期（不要提取每周课程表）：
1. 学期开始和结束日期（term）
2. 学期假期/放假日期（holiday）
3. 考试周（exam）
4. 重要活动（家长会/运动会/毕业典礼等）（activity）
5. 泰国法定节假日（holiday）

返回JSON格式：
{
  "school": "${profile.name}",
  "curriculum": "${profile.curriculum}",
  "events": [
    {
      "title": "事件名称（中文）",
      "title_en": "英文原名",
      "date_start": "YYYY-MM-DD",
      "date_end": "YYYY-MM-DD",
      "event_type": "term|holiday|exam|activity"
    }
  ]
}

如果找不到具体日期，返回 {"events": []}`
}

export type CalendarEventRow = {
  title: string
  date_start: string
  date_end?: string
  event_type?: string
}

export function generateDefaultCalendar(
  profile: SchoolProfile,
  year: number,
): CalendarEventRow[] {
  if (profile.curriculum === 'american') {
    return [
      { title: '第一学期开始', date_start: `${year}-08-15`, date_end: `${year}-08-15`, event_type: 'term' },
      { title: '感恩节假期', date_start: `${year}-11-26`, date_end: `${year}-11-28`, event_type: 'holiday' },
      { title: '圣诞假期开始', date_start: `${year}-12-20`, date_end: `${year + 1}-01-04`, event_type: 'holiday' },
      { title: '第二学期开始', date_start: `${year + 1}-01-05`, date_end: `${year + 1}-01-05`, event_type: 'term' },
      { title: '春假', date_start: `${year + 1}-03-28`, date_end: `${year + 1}-04-05`, event_type: 'holiday' },
      { title: '学年结束', date_start: `${year + 1}-06-05`, date_end: `${year + 1}-06-05`, event_type: 'term' },
      { title: '暑假', date_start: `${year + 1}-06-06`, date_end: `${year + 1}-08-14`, event_type: 'holiday' },
    ]
  }

  if (profile.curriculum === 'british') {
    return [
      { title: 'Term 1 开始', date_start: `${year}-08-25`, date_end: `${year}-08-25`, event_type: 'term' },
      { title: 'Term 1 Half-Term', date_start: `${year}-10-19`, date_end: `${year}-10-27`, event_type: 'holiday' },
      { title: 'Term 1 结束', date_start: `${year}-12-12`, date_end: `${year}-12-12`, event_type: 'term' },
      { title: '圣诞假期', date_start: `${year}-12-13`, date_end: `${year + 1}-01-06`, event_type: 'holiday' },
      { title: 'Term 2 开始', date_start: `${year + 1}-01-07`, date_end: `${year + 1}-01-07`, event_type: 'term' },
      { title: 'Term 2 Half-Term', date_start: `${year + 1}-02-16`, date_end: `${year + 1}-02-24`, event_type: 'holiday' },
      { title: 'Term 2 结束', date_start: `${year + 1}-03-27`, date_end: `${year + 1}-03-27`, event_type: 'term' },
      { title: '复活节假期', date_start: `${year + 1}-03-28`, date_end: `${year + 1}-04-14`, event_type: 'holiday' },
      { title: 'Term 3 开始', date_start: `${year + 1}-04-15`, date_end: `${year + 1}-04-15`, event_type: 'term' },
      { title: 'Term 3 Half-Term', date_start: `${year + 1}-05-25`, date_end: `${year + 1}-06-02`, event_type: 'holiday' },
      { title: '学年结束', date_start: `${year + 1}-07-11`, date_end: `${year + 1}-07-11`, event_type: 'term' },
      { title: '暑假', date_start: `${year + 1}-07-12`, date_end: `${year + 1}-08-24`, event_type: 'holiday' },
    ]
  }

  return []
}
