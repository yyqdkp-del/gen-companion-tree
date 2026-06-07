export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin/assertAdmin'
import { getAdminSupabase } from '@/lib/admin/supabase'
import { formatAuthEmail } from '@/lib/admin/formatUserEmail'

async function fetchAuthEmails(
  supabase: ReturnType<typeof getAdminSupabase>,
  userIds: string[],
): Promise<Record<string, string | null>> {
  const map: Record<string, string | null> = {}
  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await supabase.auth.admin.getUserById(id)
      map[id] = data.user?.email ?? null
    }),
  )
  return map
}

export async function GET(req: NextRequest) {
  const { error } = await assertAdmin(req)
  if (error) return error

  const supabase = getAdminSupabase()

  const { data: users, error: listError } = await supabase
    .from('family_profile')
    .select('user_id, member_name, resident_city, is_pro, email, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 })
  }

  const userIds = (users || []).map((u) => u.user_id).filter(Boolean) as string[]
  const childCountMap: Record<string, number> = {}
  const authEmailMap = userIds.length > 0 ? await fetchAuthEmails(supabase, userIds) : {}

  if (userIds.length > 0) {
    const { data: childCounts } = await supabase.from('children').select('user_id').in('user_id', userIds)
    childCounts?.forEach((c) => {
      if (c.user_id) childCountMap[c.user_id] = (childCountMap[c.user_id] || 0) + 1
    })
  }

  return NextResponse.json({
    users: (users || []).map((u) => {
      const auth_email = authEmailMap[u.user_id] ?? null
      return {
        ...u,
        auth_email,
        auth_email_label: formatAuthEmail(auth_email),
        child_count: childCountMap[u.user_id] || 0,
      }
    }),
  })
}
