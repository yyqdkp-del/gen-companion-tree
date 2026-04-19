'use client'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

const THEME = {
  bg: 'linear-gradient(180deg, #A7D7D9 0%, #D9A7B4 100%)',
  text: '#2C3E50',
  gold: '#B08D57',
  navy: '#1A3C5E',
  muted: '#6B8BAA',
}

const sections = [
  {
    title: '服务说明',
    content: `根·陪伴是一款为清迈陪读家庭设计的 AI 生活管家服务。我们通过 AI 技术帮助您整理待办事项、生成行动建议、提醒重要事项。

本服务目前处于测试阶段，功能持续迭代中。`,
  },
  {
    title: '使用条件',
    content: `使用根·陪伴，您需要：年满 18 周岁、提供真实有效的账号信息、仅将服务用于合法的个人家庭管理目的。

您不得将服务用于任何违法、欺诈或侵害他人权益的活动。`,
  },
  {
    title: 'AI 建议免责',
    content: `根·陪伴提供的所有 AI 建议（包括签证办理、医疗建议、法律事项等）仅供参考，不构成专业意见。

重要决策请咨询相关专业人士。我们不对依据 AI 建议做出的决定所产生的后果承担责任。`,
  },
  {
    title: '实时信息准确性',
    content: `我们通过 Grok 实时搜索提供清迈本地信息（如营业时间、政策、价格）。这些信息可能存在延迟或错误。

在前往任何地点或办理任何手续前，请通过官方渠道确认最新信息。`,
  },
  {
    title: '账号与数据',
    content: `您的账号和数据归您所有。您可以随时导出或删除全部数据。

注销账号后，我们将在 30 天内从服务器永久删除您的所有数据（法律要求保留的除外）。`,
  },
  {
    title: '服务变更与中断',
    content: `我们可能随时修改、暂停或终止部分或全部服务功能。重大变更会提前通过应用内通知告知您。

测试期间，服务可能存在不稳定情况，感谢您的理解与支持。`,
  },
  {
    title: '知识产权',
    content: `根·陪伴的产品设计、代码、品牌标识等归开发团队所有。您输入的内容和数据归您所有。

AI 生成的建议内容您可自由使用，无需标注来源。`,
  },
  {
    title: '争议解决',
    content: `如因使用本服务产生争议，双方应首先通过友好协商解决。

本服务条款适用中华人民共和国法律（香港特别行政区除外），争议提交相关法院管辖。`,
  },
]

export default function TermsPage() {
  const router = useRouter()

  return (
    <main style={{
      minHeight: '100dvh',
      background: THEME.bg,
      fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif",
      padding: '0 0 60px',
    }}>
      {/* 顶部导航 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(167,215,217,0.85)',
        backdropFilter: 'blur(20px)',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '1px solid rgba(255,255,255,0.3)',
      }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: THEME.navy }}
        >
          <ArrowLeft size={20} />
        </motion.button>
        <span style={{ fontSize: 16, fontWeight: 700, color: THEME.navy, letterSpacing: '0.05em' }}>服务条款</span>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px 0' }}>
        {/* 标题区 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 36, textAlign: 'center' }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>📜</div>
          <h1 style={{ fontSize: 28, fontWeight: 100, color: THEME.navy, margin: '0 0 8px', letterSpacing: '0.1em' }}>服务条款</h1>
          <p style={{ fontSize: 13, color: THEME.muted, margin: 0, lineHeight: 1.8 }}>
            根·陪伴 · Terms of Service<br />
            使用前请阅读，我们尽量写得简单易懂
          </p>
        </motion.div>

        {/* 条款内容 */}
        {sections.map((sec, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
            style={{
              marginBottom: 16,
              background: 'rgba(255,255,255,0.55)',
              backdropFilter: 'blur(20px)',
              borderRadius: 20,
              padding: '20px 22px',
              border: '1px solid rgba(255,255,255,0.7)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{
              fontSize: 13, fontWeight: 700, color: THEME.gold,
              letterSpacing: '0.1em', marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 11, opacity: 0.5 }}>0{i + 1}</span>
              {sec.title}
            </div>
            <div style={{ fontSize: 14, color: THEME.text, lineHeight: 1.9, whiteSpace: 'pre-line' }}>
              {sec.content}
            </div>
          </motion.div>
        ))}

        {/* 底部提示 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{ marginTop: 24, textAlign: 'center', padding: '20px', borderRadius: 20, background: 'rgba(26,60,94,0.06)', border: '1px solid rgba(26,60,94,0.1)' }}
        >
          <div style={{ fontSize: 13, color: THEME.navy, fontWeight: 700, marginBottom: 6 }}>感谢您选择根·陪伴</div>
          <div style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.8 }}>
            继续使用本服务，即表示您同意上述条款<br />
            如有疑问，请通过日安联系我们
          </div>
        </motion.div>

        {/* 返回按钮 */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => router.back()}
          style={{
            width: '100%', marginTop: 24, padding: '14px',
            borderRadius: 16, border: 'none',
            background: THEME.navy, color: '#fff',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          返回
        </motion.button>
      </div>
    </main>
  )
}
