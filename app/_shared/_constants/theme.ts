export const THEME = {
  bg:    'linear-gradient(180deg, #A7D7D9 0%, #D9A7B4 100%)',
  text:  '#2C3E50',
  gold:  '#B08D57',
  navy:  '#1A3C5E',
  muted: '#6B8BAA',
} as const

export const GREEN = {
  bg:     '#E1F5EE',
  border: '#9FE1CB',
  mid:    '#5DCAA5',
  deep:   '#1D9E75',
  dark:   '#0F6E56',
} as const

export const URGENCY_COLOR: Record<number, string> = {
  1: 'rgba(154, 183, 232, 0.35)',
  2: 'rgba(141, 200, 160, 0.50)',
  3: 'rgba(255, 180, 100, 0.65)',
}

export const URGENCY_BORDER: Record<number, string> = {
  1: 'rgba(154,183,232,0.3)',
  2: 'rgba(141,200,160,0.5)',
  3: 'rgba(255,180,100,0.7)',
}

export const URGENCY_CFG = {
  urgent:    { label: '紧急', color: '#CC3333', bg: 'rgba(255,100,100,0.08)', border: '#FF6B6B' },
  important: { label: '重要', color: '#E07B2A', bg: 'rgba(255,160,60,0.08)',  border: '#FF8C00' },
  lifestyle: { label: '生活', color: '#3B82F6', bg: 'rgba(154,183,232,0.08)', border: '#60A5FA' },
} as const

export const PRIORITY_CFG: Record<string, { label: string; bg: string; border: string }> = {
  red:    { label: '今天必须', bg: 'rgba(255,100,100,0.09)', border: '#FF6B6B' },
  orange: { label: '3天内',   bg: 'rgba(255,160,60,0.09)',  border: '#FF8C00' },
  yellow: { label: '本周',    bg: 'rgba(255,210,80,0.09)',  border: '#FACC15' },
  green:  { label: '本月',    bg: 'rgba(141,200,160,0.09)', border: '#4ADE80' },
  blue:   { label: '长期',    bg: 'rgba(154,183,232,0.09)', border: '#60A5FA' },
  grey:   { label: '等待中',  bg: 'rgba(0,0,0,0.03)',       border: 'rgba(0,0,0,0.1)' },
}
