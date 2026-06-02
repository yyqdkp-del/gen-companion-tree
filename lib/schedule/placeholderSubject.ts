/** 课表 subject 占位符（trim + 小写后比较；em dash 等符号原样保留在集合中） */
const PLACEHOLDER_SUBJECT_KEYS = new Set([
  '—',
  '-',
  '/',
  '--',
  '无',
  'none',
  'n/a',
  '',
])

export function isPlaceholderSubject(subject: unknown): boolean {
  const raw = String(subject ?? '').trim()
  if (!raw) return true
  if (PLACEHOLDER_SUBJECT_KEYS.has(raw)) return true
  return PLACEHOLDER_SUBJECT_KEYS.has(raw.toLowerCase())
}
