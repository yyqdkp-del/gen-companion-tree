/** Map stored school / school_name to schools.id, or "other" if custom. */
export function resolveSchoolId(
  schools: { id: string; name_full: string; name_short: string }[],
  school: string,
  schoolName: string,
): string {
  const names = [school, schoolName].map((s) => s?.trim()).filter(Boolean) as string[]
  if (!names.length) return ''
  for (const s of schools) {
    if (names.some((n) => n === s.name_full || n === s.name_short)) return s.id
  }
  return 'other'
}
