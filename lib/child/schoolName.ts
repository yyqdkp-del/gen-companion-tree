/** 读取学校名的唯一入口 */
export function getSchoolName(child: { school_name?: string | null; school?: string | null } | null | undefined): string {
  if (!child) return ''
  return String(child.school_name || child.school || '').trim()
}

/** 写入学校名的唯一入口（双写兼容，不再写 school_short） */
export function buildSchoolNameUpdate(schoolName: string): {
  school_name: string
  school: string
} {
  const name = schoolName.trim()
  return {
    school_name: name,
    school: name,
  }
}
