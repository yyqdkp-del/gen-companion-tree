import type { SupabaseClient } from '@supabase/supabase-js'
import type { CorrelatedInsight } from '@/lib/brain/correlate'

export async function saveCorrelatedInsights(
  db: SupabaseClient,
  userId: string,
  insights: CorrelatedInsight[],
): Promise<number> {
  let saved = 0

  for (const insight of insights) {
    if (insight.urgency !== 'high') continue

    const action_data = {
      source: 'brain',
      urgency: insight.urgency,
      insight_type: insight.type,
      reason: insight.reason,
      suggestedActions: insight.suggestedActions,
      relatedItems: insight.relatedItems,
    }

    const { data: existing } = await db
      .from('hotspot_items')
      .select('id')
      .eq('user_id', userId)
      .eq('title', insight.title)
      .eq('category', 'correlation')
      .neq('status', 'dismissed')
      .maybeSingle()

    const row = {
      user_id: userId,
      title: insight.title,
      summary: insight.reason,
      category: 'correlation',
      urgency: 'urgent',
      action: insight.suggestedActions[0]?.label || null,
      action_available: true,
      action_type: 'brain',
      action_data,
      status: 'unread',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (existing?.id) {
      const { error } = await db.from('hotspot_items').update(row).eq('id', existing.id)
      if (!error) saved++
    } else {
      const { error } = await db.from('hotspot_items').insert(row)
      if (!error) saved++
    }
  }

  return saved
}
