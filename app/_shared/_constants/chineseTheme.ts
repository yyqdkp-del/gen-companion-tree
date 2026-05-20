// ─────────────────────────────────────────
// 根·中文专属主题色
// 独立于全局 THEME，体现书卷感
// ─────────────────────────────────────────

export const CHINESE_THEME = {
  bg:       '#fbf9f6',
  white:    '#ffffff',
  paper:    '#f7f4ee',
  text:     '#2d322f',
  textMid:  '#5a5a4a',
  textDim:  'rgba(45,50,47,0.45)',
  red:      '#a46355',
  gold:     '#8a7355',
  green:    '#5c7a5e',
  blue:     '#4a6b7a',
  navy:     '#2d3f4a',
  orange:   '#b07050',
} as const

export const CHINESE_LEVELS: Record<string, { color: string; bg: string; label: string }> = {
  R1: { color: '#C03A2B', bg: '#FFF0EE', label: '入门' },
  R2: { color: '#BA6A00', bg: '#FFF6EE', label: '基础' },
  R3: { color: '#A07800', bg: '#FFFBEE', label: '进阶' },
  R4: { color: '#5C6E00', bg: '#F5F9EE', label: '提升' },
  R5: { color: '#2D6A4F', bg: '#EDFAF1', label: '高阶' },
}

export const LOAD_MSGS: Record<string, string[]> = {
  hanzi:   ['正在查阅字理古籍…', '翻阅《说文解字》…', '正在拆解字的骨架…', '绘制汉字画面中…'],
  chengyu: ['正在连接中英智慧…', '寻找最贴切的成语…', '编写妈妈台词中…', '正在生成场景…'],
  writing: ['感受孩子的经历…', '连接古人的智慧…', '正在寻找共鸣古诗…', '为妈妈准备台词中…'],
}

export const QUICK_CHENGYU = [
  'very many people',
  '突然下好大的雨',
  '今天作业多到写不完',
]

export const QUICK_WRITING = [
  "We went to the night market, so many people!",
  '下雨天在家，有点无聊',
  '今天考试考得很好',
]
