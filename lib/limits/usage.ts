import { isProWhitelistedEmail } from '@/lib/auth/proWhitelist'
import { getServiceSupabase } from '@/lib/supabase/service'

export const FREE_LIMITS = {
  hanzi_decode: 3,
  weekly_report_share: 0,
  patrol: 1,
  one_tap: 5,
  treehouse_message: 10,
} as const

export type LimitFeature = keyof typeof FREE_LIMITS

function todayUtcYmd(): string {
  return new Date().toISOString().split('T')[0]
}

async function getUserEmail(userId: string): Promise<string | null> {
  const supabase = getServiceSupabase()
  const { data, error } = await supabase.auth.admin.getUserById(userId)
  if (error) return null
  return data?.user?.email ?? null
}

/** Pro：白名单 / subscriptions / family_profile.is_pro */
export async function resolveIsPro(
  userId: string,
  email?: string | null,
): Promise<boolean> {
  const resolvedEmail = email ?? (await getUserEmail(userId))
  if (isProWhitelistedEmail(resolvedEmail)) return true

  const supabase = getServiceSupabase()
  const [{ data: sub }, { data: profile }] = await Promise.all([
    supabase
      .from('subscriptions')
      .select('status, plan')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('family_profile')
      .select('is_pro')
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  return (
    (sub?.plan === 'pro' &&
      (sub?.status === 'active' || sub?.status === 'trialing')) ||
    profile?.is_pro === true
  )
}

export async function checkLimit(
  userId: string,
  feature: string,
  email?: string | null,
): Promise<{ allowed: boolean; remaining: number; is_pro: boolean }> {
  const isPro = await resolveIsPro(userId, email)
  if (isPro) {
    return { allowed: true, remaining: 999, is_pro: true }
  }

  const limitKey = feature as LimitFeature
  const limit = FREE_LIMITS[limitKey] ?? 3
  const today = todayUtcYmd()
  const supabase = getServiceSupabase()

  const { count } = await supabase
    .from('analytics_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('event_type', `${feature}_used`)
    .gte('created_at', today)

  const used = count || 0
  const remaining = Math.max(0, limit - used)

  return {
    allowed: remaining > 0,
    remaining,
    is_pro: false,
  }
}

export async function recordUsage(userId: string, feature: string): Promise<void> {
  const supabase = getServiceSupabase()
  await supabase.from('analytics_events').insert({
    user_id: userId,
    event_type: `${feature}_used`,
    page: '/api/limits',
    session_id: 'limit_check',
  })
}

export async function assertCanAddChild(
  userId: string,
  email?: string | null,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const isPro = await resolveIsPro(userId, email)
  if (isPro) return { ok: true }

  const supabase = getServiceSupabase()
  const { count } = await supabase
    .from('children')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if ((count ?? 0) >= 1) {
    return {
      ok: false,
      message: '免费版最多添加1个孩子，升级Pro解锁无限孩子档案',
    }
  }
  return { ok: true }
}
