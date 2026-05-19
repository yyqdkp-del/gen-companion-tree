import { createClient } from '@/lib/supabase/client'

/** JSON + Bearer for authenticated Route Handlers (`getAuthUser`)。复用浏览器端单例 `createClient()`。 */
export async function getJsonAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }
}
