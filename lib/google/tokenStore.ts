import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function saveGoogleToken(
  userId: string,
  service: 'gmail' | 'calendar',
  accessToken: string,
  refreshToken: string | null | undefined,
  expiresAt: Date,
) {
  let refresh = refreshToken
  if (!refresh) {
    const { data } = await supabase
      .from('user_google_tokens')
      .select('refresh_token')
      .eq('user_id', userId)
      .eq('service', service)
      .maybeSingle()
    refresh = data?.refresh_token ?? null
  }
  if (!refresh) {
    throw new Error(
      'Google did not return a refresh_token. Remove app access in Google Account and connect again.',
    )
  }

  await supabase.from('user_google_tokens').upsert(
    {
      user_id: userId,
      service,
      access_token: accessToken,
      refresh_token: refresh,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,service' },
  )
}

export async function getValidAccessToken(
  userId: string,
  service: 'gmail' | 'calendar',
): Promise<string | null> {
  const { data } = await supabase
    .from('user_google_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('service', service)
    .maybeSingle()

  if (!data?.refresh_token) return null

  if (data.expires_at && new Date(data.expires_at) > new Date(Date.now() + 5 * 60 * 1000)) {
    return data.access_token
  }

  const { refreshAccessToken } = await import('./oauth')
  let refreshed: { access_token: string; expires_in: number }
  try {
    refreshed = await refreshAccessToken(data.refresh_token)
  } catch {
    return null
  }

  if (!refreshed.access_token) return null

  const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000)
  await supabase
    .from('user_google_tokens')
    .update({
      access_token: refreshed.access_token,
      expires_at: newExpiry.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('service', service)

  return refreshed.access_token
}
