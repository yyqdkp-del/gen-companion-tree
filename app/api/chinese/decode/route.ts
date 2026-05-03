export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
  return new NextResponse(null, { status: 200, headers: CORS })
}

export async function POST(req: NextRequest) {
  const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
  const {
    mode, char, sentence, keywords,
    child_name, child_grade, child_level,
    location_scene,
    // 修复四：接收地理围栏数据，不再写死清迈
    geofence,
  } = await req.json()

  // 修复四：优先用围栏城市，其次用 location_scene，最后降级
  const scene = geofence?.city
    ? `${geofence.city}华人陪读家庭`
    : location_scene || '清迈华人陪读家庭'

  const childCtx = child_name
    ? `孩子叫${child_name}，${child_grade || ''}，当前中文水平${child_level || 'R2'}。`
    : `海外华人家庭孩子，当前中文水平${child_level || 'R2'}。`

  const callClaude = async (prompt: string) => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: `你是专业的海外华人中文教育专家。只输出JSON对象，不加任何其他文字，不用代码块包裹，直接{开头}结尾。所有内容必须完整填写，不能有空字符串或null。mom_script必须口语化温暖，像邻居大姐说话，不像教科书。禁止出现「这个字的意思是」这类教科书句式。`,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await response.json()
    if (data.error) throw new Error(data.error.message)
    const raw = (data?.content?.[0]?.text || '').trim()
    const m = raw.match(/\{[\s\S]*\}/)
    if (!m) throw new Error('生成格式错误，请重试')
    return JSON.parse(m[0])
  }

  try {

    // ══ 模式一：汉字拆解（逻辑不动） ══
    if (mode === 'hanzi') {
      if (!char) return NextResponse.json({ error: '请输入汉字' }, { status: 400, headers: CORS })

      try {
        const { data: cached } = await supabase
          .from('hanzi_library')
          .select('*')
          .eq('char', char)
          .single()

        if (cached) {
          await supabase.from('hanzi_library')
            .update({ hit_count: (cached.hit_count || 1) + 1 })
            .eq('id', cached.id)
          return NextResponse.json(cached, { headers: CORS })
        }
      } catch {}

      const prompt = `
你是台湾字理教学法专家和英文自然拼读（Phonics）教学顾问。
${childCtx}
当前家庭所在地：${scene}。

为汉字「${char}」生成完整教学数据。

规则：
1. mom_script必须口语化温暖，像妈妈睡前讲故事的语气，绝不出现「这个字的意思是」这类教科书句式
2. english_link必须找到真实的英文Phonics规律或单词家族做类比
3. scene必须结合「${scene}」的真实生活场景，禁止套用其他城市
4. 所有字段必须填写，不能为空
   liushu.type必须从六书中准确选一个
   liushu.child_explain必须完全避免学术术语，用故事和生活举例
   liushu.mom_explain必须包含学术术语、形旁声旁分析、同类字对比
5. family只选孩子最常用的词

返回JSON，直接{开头}结尾，不加任何其他文字：

{
  "char": "${char}",
  "pinyin": "拼音",
  "traditional": "繁体字（若与简体相同则填相同）",
  "traditional_explain": "繁体字的字理说明：繁体字比简体字多了什么部件？为什么繁体字更能看出字的来源？如果和简体相同则说明这个字没有被简化，本身就保留了完整字理。例如：「費」比「费」多了一个「貝」部清晰可见，直接看出和钱有关。",
  "meaning": "核心含义（10字以内）",
  "level": "R1到R5选一个",
  "liushu": {
    "type": "象形|指事|会意|形声|转注|假借",
    "child_explain": "孩子版解释：绝对不用「意义」「声音」「声旁」「形旁」等术语。规则：①先用孩子最熟悉的字举例（妈、爸、河等）②用「听起来像」代替声旁，用「告诉你和什么有关」代替形旁③结合孩子生活场景④最后一句口诀让孩子能复述。例如：你知道「妈」里面为什么有个马吗？因为「妈」听起来像「马」的声音！「破」也一样，里面的「皮」是因为读音像，里面的「石」告诉你这件事和石头有关。石头被打碎了就是破！",
    "mom_explain": "妈妈版解释：使用正确学术术语。包含：①六书类型定义②形旁和声旁的学术分析③历史演变依据④与同类字的对比（列2-3个同类字）。例如：「破」为形声字。形旁「石」（石部）表义，指与石头、坚硬物体相关；声旁「皮」表音（pí/pō音近）。形声字是汉字最主要的造字法，占现代汉字85%以上。同类形声字：清（氵+青）、请（讠+青）、情（忄+青）。"
  },
  "parts": [
    { "char": "部件字", "name": "部件名称", "image": "这个部件像什么画面（一句话）" }
  ],
  "evolution": "从甲骨文到现在的造字逻辑，用最简单的话说清楚，让孩子听懂",
  "english_link": "用英文Phonics逻辑类比：就像英文___开头的词都有___感，有___的汉字都跟___有关。举具体英文单词例子",
  "family": ["含这个字的最常用词1", "词2", "词3", "词4", "词5"],
  "story": "这个字背后的文化故事，100字以内，适合孩子听",
  "scene": "结合${scene}生活场景的具体使用例子，让孩子感到熟悉",
  "mom_script": "妈妈今天这样说：用口语化的话引导孩子理解这个字，包含：①字的画面解释 ②一个互动问题 ③一个造句邀请。总共3-4句话，温暖自然",
  "mom_questions": [
    "第一个引导问题（让孩子观察字的结构）",
    "第二个问题（连接生活经验）",
    "第三个问题（鼓励造句或联想）"
  ],
  "chengyu": "一个与这个字相关、孩子最容易用到的成语",
  "cy_story": "这个成语的意思和妈妈可以怎么用（口语化，一两句话）",
  "extension": ["延伸词1：释义", "延伸词2：释义", "延伸词3：释义"],
  "phonics_bridge": "一句话总结：这个字的部件逻辑，就像英文的___规律"
}`

      const result = await callClaude(prompt)

      try {
        await supabase.from('hanzi_library').insert({
          char:              result.char || char,
          pinyin:            result.pinyin,
          traditional:       result.traditional,
          meaning_short:     result.meaning,
          parts:             result.parts,
          evolution:         result.evolution,
          phonics_bridge:    result.phonics_bridge,
          family:            result.family,
          mom_script:        result.mom_script,
          scene_universal:   result.scene,
          chengyu_connected: { chengyu: result.chengyu, story: result.cy_story },
          level_tag:         result.level,
          result:            result,
          created_by:        'ai',
          hit_count:         1,
        })
      } catch (e) {
        console.warn('hanzi_library insert failed:', e)
      }

      return NextResponse.json(result, { headers: CORS })

    // ══ 模式二：成语解读 ══
    } else if (mode === 'chengyu') {
      if (!sentence) return NextResponse.json({ error: '请输入内容' }, { status: 400, headers: CORS })

      // 修复二：先读缓存（原来只写不读）
      // 用孩子说的话做关键词模糊匹配不现实，
      // 所以先生成成语，再用成语本身查库
      // 分两步：① 轻量调用只生成成语名 ② 查库命中则返回，未命中再完整生成
      let chengyu_name = ''
      try {
        const quickRes = await callClaude(`
孩子说了：「${sentence}」
只返回最贴切的中文成语（4个字），JSON格式：{"chengyu":"____"}`)
        chengyu_name = quickRes?.chengyu || ''
      } catch {}

      if (chengyu_name) {
        try {
          const { data: cached } = await supabase
            .from('chengyu_library')
            .select('*')
            .eq('chengyu', chengyu_name)
            .single()

          if (cached?.result) {
            await supabase.from('chengyu_library')
              .update({ hit_count: (cached.hit_count || 1) + 1 })
              .eq('id', cached.id)
            // 把孩子的原话注入缓存结果再返回
            return NextResponse.json(
              { ...cached.result, original: sentence },
              { headers: CORS }
            )
          }
        } catch {}
      }

      // 未命中缓存，完整生成
      const prompt = `
你是海外华人中文教育专家，精通中英习语对照教学。
${childCtx}
当前家庭所在地：${scene}。

孩子用中文或英文说了：「${sentence}」，帮我找到最贴切的成语并教给他。

规则：
1. mom_script必须口语化，像妈妈跟孩子聊天，先连接孩子的英文习语经验，再引出成语
2. english_idiom必须是孩子在英语学校真实会接触的习语
3. 成语必须是孩子这个年龄段能用到的

返回JSON，直接{开头}结尾，不加任何其他文字：

{
  "original": "孩子说的原话",
  "chengyu": "对应的中文成语（4个字）",
  "pinyin": "成语拼音",
  "meaning": "成语含义（简洁）",
  "level": "画面级或感受级或智慧级",
  "english_idiom": "对应的英语习语",
  "idiom_comparison": "一句话说清楚中英习语的异同",
  "origin": "成语来源（历史/寓言/诗经/自然，一句话）",
  "image": "闭眼能想象的画面描述",
  "story": "成语背后的故事，100字以内，适合孩子听",
  "local_scene": "结合${scene}生活场景的具体例子",
  "mom_script": "妈妈今天这样说：先连接孩子的英文习语经验，再引出成语，最后给孩子一句话今天就能用。口语化，3-4句话",
  "child_use": "孩子今天可以用这个成语说的一句话（场景化）",
  "similar_chengyu": ["相关成语1", "相关成语2"]
}`

      const result = await callClaude(prompt)

      try {
        const { data: existing } = await supabase
          .from('chengyu_library')
          .select('id, hit_count')
          .eq('chengyu', result.chengyu)
          .single()

        if (existing) {
          await supabase.from('chengyu_library')
            .update({ hit_count: (existing.hit_count || 1) + 1 })
            .eq('id', existing.id)
        } else {
          await supabase.from('chengyu_library').insert({
            chengyu:   result.chengyu,
            pinyin:    result.pinyin,
            meaning:   result.meaning,
            result:    result,
            hit_count: 1,
          })
        }
      } catch (e) {
        console.warn('chengyu_library upsert failed:', e)
      }

      return NextResponse.json(result, { headers: CORS })

    // ══ 模式三：文化句 ══
    } else if (mode === 'writing') {
      if (!sentence) return NextResponse.json({ error: '请输入内容' }, { status: 400, headers: CORS })

      const kw = keywords ? `本周学的字/词：${keywords}` : ''
      const prompt = `
你是海外华人中文写作教育专家，精通把孩子的口语升华为书面中文，
并用古诗词让孩子感受到「原来古人和我想的一样」。
${childCtx}
当前家庭所在地：${scene}。
${kw}

孩子口述了：「${sentence}」

任务：
1. 把孩子的口述升华为书面中文
2. 找到一句能产生「原来古人也这样」共鸣的文化句
3. 给妈妈一段台词，让这次经历永远刻在孩子心里

规则：
1. draft必须保留孩子的感受，适合孩子年龄
2. cultural_sentence必须是真实的古诗词或名句
3. overseas_connection必须连接海外孩子的特殊感受
4. mom_script分三步：先念文化句→再解释→再连接孩子经历

返回JSON，直接{开头}结尾，不加任何其他文字：

{
  "original": "孩子的原话",
  "draft": "书面化版本（保留孩子视角，100-150字）",
  "keywords_used": ["用到的本周词汇1", "词汇2"],
  "fill_blanks": "填空练习版本：把关键词替换成___，让孩子填回去",
  "cultural_sentence": "一句相关的古诗词或文化名句",
  "cultural_author": "作者和朝代",
  "cultural_meaning": "这句话的白话意思（简洁）",
  "ancient_connection": "古人和孩子感受了同样的事——用一句话说清楚这个连接",
  "overseas_connection": "这句话对在${scene}生活的孩子特别有意义，因为___",
  "mom_script": "妈妈三步台词：①先说：「妈妈给你一句话：[cultural_sentence]」②解释这句话③连接孩子今天的经历。口语化，温暖，不超过5句话",
  "tips": "妈妈小贴士：这次对话可以延伸的方向",
  "emotion_tag": "这次经历的情感标签（如：好奇/喜悦/思念/勇气）"
}`

      const result = await callClaude(prompt)

      // 修复三：存入 chinese_sessions，不丢失历史
      try {
        // 从请求头取 user_id（前端调用时带 Authorization）
        const authHeader = req.headers.get('authorization') || ''
        const { data: { user } } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        )
        if (user?.id) {
          await supabase.from('chinese_sessions').insert({
            user_id:        user.id,
            input_text:     sentence,
            input_type:     'writing',
            result:         result,
            location_scene: scene,
            learned_at:     new Date().toISOString(),
          })
        }
      } catch (e) {
        console.warn('writing session insert failed:', e)
      }

      return NextResponse.json(result, { headers: CORS })

    } else {
      return NextResponse.json({ error: '未知模式' }, { status: 400, headers: CORS })
    }

  } catch (e: any) {
    return NextResponse.json({ error: e.message || '服务器错误' }, { status: 500, headers: CORS })
  }
}
