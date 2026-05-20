'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'
import { motion } from 'framer-motion'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'

type TabKey = 'overview' | 'hanzi' | 'moments' | 'achievements'

const GLASS: React.CSSProperties = {
  background: 'rgba(255,255,255,0.82)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 4px 20px rgba(45,50,47,0.04)',
}

export default function ChildProfilePage() {
  const router = useRouter()
  const params = useParams()
  const childId = params.id as string

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  useEffect(() => {
    if (!childId) return
    let cancelled = false
    setLoading(true)
    setError('')
    fetchWithAuth(`/api/children/${childId}/profile`)
      .then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error || '加载失败')
        if (!cancelled) setData(json)
      })
      .catch((e) => {
        if (!cancelled) {
          logOrAlertNetworkError(e)
          setError((e as Error).message || '加载失败')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [childId])

  if (loading) {
    return (
      <div style={{
        minHeight: '100dvh',
        background: '#fbf9f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            fontSize: 14,
            color: 'rgba(45,50,47,0.4)',
            letterSpacing: '0.2em',
            fontFamily: 'sans-serif',
          }}
        >
          载入中...
        </motion.div>
      </div>
    )
  }

  if (error || !data?.child) {
    return (
      <main style={{
        minHeight: '100dvh',
        backgroundColor: '#fbf9f6',
        padding: 'max(env(safe-area-inset-top), 44px) 20px 40px',
        textAlign: 'center',
        fontFamily: 'sans-serif',
      }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', fontSize: 14, color: '#a46355', cursor: 'pointer', marginBottom: 24 }}
        >
          ← 返回
        </button>
        <p style={{ color: 'rgba(45,50,47,0.5)' }}>{error || '未找到孩子档案'}</p>
      </main>
    )
  }

  const child = data.child
  const schoolLabel = child.school_name || child.school || ''

  return (
    <main style={{
      minHeight: '100dvh',
      backgroundColor: '#fbf9f6',
      backgroundImage: `
        radial-gradient(at 90% 10%, rgba(245,214,209,0.2) 0px, transparent 50%),
        radial-gradient(at 10% 90%, rgba(217,230,218,0.15) 0px, transparent 50%)
      `,
      paddingBottom: 'calc(80px + max(env(safe-area-inset-bottom), 20px))',
    }}>

      <div style={{
        background: 'rgba(251,249,246,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(45,50,47,0.06)',
        padding: `max(env(safe-area-inset-top), 12px) 16px 12px`,
        display: 'flex',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <button
          type="button"
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', marginRight: 12, color: '#2d322f' }}
        >
          ←
        </button>
        <div>
          <div style={{
            fontSize: 9,
            letterSpacing: 4,
            color: '#a46355',
            fontFamily: 'sans-serif',
            textTransform: 'uppercase',
            marginBottom: 2,
          }}>
            成长档案
          </div>
          <div style={{
            fontSize: 16,
            fontWeight: 500,
            color: '#2d322f',
            fontFamily: "'Noto Serif SC', serif",
          }}>
            {child?.emoji || '🌟'} {child?.name}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '16px 14px' }}>

        <div style={{
          ...GLASS,
          borderRadius: 22,
          padding: '24px 20px',
          marginBottom: 14,
          boxShadow: '0 8px 32px rgba(45,50,47,0.05)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 64, marginBottom: 12 }}>{child?.emoji || '🌟'}</div>
          <div style={{
            fontSize: 22,
            fontWeight: 500,
            color: '#2d322f',
            fontFamily: "'Noto Serif SC', serif",
            marginBottom: 4,
          }}>
            {child?.name}
          </div>
          <div style={{
            fontSize: 13,
            color: 'rgba(45,50,47,0.5)',
            fontFamily: 'sans-serif',
            marginBottom: child?.bio ? 12 : 16,
          }}>
            {child?.grade || ''}{schoolLabel ? ` · ${schoolLabel}` : ''}
          </div>
          {child?.bio && (
            <p style={{
              fontSize: 13,
              color: 'rgba(45,50,47,0.55)',
              lineHeight: 1.8,
              fontFamily: 'sans-serif',
              marginBottom: 16,
              textAlign: 'left',
            }}>
              {child.bio}
            </p>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            {[
              { label: '汉字', value: data?.hanzi_count || 0, emoji: '📚' },
              { label: '成就', value: data?.achievements?.length || 0, emoji: '🏆' },
              { label: '时刻', value: data?.moments?.length || 0, emoji: '📸' },
            ].map((stat) => (
              <div key={stat.label} style={{
                flex: 1,
                background: 'rgba(164,99,85,0.05)',
                borderRadius: 14,
                padding: '12px 8px',
                border: '1px solid rgba(164,99,85,0.1)',
              }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{stat.emoji}</div>
                <div style={{
                  fontSize: 20,
                  fontWeight: 600,
                  color: '#a46355',
                  fontFamily: "'Montserrat', sans-serif",
                }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(45,50,47,0.5)', fontFamily: 'sans-serif' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: 4,
          background: 'rgba(45,50,47,0.05)',
          borderRadius: 24,
          padding: '4px',
          marginBottom: 14,
        }}>
          {([
            { key: 'overview', label: '总览' },
            { key: 'hanzi', label: '汉字' },
            { key: 'moments', label: '时刻' },
            { key: 'achievements', label: '成就' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: '8px 4px',
                borderRadius: 20,
                border: 'none',
                background: activeTab === tab.key ? '#a46355' : 'transparent',
                color: activeTab === tab.key ? '#ffffff' : 'rgba(45,50,47,0.5)',
                fontSize: 13,
                fontFamily: "'Noto Serif SC', serif",
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {data?.hanzi_list?.length > 0 && (
              <div style={{ ...GLASS, borderRadius: 18, padding: '16px 18px', marginBottom: 12 }}>
                <div style={{
                  fontSize: 10,
                  letterSpacing: 3,
                  color: '#a46355',
                  marginBottom: 12,
                  fontFamily: 'sans-serif',
                  textTransform: 'uppercase',
                }}>
                  📚 已学汉字
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {data.hanzi_list.map((char: string, i: number) => (
                    <span key={`${char}-${i}`} style={{
                      padding: '6px 12px',
                      borderRadius: 12,
                      background: 'rgba(164,99,85,0.06)',
                      border: '1px solid rgba(164,99,85,0.1)',
                      fontSize: 18,
                      fontFamily: "'Noto Serif SC', serif",
                      color: '#2d322f',
                    }}>
                      {char}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data?.achievements?.slice(0, 3).map((achievement: { id: string; emoji?: string; title: string; achieved_at?: string }) => (
              <div key={achievement.id} style={{
                background: 'rgba(255,255,255,0.7)',
                borderRadius: 16,
                padding: '14px 16px',
                marginBottom: 10,
                border: '1px solid rgba(255,255,255,0.6)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <span style={{ fontSize: 28 }}>{achievement.emoji || '⭐'}</span>
                <div>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#2d322f',
                    fontFamily: "'Noto Serif SC', serif",
                  }}>
                    {achievement.title}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'rgba(45,50,47,0.5)',
                    fontFamily: 'sans-serif',
                    marginTop: 2,
                  }}>
                    {achievement.achieved_at}
                  </div>
                </div>
              </div>
            ))}

            {(!data?.hanzi_list?.length && !data?.achievements?.length) && (
              <motion.div style={{ ...GLASS, borderRadius: 18, padding: '32px 20px', textAlign: 'center', color: 'rgba(45,50,47,0.45)', fontSize: 14, fontFamily: 'sans-serif' }}>
                开始汉字学习后，档案会自动记录成长轨迹
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === 'hanzi' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ ...GLASS, borderRadius: 18, padding: '20px' }}>
              <div style={{
                fontSize: 10,
                letterSpacing: 3,
                color: '#a46355',
                marginBottom: 16,
                fontFamily: 'sans-serif',
                textTransform: 'uppercase',
              }}>
                共学了 {data?.hanzi_count || 0} 个汉字
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {data?.hanzi_list?.map((char: string, i: number) => (
                  <button
                    key={`${char}-${i}`}
                    type="button"
                    onClick={() => router.push(`/learn?char=${encodeURIComponent(char)}`)}
                    style={{
                      width: 52,
                      height: 52,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(164,99,85,0.06)',
                      border: '1px solid rgba(164,99,85,0.12)',
                      borderRadius: 12,
                      fontSize: 24,
                      fontFamily: "'Noto Serif SC', serif",
                      color: '#2d322f',
                      cursor: 'pointer',
                    }}
                  >
                    {char}
                  </button>
                ))}
              </div>
              {(!data?.hanzi_list || data.hanzi_list.length === 0) && (
                <div style={{
                  textAlign: 'center',
                  padding: '32px 0',
                  color: 'rgba(45,50,47,0.4)',
                  fontSize: 14,
                  fontFamily: 'sans-serif',
                }}>
                  还没有学习记录
                  <br />
                  <button
                    type="button"
                    onClick={() => router.push('/learn')}
                    style={{
                      marginTop: 12,
                      background: 'none',
                      border: 'none',
                      color: '#a46355',
                      fontSize: 12,
                      cursor: 'pointer',
                      fontFamily: "'Noto Serif SC', serif",
                    }}
                  >
                    去汉字解码器学第一个字 →
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'moments' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {(!data?.moments || data.moments.length === 0) && (
              <div style={{
                ...GLASS,
                borderRadius: 18,
                padding: '40px 20px',
                textAlign: 'center',
                color: 'rgba(45,50,47,0.4)',
                fontSize: 14,
                fontFamily: 'sans-serif',
              }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
                还没有成长时刻
                <br />
                <span style={{ fontSize: 12 }}>记录第一个珍贵瞬间</span>
              </div>
            )}
            {data?.moments?.map((moment: {
              id: string
              photo_url?: string
              title: string
              content?: string
              moment_date?: string
            }) => (
              <div key={moment.id} style={{
                ...GLASS,
                borderRadius: 18,
                padding: '16px 18px',
                marginBottom: 12,
              }}>
                {moment.photo_url && (
                  <img
                    src={moment.photo_url}
                    alt={moment.title}
                    style={{
                      width: '100%',
                      borderRadius: 12,
                      marginBottom: 12,
                      objectFit: 'cover',
                      maxHeight: 200,
                    }}
                  />
                )}
                <div style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: '#2d322f',
                  fontFamily: "'Noto Serif SC', serif",
                  marginBottom: 6,
                }}>
                  {moment.title}
                </div>
                {moment.content && (
                  <div style={{
                    fontSize: 13,
                    color: 'rgba(45,50,47,0.6)',
                    lineHeight: 1.7,
                    fontFamily: 'sans-serif',
                  }}>
                    {moment.content}
                  </div>
                )}
                <motion.div style={{
                  fontSize: 11,
                  color: 'rgba(45,50,47,0.4)',
                  marginTop: 8,
                  fontFamily: 'sans-serif',
                }}>
                  {moment.moment_date}
                </motion.div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'achievements' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            {(!data?.achievements || data.achievements.length === 0) && (
              <div style={{
                ...GLASS,
                borderRadius: 18,
                padding: '40px 20px',
                textAlign: 'center',
                color: 'rgba(45,50,47,0.4)',
                fontSize: 14,
                fontFamily: 'sans-serif',
              }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
                还没有成就
                <br />
                <span style={{ fontSize: 12 }}>完成学习任务解锁第一个成就</span>
              </div>
            )}
            {data?.achievements?.map((achievement: {
              id: string
              emoji?: string
              title: string
              description?: string
              achieved_at?: string
            }) => (
              <div key={achievement.id} style={{
                ...GLASS,
                borderRadius: 16,
                padding: '16px 18px',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}>
                <span style={{ fontSize: 36 }}>{achievement.emoji || '⭐'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: '#2d322f',
                    fontFamily: "'Noto Serif SC', serif",
                  }}>
                    {achievement.title}
                  </div>
                  {achievement.description && (
                    <div style={{
                      fontSize: 12,
                      color: 'rgba(45,50,47,0.5)',
                      marginTop: 3,
                      fontFamily: 'sans-serif',
                    }}>
                      {achievement.description}
                    </div>
                  )}
                  <div style={{
                    fontSize: 11,
                    color: 'rgba(45,50,47,0.4)',
                    marginTop: 4,
                    fontFamily: 'sans-serif',
                  }}>
                    {achievement.achieved_at}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

      </div>
    </main>
  )
}
