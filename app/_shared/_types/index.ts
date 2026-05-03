export type UrgencyLevel = 'urgent' | 'important' | 'lifestyle'
export type HotspotStatus = 'unread' | 'read' | 'dismissed'
export type Priority = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'grey'
export type HealthStatus = 'normal' | 'recovering' | 'sick'
export type MoodStatus = 'happy' | 'calm' | 'anxious' | 'upset'

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
  urgent_items?: { title: string; level: 'red' | 'orange' | 'yellow' }[]
}

export type TodoItem = {
  id: string
  title: string
  priority: Priority
  category?: string
  due_date?: string
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
