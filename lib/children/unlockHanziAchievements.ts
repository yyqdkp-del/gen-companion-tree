import type { SupabaseClient } from '@supabase/supabase-js'

const HANZI_MILESTONES = [
  { count: 1, emoji: '🌱', title: '第一个汉字', description: '解锁了人生第一个汉字' },
  { count: 10, emoji: '📖', title: '十字成诗', description: '已学会10个汉字' },
  { count: 50, emoji: '🏮', title: '半百识字', description: '已学会50个汉字' },
  { count: 100, emoji: '🐉', title: '百字神童', description: '已学会100个汉字' },
] as const

export function extractHanziFromSessions(
  sessions: { input_text?: string | null; input_type?: string | null; result?: unknown }[] | null,
): string[] {
  const chars: string[] = []
  for (const s of sessions || []) {
    if (s.input_type !== 'hanzi') continue
    let char = (s.input_text || '').trim()
    if (s.result) {
      try {
        const r = typeof s.result === 'string' ? JSON.parse(s.result) : s.result
        if (r && typeof r === 'object' && 'char' in r && typeof (r as { char?: string }).char === 'string') {
          char = (r as { char: string }).char.trim()
        }
      } catch {
        /* use input_text */
      }
    }
    if (char) chars.push(char)
  }
  return [...new Set(chars)]
}

export async function unlockHanziAchievements(
  supabase: SupabaseClient,
  userId: string,
  childId: string,
  hanziCount: number,
): Promise<void> {
  const toUnlock = HANZI_MILESTONES.filter((m) => hanziCount >= m.count)

  for (const achievement of toUnlock) {
    const { data: existing } = await supabase
      .from('child_achievements')
      .select('id')
      .eq('child_id', childId)
      .eq('title', achievement.title)
      .maybeSingle()

    if (!existing) {
      await supabase.from('child_achievements').insert({
        user_id: userId,
        child_id: childId,
        type: 'hanzi',
        title: achievement.title,
        description: achievement.description,
        emoji: achievement.emoji,
        achieved_at: new Date().toISOString().split('T')[0],
      })
    }
  }

  await supabase
    .from('children')
    .update({ total_hanzi: hanziCount })
    .eq('id', childId)
    .eq('user_id', userId)
}
