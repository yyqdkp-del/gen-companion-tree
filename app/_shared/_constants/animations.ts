export const DROP_ANIM = [
  { duration: 6.5, delay: 0,   yRange: 14, xRange: 5, rotate: 1.5 },
  { duration: 8.2, delay: 1.5, yRange: 10, xRange: 7, rotate: 2   },
  { duration: 7.0, delay: 3.2, yRange: 16, xRange: 4, rotate: 1   },
  { duration: 5.8, delay: 0.8, yRange: 12, xRange: 6, rotate: 2.5 },
  { duration: 9.0, delay: 2.4, yRange: 8,  xRange: 8, rotate: 1.2 },
  { duration: 6.2, delay: 4.1, yRange: 18, xRange: 3, rotate: 0.8 },
  { duration: 7.8, delay: 1.9, yRange: 11, xRange: 5, rotate: 1.8 },
] as const

// top 上限 48%，避免与底部导航（~110px）重叠
export const POSITIONS = [
  { top: '22%', left: '8%'   },
  { top: '20%', right: '8%'  },
  { top: '32%', left: '55%'  },
  { top: '38%', left: '15%'  },
  { top: '44%', right: '12%' },
  { top: '48%', left: '40%'  },
  { top: '48%', right: '45%' },
  { top: '30%', left: '30%'  },
  { top: '48%', left: '10%'  },
  { top: '46%', right: '55%' },
] as const
