export const THEME = {
  bg:    '#fbf9f6',
  text:  '#2C3E50',
  gold:  '#8a7355',
  navy:  '#2d3f4a',
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
  1: 'rgba(83, 123, 142, 0.22)',
  2: 'rgba(184, 142, 94, 0.24)',
  3: 'rgba(213, 128, 116, 0.28)',
}

export const URGENCY_BORDER: Record<number, string> = {
  1: '#d0e1e5',
  2: '#f2e2cd',
  3: '#fad6d1',
}

export const URGENCY_CFG = {
  urgent:    { label: '紧急', color: '#7d3f37', bg: '#fff2f0', border: '#fad6d1' },
  important: { label: '重要', color: '#7a5a35', bg: '#fcf7ed', border: '#f2e2cd' },
  lifestyle: { label: '生活', color: '#2b3942', bg: '#f0f5f6', border: '#d0e1e5' },
} as const

export const PRIORITY_COLORS = {
  red: {
    bg: '#fff2f0',
    border: '#fad6d1',
    dot: '#d58074',
    text: '#7d3f37',
  },
  orange: {
    bg: '#fcf7ed',
    border: '#f2e2cd',
    dot: '#b88e5e',
    text: '#7a5a35',
  },
  blue: {
    bg: '#f0f5f6',
    border: '#d0e1e5',
    dot: '#537b8e',
    text: '#2b3942',
  },
} as const

export const PRIORITY_CFG: Record<string, { label: string; bg: string; border: string; dot: string; text: string }> = {
  red:    { label: '今天必须', ...PRIORITY_COLORS.red },
  orange: { label: '3天内',   ...PRIORITY_COLORS.orange },
  yellow: { label: '本周',    bg: '#f8f5ea', border: '#e5dcc5', dot: '#8ca88d', text: '#2f4030' },
  green:  { label: '本月',    bg: '#f0f6ef', border: '#d9e6da', dot: '#8ca88d', text: '#2f4030' },
  blue:   { label: '长期',    ...PRIORITY_COLORS.blue },
  grey:   { label: '等待中',  bg: '#f4f2ed', border: '#ebe8e2', dot: '#94a3b8', text: '#64748b' },
}
