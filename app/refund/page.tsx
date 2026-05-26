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

const SUPPORT_EMAIL = 'yyqdkp@gmail.com'

const sections = [
  {
    title: '退款承诺',
    content: `自您完成付款之日起 30 天内，无论任何原因，您都可以申请全额退款。

我们希望您只为真正喜欢的服务付费——不喜欢、用不上、感觉不值，都可以退。`,
  },
  {
    title: '适用范围',
    content: `所有付费订阅与一次性增值服务均适用本退款政策，包括但不限于：会员订阅、AI 高级功能包、专属定制服务。

无论您使用了多少次，30 天内都可以全额退款。`,
  },
  {
    title: '如何申请退款',
    content: `请通过邮件联系我们：${SUPPORT_EMAIL}

邮件中请简要说明：
1. 注册时使用的账号（手机号 / 邮箱 / Google ID）
2. 付款时间或订单号(如有)
3. 退款原因(可选，但有助于我们改进)

您也可以通过日安对话告诉根，我们会同步处理。`,
  },
  {
    title: '处理时效',
    content: `我们承诺在收到您的退款申请后 3 个工作日内回复确认。

退款款项将通过原支付渠道原路退还，到账时间一般为 5-10 个工作日(具体取决于您的支付平台)。`,
  },
  {
    title: '不予退款的情形',
    content: `以下情况我们将无法办理退款：超过付款日 30 天、通过欺诈或异常手段获取的订阅、严重违反《服务条款》导致账号被封禁。

除上述情况外，我们承诺不为难、不刁难。`,
  },
  {
    title: '我们的承诺',
    content: `根·陪伴是为家庭温度而生的服务。如果我们没能让您感受到那份温度，您完全有权拿回您的钱。

我们不会用挽留邮件、复杂流程或语言话术让您后悔申请退款。`,
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
          <div style={{ fontSize: 48, marginBottom: 12 }}>💝</div>
          <h1 style={{ fontSize: 28, fontWeight: 100, color: THEME.navy, margin: '0 0 8px', letterSpacing: '0.1em' }}>退款政策</h1>
          <p style={{ fontSize: 13, color: THEME.muted, margin: 0, lineHeight: 1.8 }}>
            根·陪伴 · Refund Policy<br />
            30 天内无理由全额退款，不为难、不刁难
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
          <div style={{ fontSize: 13, color: THEME.gold, fontWeight: 700, marginBottom: 6 }}>申请退款</div>
          <div style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.8, marginBottom: 12 }}>
            发送邮件至下方邮箱，我们会尽快处理
          </div>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('根·陪伴 退款申请')}`}
            style={{
              display: 'inline-block',
              fontSize: 15,
              fontWeight: 700,
              color: THEME.navy,
              textDecoration: 'none',
              padding: '8px 18px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(176,141,87,0.3)',
              letterSpacing: '0.02em',
            }}
          >
            {SUPPORT_EMAIL}
          </a>
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
