'use client'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

const THEME = {
  bg: '#fbf9f6',
  text: '#2C3E50',
  gold: '#8a7355',
  accent: '#a46355',
  navy: '#2d322f',
  muted: '#6B8BAA',
}

const SUPPORT_EMAIL = 'yyqdkp@gmail.com'

const sections = [
  {
    title: '30天无忧退款',
    content: `自购买之日起 30 天内，如您对根·陪伴的服务不满意，可申请全额退款，无需任何理由。

我们希望您是真心喜欢根，而不是被困在一份不合适的订阅里。`,
  },
  {
    title: '适用范围',
    content: `本政策适用于通过官方渠道直接付费购买的所有订阅计划，包括月度订阅与年度订阅。

通过第三方应用商店（如 App Store、Google Play）订阅的用户，请按对应平台的退款政策提交申请。`,
  },
  {
    title: '如何申请退款',
    content: `发送邮件至 ${SUPPORT_EMAIL}，注明：
• 您的注册邮箱或账号 ID
• 订阅类型与购买日期
• 申请退款的原因（可选，帮助我们改进）

我们会在 3 个工作日内审核并回复处理结果。`,
  },
  {
    title: '退款时效',
    content: `审核通过后，退款将原路退回至您的支付账户。

不同支付渠道到账时间略有差异，通常为 5–15 个工作日，请耐心等待。`,
  },
  {
    title: '退款后的账号',
    content: `退款完成后，您的付费功能将在当期周期结束时停用，免费基础功能仍可继续使用。

您的数据不会因为退款被自动删除；如需注销账号并删除数据，请另行联系我们。`,
  },
  {
    title: '不予退款的情况',
    content: `以下情况无法办理退款：
• 购买已超过 30 天
• 通过限时促销、礼品卡或第三方代购获取的订阅
• 存在违反《服务条款》的滥用行为

如有疑问，欢迎随时与我们沟通，我们会按个案审慎处理。`,
  },
]

export default function RefundPage() {
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
        <span style={{ fontSize: 16, fontWeight: 700, color: THEME.navy, letterSpacing: '0.05em' }}>退款政策</span>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px 0' }}>
        {/* 标题区 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 36, textAlign: 'center' }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>💧</div>
          <h1 style={{ fontSize: 28, fontWeight: 100, color: THEME.navy, margin: '0 0 8px', letterSpacing: '0.1em' }}>退款政策</h1>
          <p style={{ fontSize: 13, color: THEME.muted, margin: 0, lineHeight: 1.8 }}>
            根·陪伴 · Refund Policy<br />
            30 天内可申请全额退款，简单透明
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
          style={{ marginTop: 24, textAlign: 'center', padding: '20px', borderRadius: 20, background: 'rgba(164,99,85,0.08)', border: '1px solid rgba(164,99,85,0.2)' }}
        >
          <div style={{ fontSize: 13, color: THEME.gold, fontWeight: 700, marginBottom: 6 }}>提交退款申请</div>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('根·陪伴退款申请')}`}
            style={{ fontSize: 14, color: THEME.accent, fontWeight: 600, textDecoration: 'none', letterSpacing: '0.02em' }}
          >
            {SUPPORT_EMAIL}
          </a>
          <div style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.8, marginTop: 6 }}>
            我们承诺在 3 个工作日内审核回复
          </div>
        </motion.div>

        {/* 返回按钮 */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => router.back()}
          style={{
            width: '100%', marginTop: 24, padding: '14px',
            borderRadius: 16, border: 'none',
            background: THEME.accent, color: '#fff',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          返回
        </motion.button>
      </div>
    </main>
  )
}
