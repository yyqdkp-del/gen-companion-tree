'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { useApp } from '@/app/context/AppContext'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'
import { track } from '@/lib/analytics/track'

interface OnboardingProps {
  onComplete: () => void
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1)
  const [childName, setChildName] = useState('')
  const [childAge, setChildAge] = useState('')
  const [childEmoji, setChildEmoji] = useState('🌟')
  const [schoolName, setSchoolName] = useState('')
  const [firstTodo, setFirstTodo] = useState('')
  const [loading, setLoading] = useState(false)
  const { sync } = useApp()

  const EMOJIS = ['🦁', '🐼', '🐯', '🦊', '🐸', '🌟', '⭐', '🦋', '🐬', '🦄']
  const TOTAL_STEPS = 5

  async function handleAddChild() {
    if (!childName) return
    setLoading(true)
    try {
      await fetchWithAuth('/api/children', {
        method: 'POST',
        body: JSON.stringify({
          name: childName,
          emoji: childEmoji,
          grade: childAge ? `${childAge}岁` : undefined,
          school_name: schoolName || undefined,
        }),
      })
      await sync()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddTodo() {
    if (!firstTodo) return
    setLoading(true)
    try {
      await fetchWithAuth('/api/rian/process', {
        method: 'POST',
        body: JSON.stringify({
          content: firstTodo,
          input_type: 'text',
        }),
      })
      await sync()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function trackStep(currentStep: number) {
    await track({
      event_type: 'onboarding_step',
      page: '/',
      meta: { step: currentStep },
    })
  }

  async function goToStep(nextStep: number) {
    await trackStep(step)
    setStep(nextStep)
  }

  async function handleComplete() {
    localStorage.setItem('onboarding_completed', 'true')
    await track({
      event_type: 'onboarding_completed',
      page: '/',
      meta: {
        has_child: !!childName,
        has_todo: !!firstTodo,
      },
    })
    onComplete()
  }

  const progress = (step / TOTAL_STEPS) * 100

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#fbf9f6',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 20px',
      overflowY: 'auto',
    }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{
          height: 4,
          background: '#ebe8e2',
          borderRadius: 2,
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: '#8ca88d',
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }} />
        </div>
        <div style={{
          marginTop: 8,
          fontSize: 12,
          color: 'var(--color-text-secondary, rgba(0,0,0,0.5))',
          textAlign: 'right',
        }}>
          {step} / {TOTAL_STEPS}
        </div>
      </div>

      <div style={{ flex: 1 }}>
        {step === 1 && (
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <div style={{ fontSize: 80, marginBottom: 24 }}>🌳</div>
            <h1 style={{
              fontFamily: "'Noto Serif SC', serif",
              fontWeight: 300,
              fontSize: 28,
              letterSpacing: '0.03em',
              marginBottom: 12,
              color: '#1e293b',
            }}>
              你好，欢迎来到根陪伴
            </h1>
            <p style={{
              fontSize: 16,
              color: 'var(--color-text-secondary, rgba(0,0,0,0.55))',
              lineHeight: 1.7,
              marginBottom: 40,
            }}>
              专为海外华人家庭打造的根<br />
              帮你管理家庭事务，陪伴孩子成长
            </p>
            <button
              onClick={() => void goToStep(2)}
              style={primaryButtonStyle}
            >
              开始设置（约1分钟）
            </button>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 500, marginBottom: 8 }}>
              你的孩子叫什么名字？
            </h2>
            <p style={{
              fontSize: 14,
              color: 'var(--color-text-secondary, rgba(0,0,0,0.55))',
              marginBottom: 32,
            }}>
              添加孩子档案，让根更了解你的家庭
            </p>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary, rgba(0,0,0,0.55))', marginBottom: 8 }}>
                选一个头像
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => setChildEmoji(e)}
                    style={{
                      width: 44,
                      height: 44,
                      fontSize: 24,
                      border: childEmoji === e
                        ? '2px solid #8ca88d'
                        : '2px solid var(--color-border-tertiary, rgba(0,0,0,0.08))',
                      borderRadius: 10,
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <input
              placeholder="孩子的昵称 *"
              value={childName}
              onChange={e => setChildName(e.target.value)}
              style={inputStyle}
            />

            <input
              placeholder="年龄"
              value={childAge}
              onChange={e => setChildAge(e.target.value)}
              type="number"
              style={inputStyle}
            />

            <input
              placeholder="学校名称（可选）"
              value={schoolName}
              onChange={e => setSchoolName(e.target.value)}
              style={{ ...inputStyle, marginBottom: 32 }}
            />

            <button
              onClick={async () => {
                if (childName) await handleAddChild()
                await goToStep(3)
              }}
              disabled={loading || !childName}
              style={{
                ...primaryButtonStyle,
                background: childName ? '#5c7a5e' : '#ebe8e2',
                cursor: childName ? 'pointer' : 'default',
                marginBottom: 12,
              }}
            >
              {loading ? '添加中...' : '下一步'}
            </button>

            <button onClick={() => void goToStep(3)} style={skipButtonStyle}>
              跳过
            </button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 500, marginBottom: 8 }}>
              今天有什么需要记住的？
            </h2>
            <p style={{
              fontSize: 14,
              color: 'var(--color-text-secondary, rgba(0,0,0,0.55))',
              marginBottom: 24,
            }}>
              说出一件事，根来帮你整理成待办
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {['学校通知', '医疗预约', '课外活动', '家庭事务'].map(tag => (
                <button
                  key={tag}
                  onClick={() => setFirstTodo(tag + '：')}
                  style={{
                    padding: '6px 14px',
                    border: '1.5px solid var(--color-border-tertiary, rgba(0,0,0,0.08))',
                    borderRadius: 20,
                    background: 'transparent',
                    fontSize: 13,
                    color: 'var(--color-text-secondary, rgba(0,0,0,0.55))',
                    cursor: 'pointer',
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>

            <textarea
              placeholder="例如：周五要交游泳班报名费 $80，截止周四..."
              value={firstTodo}
              onChange={e => setFirstTodo(e.target.value)}
              rows={4}
              style={{
                ...inputStyle,
                height: 132,
                marginBottom: 32,
                resize: 'none',
                lineHeight: 1.6,
              }}
            />

            <button
              onClick={async () => {
                if (firstTodo) await handleAddTodo()
                await goToStep(4)
              }}
              disabled={loading}
              style={{
                ...primaryButtonStyle,
                background: firstTodo ? '#5c7a5e' : '#ebe8e2',
                cursor: firstTodo ? 'pointer' : 'default',
                marginBottom: 12,
              }}
            >
              {loading ? '添加中...' : '添加待办'}
            </button>

            <button onClick={() => void goToStep(4)} style={skipButtonStyle}>
              跳过
            </button>
          </div>
        )}

        {step === 4 && (
          <div style={{ textAlign: 'center', paddingTop: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 24 }}>✨</div>
            <h2 style={{ fontSize: 22, fontWeight: 500, marginBottom: 32 }}>
              你的专属根已就绪
            </h2>

            {[
              { icon: '🌸', title: '木棉树洞', desc: '深夜有人陪，说说心里话' },
              { icon: '📚', title: '汉字解码', desc: '让中文学习变得有趣' },
              { icon: '⚡', title: '一键办事', desc: '繁琐的事务交给根' },
              { icon: '🏫', title: '学校通知', desc: '自动解析英文邮件' },
            ].map(card => (
              <div
                key={card.title}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '16px',
                  background: 'var(--color-background-secondary, rgba(255,255,255,0.65))',
                  borderRadius: 12,
                  marginBottom: 12,
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 32 }}>{card.icon}</span>
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 2 }}>{card.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-text-secondary, rgba(0,0,0,0.55))' }}>
                    {card.desc}
                  </div>
                </div>
              </div>
            ))}

            <button onClick={() => void goToStep(5)} style={{ ...primaryButtonStyle, marginTop: 20 }}>
              太好了！
            </button>
          </div>
        )}

        {step === 5 && (
          <div style={{ textAlign: 'center', paddingTop: 60 }}>
            <div style={{ fontSize: 80, marginBottom: 24 }}>🌳</div>
            <h2 style={{ fontSize: 24, fontWeight: 500, marginBottom: 16 }}>
              一切准备就绪！
            </h2>
            <p style={{
              fontSize: 16,
              color: 'var(--color-text-secondary, rgba(0,0,0,0.55))',
              lineHeight: 1.8,
              marginBottom: 48,
              padding: '0 20px',
              whiteSpace: 'pre-line',
            }}>
              {childName
                ? `${childName}的根已经种下了 🌱\n让我们一起守护这棵家庭树`
                : '你的根已经种下了 🌱\n让我们一起守护这棵家庭树'
              }
            </p>
            <button onClick={handleComplete} style={{ ...primaryButtonStyle, padding: '18px', borderRadius: 14, fontSize: 18 }}>
              进入根陪伴 →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '14px 16px',
  border: '1.5px solid var(--color-border-tertiary, rgba(0,0,0,0.08))',
  borderRadius: 10,
  fontSize: 16,
  marginBottom: 12,
  background: 'var(--color-background-secondary, rgba(255,255,255,0.65))',
  color: 'var(--color-text-primary, #233)',
  boxSizing: 'border-box',
}

const primaryButtonStyle: CSSProperties = {
  width: '100%',
  padding: '16px',
  background: '#5c7a5e',
  color: 'white',
  border: 'none',
  borderRadius: 28,
  fontSize: 16,
  fontWeight: 500,
  cursor: 'pointer',
  letterSpacing: '0.03em',
}

const skipButtonStyle: CSSProperties = {
  width: '100%',
  padding: '14px',
  background: 'transparent',
  color: 'var(--color-text-secondary, rgba(0,0,0,0.55))',
  border: 'none',
  fontSize: 15,
  cursor: 'pointer',
}
