'use client'

import { BookOpen, Camera, FileText, Sparkles } from 'lucide-react'
import { THEME } from '@/app/_shared/_constants/theme'

export default function SchoolPage() {
  return (
    <main style={{
      minHeight: '100vh',
      padding: '56px 20px 140px',
      background: 'linear-gradient(180deg, #FFF8ED 0%, #F5E8D2 52%, #EAD7B8 100%)',
      color: THEME.text,
    }}>
      <section style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderRadius: 999,
          background: 'rgba(176,141,87,0.12)',
          color: THEME.gold,
          fontSize: 12,
          fontWeight: 700,
          marginBottom: 18,
        }}>
          <BookOpen size={15} />
          学校通知整理
        </div>

        <h1 style={{
          margin: '0 0 10px',
          fontSize: 34,
          lineHeight: 1.15,
          letterSpacing: '-0.04em',
          color: THEME.navy,
        }}>
          拍一下学校通知，根来帮你拆成待办和校历。
        </h1>

        <p style={{
          margin: '0 0 26px',
          fontSize: 15,
          lineHeight: 1.8,
          color: THEME.muted,
        }}>
          适合处理学校邮件截图、纸质通知、校历图片、缴费单和活动单。点击底部右侧相机按钮拍照或上传图片，识别完成后会自动进入日安待办、校历和解析历史。
        </p>

        <div style={{
          display: 'grid',
          gap: 12,
        }}>
          {[
            { icon: <Camera size={22} />, title: '拍照识别', desc: '用底部右侧相机按钮拍学校通知或校历。' },
            { icon: <FileText size={22} />, title: '自动拆解', desc: '校历事件进孩子日程，需要妈妈行动的事项进待办。' },
            { icon: <Sparkles size={22} />, title: '留下历史', desc: '解析摘要会记录到处理历史，方便之后回看。' },
          ].map((item) => (
            <div key={item.title} style={{
              display: 'flex',
              gap: 14,
              alignItems: 'flex-start',
              padding: 16,
              borderRadius: 22,
              background: 'rgba(255,255,255,0.58)',
              border: '1px solid rgba(176,141,87,0.16)',
              boxShadow: '0 18px 44px rgba(107,74,35,0.08)',
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 16,
                background: 'rgba(176,141,87,0.12)',
                color: THEME.gold,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {item.icon}
              </div>
              <div>
                <h2 style={{ margin: '2px 0 5px', fontSize: 16, color: THEME.text }}>{item.title}</h2>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: THEME.muted }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
