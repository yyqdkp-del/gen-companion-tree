export function isLineFakeEmail(email: string | null | undefined): boolean {
  return !!email && /@line\.user$/i.test(email)
}

/** auth.users 注册/登录邮箱 */
export function formatAuthEmail(email: string | null | undefined): string {
  if (!email) return '—'
  if (isLineFakeEmail(email)) return 'LINE 登录'
  return email
}

/** family_profile 资料邮箱 */
export function formatProfileEmail(email: string | null | undefined): string {
  const trimmed = email?.trim()
  return trimmed || '—'
}
