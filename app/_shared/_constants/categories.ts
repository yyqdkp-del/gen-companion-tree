export const CAT_EMOJI: Record<string, string> = {
  safety: '🚨', education: '📚', visa: '📋', finance: '💰',
  health: '🏥', shopping: '🛍', mom: '💆', weather: '🌤', default: '📌',
}

export const EVENT_TYPE_EMOJI: Record<string, string> = {
  activity: '🎯', exam: '📝', holiday: '🎉', meeting: '👨‍👩‍👧',
  class: '📚', trip: '🚌', medical: '🏥', extracurricular: '🎨', other: '📌',
}

import { FileText, ShoppingCart, Pill, Building2, Plane, Clock } from 'lucide-react'
import React from 'react'

export function getCategoryIcon(category: string): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    visa:     React.createElement(Plane,        { size: 16 }),
    medical:  React.createElement(Pill,         { size: 16 }),
    school:   React.createElement(FileText,     { size: 16 }),
    shopping: React.createElement(ShoppingCart, { size: 16 }),
    utility:  React.createElement(Building2,    { size: 16 }),
  }
  return icons[category] ?? React.createElement(Clock, { size: 16 })
}
