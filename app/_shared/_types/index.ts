export type UrgencyLevel = 'urgent' | 'important' | 'lifestyle'
export type HotspotStatus = 'unread' | 'read' | 'dismissed'
export type Priority = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'grey'

/** 周期性待办，对应 todo_items.repeat（DB CHECK） */
export type TodoRepeat = 'daily' | 'weekly' | 'monthly' | 'weekdays'
export type HealthStatus = 'normal' | 'recovering' | 'sick'
export type MoodStatus = 'happy' | 'calm' | 'anxious' | 'upset'

/** 家庭车辆档案，对应 `vehicles` 表 */
export interface Vehicle {
  id?: string
  user_id?: string
  nickname?: string
  make?: string
  model?: string
  year?: string
  license_plate?: string
  color?: string
  vin?: string
  insurance_company?: string
  insurance_policy?: string
  insurance_expiry?: string
  insurance_phone?: string
  roadside_assistance?: string
  registration_expiry?: string
  created_at?: string
  updated_at?: string
}

/** 与 `family_profile` 表及档案向导字段对齐（填表 / 预填 PDF） */
export type FamilyProfile = {
  id?: string
  user_id?: string
  member_name?: string
  member_nationality?: string
  member_role?: string
  phone?: string
  email?: string
  passport_number?: string
  passport_expiry?: string
  passport_issue_place?: string
  /** 护照签发日期 */
  passport_issue_date?: string
  /** 护照签发国 / 护照所属国家 */
  passport_country?: string
  visa_type?: string
  visa_expiry?: string
  tm30_number?: string
  insurance_number?: string
  insurance_company?: string
  insurance_expiry?: string
  home_address_en?: string
  home_address_zh?: string
  school_name?: string
  school_address?: string
  hospital_name?: string
  resident_city?: string
  emergency_name?: string
  emergency_relation?: string
  emergency_phone?: string
  blood_type?: string
  allergies?: string
  chronic_conditions?: string
  updated_at?: string
}

export type Child = {
  id: string
  name: string
  emoji: string
  energy: number
  progress: number
  avatar_url?: string
  health_status?: HealthStatus
  mood_status?: MoodStatus
  school_name?: string
  grade?: string
  school_start_time?: string
  school_end_time?: string
  usual_bedtime?: string
  weekend_bedtime?: string
  urgent_items?: { title: string; level: 'red' | 'orange' | 'yellow' }[]
  /** 生日（DB `birthdate`） */
  birthdate?: string
  blood_type?: string
  /** 过敏史；存库可能为 string[] 或 JSON */
  allergies?: string | string[]
  medical_conditions?: string | string[]
  passport_number?: string
  passport_expiry?: string
  nationality?: string
  languages?: string[]
}

export type TodoItem = {
  id: string
  title: string
  priority: Priority
  category?: string
  due_date?: string
  /** 周期重复；无则一次性待办 */
  repeat?: TodoRepeat | null
  ai_draft?: string
  one_tap_ready?: boolean
  delegated_to?: string
  status: string
  ai_action_data?: any
  _isTemp?: boolean
}

export type Reminder = {
  id: string
  title: string
  description?: string
  category?: string
  urgency_level: number
  due_date?: string
  status: string
  action_url?: string
  action_label?: string
  ai_action_data?: {
    execution_pack?: any
    brain_instruction?: any
    prepared_at?: string
  }
}

export type HotspotItem = {
  id: string
  title: string
  summary: string
  urgency: UrgencyLevel
  category: string
  relevance_reason?: string
  action_available: boolean
  action_type?: string
  action_data?: { url?: string }
  status: HotspotStatus
  created_at: string
}

export type TimelineItem = {
  id: string
  time: string
  end_time?: string
  title: string
  type: 'class' | 'activity' | 'medical' | 'special' | 'extracurricular'
  source: 'schedule' | 'calendar' | 'health' | 'profile'
  event?: any
}

export type DailyLog = {
  id?: string
  health_status: HealthStatus
  mood_status: MoodStatus
}
