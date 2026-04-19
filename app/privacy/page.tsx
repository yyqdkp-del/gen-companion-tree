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
    title: '我们收集什么',
    content: `根·陪伴收集您主动提供的信息，包括：家庭成员资料（姓名、护照、签证信息）、孩子的健康与学习记录、您通过日安输入的生活事项、以及登录账号信息（Google、LINE 或邮箱）。

我们不会在您不知情的情况下收集任何信息。`,
  },
  {
    title: '我们如何使用信息',
    content: `您的信息仅用于：为您生成智能待办和行动建议、自动填写常用表格（如 TM.7 签证申请）、向您发送相关提醒、以及改善产品体验。

我们不会将您的个人信息出售给任何第三方。`,
  },
  {
    title: 'AI 与数据处理',
    content: `根·陪伴使用 Claude（Anthropic）、Grok（xAI）等 AI 服务处理您的输入。您的数据会被发送至这些服务进行分析，但不会被用于训练这些模型（除非您在注册时明确同意 AI 训练用途）。

所有 AI 处理结果仅对您可见。`,
  },
  {
    title: '数据存储与安全',
    content: `您的数据存储于 Supabase 托管的安全数据库，位于新加坡数据中心。所有传输均通过 HTTPS 加密。我们实施行级安全策略（RLS），确保您只能访问自己的数据。

我们会定期进行安全审查。`,
  },
  {
    title: '您的权利',
    content: `您随时可以：查看和导出您的所有数据、修改或删除任何记录、撤回对 AI 训练的授权、注销账号并永久删除所有数据。

如需行使上述权利，请通过应用内联系我们。`,
  },
  {
    title: '第三方服务',
    content: `我们使用以下第三方服务：Supabase（数据存储）、Anthropic Claude（AI 分析）、xAI Grok（实时搜索）、Google（登录与日历）、LINE（登录）、Vercel（服务托管）。

每项服务均有其独立的隐私政策。`,
  },
  {
    title: '儿童隐私',
    content: `根·陪伴专为家长设计，不直接向儿童收集数据。家长可以为孩子录入信息，这些信息受与家长账号相同的保护政策约束。

13 岁以下儿童不得直接使用本服务。`,
  },
  {
    title: '政策更新',
    content: `我们可能不定期更新本政策。重大变更时，我们会通过应用内通知告知您。继续使用服务视为您接受更新后的政策。

本政策最后更新：2025年1月。`,
  },
]

export default function PrivacyPage() {
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
        <span style={{ fontSize: 16, fontWeight: 700, color: THEME.navy, letterSpacing: '0.05em' }}>隐私政策</span>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px 0' }}>
        {/* 标题区 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 36, textAlign: 'center' }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>🌿</div>
          <h1 style={{ fontSize: 28, fontWeight: 100, color: THEME.navy, margin: '0 0 8px', letterSpacing: '0.1em' }}>隐私政策</h1>
          <p style={{ fontSize: 13, color: THEME.muted, margin: 0, lineHeight: 1.8 }}>
            根·陪伴 · Privacy Policy<br />
            我们认真对待您的隐私，这是我们的承诺
          </p>
        </motion.div>

        {/* 政策条款 */}
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

        {/* 联系方式 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          style={{ marginTop: 24, textAlign: 'center', padding: '20px', borderRadius: 20, background: 'rgba(176,141,87,0.08)', border: '1px solid rgba(176,141,87,0.2)' }}
        >
          <div style={{ fontSize: 13, color: THEME.gold, fontWeight: 700, marginBottom: 6 }}>有疑问？联系我们</div>
          <div style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.8 }}>
            如有隐私相关问题，请通过日安对话告诉根<br />
            我们承诺在 48 小时内回复
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
