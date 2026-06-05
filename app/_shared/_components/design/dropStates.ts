export type DropStateKey = 'calm' | 'yellow' | 'orange' | 'red'

export const DROP_STATES: Record<DropStateKey, { fill: string; text: string; glow: string }> = {
  calm: {
    fill: 'linear-gradient(135deg, var(--droplet-slate-light) 0%, var(--droplet-slate) 100%)',
    text: 'var(--droplet-slate-dark)',
    glow: 'rgba(108, 130, 143, 0.18)',
  },
  yellow: {
    fill: 'linear-gradient(135deg, var(--droplet-willow-light) 0%, var(--droplet-willow) 100%)',
    text: 'var(--droplet-willow-dark)',
    glow: 'rgba(140, 168, 141, 0.2)',
  },
  orange: {
    fill: 'linear-gradient(135deg, var(--droplet-peach-light) 0%, var(--droplet-peach) 100%)',
    text: 'var(--droplet-peach-dark)',
    glow: 'rgba(230, 168, 158, 0.24)',
  },
  red: {
    fill: 'linear-gradient(135deg, var(--droplet-peach-light) 0%, #d58074 100%)',
    text: '#6b2f2f',
    glow: 'rgba(213, 128, 116, 0.28)',
  },
}
