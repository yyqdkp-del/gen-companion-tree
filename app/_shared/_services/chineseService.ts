import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

// ── 查汉字缓存 ──────────────────────────
export async function fetchHanziCache(char: string): Promise<any | null> {
  const { data } = await supabase
    .from('hanzi_library')
    .select('*')
    .eq('char', char)
    .maybeSingle()
  if (!data?.result) return null
  return typeof data.result === 'string' ? JSON.parse(data.result) : data.result
}

// ── 查智能推荐字 ──────────────────────────
export async function fetchSmartChars(
  level: string,
  learnedChars: string[],
): Promise<string[]> {
  const fallbacks: Record<string, string[]> = {
    R1: ['山', '水', '日', '月', '火', '木', '人', '口', '手', '心'],
    R2: ['明', '休', '家', '笑', '飞', '鱼', '花', '草', '风', '云'],
    R3: ['森', '闻', '静', '思', '望', '梦', '情', '意', '声', '影'],
    R4: ['觉', '察', '缘', '德', '境', '智', '善', '悟', '慧', '诚'],
    R5: ['蕴', '醇', '澄', '廉', '谦', '逸', '渊', '翰', '璞', '骥'],
  }
  try {
    const { data } = await supabase
      .from('hanzi_library')
      .select('char')
      .eq('level_tag', level)
      .not('char', 'in', `(${learnedChars.slice(0, 50).join(',') || 'x'})`)
      .order('hit_count', { ascending: false })
      .limit(10)
    if (data?.length) return data.map((d: any) => d.char)
  } catch {}
  return fallbacks[level] || fallbacks.R2
}

// ── 查学习历史 ──────────────────────────
export async function fetchLearnedItems(
  userId: string,
  childId?: string,
): Promise<any[]> {
  let query = supabase
    .from('chinese_sessions')
    .select('input_type, result, learned_at')
    .eq('user_id', userId)
  if (childId) query = query.eq('child_id', childId)
  const { data } = await query
    .order('learned_at', { ascending: false })
    .limit(200)
  if (!data) return []
  return data.filter((s: any) => s.result).map((s: any) => {
    const r = typeof s.result === 'string' ? JSON.parse(s.result) : s.result
    return {
      char: r?.char, chengyu: r?.chengyu,
      type: s.input_type, mastery: 75,
      learned_at: s.learned_at,
    }
  })
}

// ── 保存学习记录 ──────────────────────────
export async function saveSession(
  userId: string,
  childId: string | null,
  input: string,
  type: string,
  result: any,
  locationScene: string,
): Promise<void> {
  await Promise.all([
    supabase.from('chinese_sessions').insert({
      user_id: userId, child_id: childId || null,
      input_text: input, input_type: type,
      result, location_scene: locationScene,
      learned_at: new Date().toISOString(),
    }),
    supabase.from('family_learning_dna').upsert({
      user_id: userId, last_input_type: type,
      last_learned_at: new Date().toISOString(),
      preferred_scene: locationScene,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' }),
  ])
}
