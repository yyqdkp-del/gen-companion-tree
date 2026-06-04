export type SubjectPackingPref = {
  items?: string[]
  dismissed?: string[]
}

export type PackingPreferencesMap = Record<string, SubjectPackingPref>

export function normalizePackingPreferences(raw: unknown): PackingPreferencesMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: PackingPreferencesMap = {}
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    const k = key.trim()
    if (!k || !val || typeof val !== 'object' || Array.isArray(val)) continue
    const obj = val as SubjectPackingPref
    const items = Array.isArray(obj.items)
      ? [...new Set(obj.items.map((x) => String(x).trim()).filter(Boolean))]
      : []
    const dismissed = Array.isArray(obj.dismissed)
      ? [...new Set(obj.dismissed.map((x) => String(x).trim()).filter(Boolean))]
      : []
    out[k] = { items, dismissed }
  }
  return out
}

export function normalizeRequiresItems(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return [...new Set(v.map((x) => String(x).trim()).filter(Boolean))]
}

export function packingSubjectKey(subject: unknown): string {
  return String(subject || '').trim()
}

export function isItemDismissed(
  prefs: PackingPreferencesMap,
  subjectKey: string,
  item: string,
): boolean {
  return (prefs[subjectKey]?.dismissed ?? []).includes(item)
}

export function mergeDismissedItem(
  prefs: PackingPreferencesMap,
  subjectKey: string,
  item: string,
): PackingPreferencesMap {
  const prev = prefs[subjectKey] ?? { items: [], dismissed: [] }
  const dismissed = [...new Set([...(prev.dismissed ?? []), item])]
  return { ...prefs, [subjectKey]: { ...prev, dismissed } }
}

export function mergeManualItem(
  prefs: PackingPreferencesMap,
  subjectKey: string,
  item: string,
): PackingPreferencesMap {
  const prev = prefs[subjectKey] ?? { items: [], dismissed: [] }
  const items = [...new Set([...(prev.items ?? []), item])]
  return { ...prefs, [subjectKey]: { items, dismissed: prev.dismissed ?? [] } }
}
