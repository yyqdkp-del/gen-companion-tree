export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/getAuthUser'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET(req: NextRequest) {
  const { user, error } = await getAuthUser(req)
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data } = await supabase
    .from('processed_emails')
    .select('id, subject, processed_at, todos_created, events_created, email_type, source, from_email')
    .eq('user_id', user.id)
    .eq('email_type', 'school')
    .order('processed_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ records: data || [] })
}
