export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin/assertAdmin'
import { getAdminSupabase } from '@/lib/admin/supabase'

export async function GET(req: NextRequest) {
  const { error } = await assertAdmin(req)
  if (error) return error

  const supabase = getAdminSupabase()

  const { data: users, error: listError } = await supabase
    .from('family_profile')
    .select('user_id, member_name, resident_city, is_pro, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 })
  }

  const userIds = (users || []).map((u) => u.user_id).filter(Boolean) as string[]
  const childCountMap: Record<string, number> = {}

  if (userIds.length > 0) {
    const { data: childCounts } = await supabase.from('children').select('user_id').in('user_id', userIds)
    childCounts?.forEach((c) => {
      if (c.user_id) childCountMap[c.user_id] = (childCountMap[c.user_id] || 0) + 1
    })
  }

  return NextResponse.json({
    users: (users || []).map((u) => ({
      ...u,
      child_count: childCountMap[u.user_id] || 0,
    })),
  })
}
