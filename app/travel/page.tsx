'use client'

import { useCallback, useEffect, useState, type ReactNode, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Plane, Loader, MapPin, Calendar as CalIcon, Bookmark } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'
import { THEME } from '@/app/_shared/_constants/theme'
import { NAV_HEIGHT_CSS } from '@/app/_shared/_constants/layout'
import { useApp } from '@/app/context/AppContext'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'

const supabase = createClient()

const TRAVEL_PAGE_BG: CSSProperties = {
  backgroundColor: '#fbf9f6',
  backgroundImage: `
    radial-gradient(at 80% 20%, rgba(228,237,228,0.3) 0px, transparent 50%),
    radial-gradient(at 20% 80%, rgba(245,214,209,0.2) 0px, transparent 50%)
  `,
}

const GLASS_CARD: CSSProperties = {
  background: 'rgba(255,255,255,0.8)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderRadius: 18,
  border: '1px solid rgba(255,255,255,0.6)',
  boxShadow: '0 4px 20px rgba(45,50,47,0.05)',
}

const INK = '#2d322f'
const ACCENT = '#a46355'
const GOLD = '#8a7355'

const PREF_OPTIONS = [
  { id: '亲子友好', label: '亲子友好' },
  { id: '文化探索', label: '文化探索' },
  { id: '自然风光', label: '自然风光' },
  { id: '美食之旅', label: '美食之旅' },
  { id: '购物天堂', label: '购物天堂' },
  { id: '轻松度假', label: '轻松度假' },
]

const BUDGET_OPTIONS = [
  { value: '', label: '不限' },
  { value: '<$500', label: '< $500' },
  { value: '$500-1000', label: '$500 – 1000' },
  { value: '$1000-2000', label: '$1000 – 2000' },
  { value: '>$2000', label: '> $2000' },
]

function ageFromBirth(birthdate: string | null | undefined): number | null {
  if (!birthdate) return null
  const b = new Date(birthdate)
  if (Number.isNaN(+b)) return null
  const t = new Date()
  let a = t.getFullYear() - b.getFullYear()
  const m = t.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--
  return a
}

export default function TravelPage() {
  const router = useRouter()
  const { kids, addTempTodo } = useApp()
  const [tab, setTab] = useState<'plan' | 'history'>('plan')
  const [departure, setDeparture] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [adults, setAdults] = useState(2)
  const [childrenCount, setChildrenCount] = useState(0)
  const [budget, setBudget] = useState('')
  const [prefs, setPrefs] = useState<string[]>([])
  const [planning, setPlanning] = useState(false)
  const [plan, setPlan] = useState<any>(null)
  const [flightLoading, setFlightLoading] = useState(false)
  const [flightResult, setFlightResult] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [savingPlan, setSavingPlan] = useState(false)

  useEffect(() => {
    const n = kids?.length ?? 0
    setChildrenCount(n)
  }, [kids])

  const loadProfileCity = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return
    const { data } = await supabase.from('family_profile').select('resident_city,resident_city_custom').eq('user_id', session.user.id).maybeSingle()
    if (data?.resident_city) {
      const raw = String(data.resident_city)
      const dep = raw === 'other' && data.resident_city_custom
        ? String(data.resident_city_custom)
        : raw
      setDeparture(dep)
    }
  }, [])

  const loadHistory = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return
    const { data } = await supabase.from('travel_plans').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(30)
    setHistory(data || [])
  }, [])

  useEffect(() => { void loadProfileCity() }, [loadProfileCity])
  useEffect(() => { if (tab === 'history') void loadHistory() }, [tab, loadHistory])

  const togglePref = (id: string) => {
    setPrefs(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  const childAges = (kids || []).map(k => ageFromBirth(k.birthdate)).filter((a): a is number => a != null)

  const submitPlan = async () => {
    if (!destination.trim() || !startDate || !endDate) {
      alert('请填写目的地与起止日期')
      return
    }
    setPlanning(true)
    setPlan(null)
    setFlightResult(null)
    try {
      const res = await fetchWithAuth('/api/travel/plan', {
        method: 'POST',
        body: JSON.stringify({
          destination: destination.trim(),
          departure: departure.trim(),
          start_date: startDate,
          end_date: endDate,
          travelers: { adults, children: childrenCount },
          budget: budget || undefined,
          preferences: prefs,
          child_ages: childAges,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) {
        alert(json.error || '规划失败')
        return
      }
      setPlan(json.plan)
    } catch (e) {
      logOrAlertNetworkError(e)
      alert('网络错误')
    }
    setPlanning(false)
  }

  const fetchFlights = async () => {
    if (!departure.trim() || !destination.trim() || !startDate) {
      alert('请先填写出发地、目的地与出发日期')
      return
    }
    setFlightLoading(true)
    setFlightResult(null)
    try {
      const res = await fetchWithAuth('/api/travel/flights', {
        method: 'POST',
        body: JSON.stringify({
          origin: departure.trim(),
          destination: destination.trim(),
          depart_date: startDate,
          return_date: endDate || undefined,
          passengers: { adults, children: childrenCount },
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.ok) {
        alert(json.error || '机票分析失败')
        return
      }
      setFlightResult(json)
    } catch (e) {
      logOrAlertNetworkError(e)
    }
    setFlightLoading(false)
  }

  const addTodosFromPlan = () => {
    ;['办签证/核对证件', '预订机票', '购买旅行保险'].forEach(t => addTempTodo(t))
  }

  const savePlanToDb = async () => {
    if (!plan) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) {
      router.push('/auth')
      return
    }
    setSavingPlan(true)
    try {
      const { error } = await supabase.from('travel_plans').insert({
        user_id: session.user.id,
        destination: destination.trim(),
        departure: departure.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
        travelers: { adults, children: childrenCount, preferences: prefs, budget },
        plan,
        status: 'planned',
        updated_at: new Date().toISOString(),
      })
      if (error) throw error
      alert('已保存到历史行程')
      void loadHistory()
    } catch (e) {
      logOrAlertNetworkError(e)
      alert('保存失败')
    }
    setSavingPlan(false)
  }

  const Field = ({ label, children }: { label: ReactNode; children: ReactNode }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  )

  return (
    <main style={{ minHeight: '100dvh', ...TRAVEL_PAGE_BG, paddingBottom: NAV_HEIGHT_CSS, fontFamily: "'Noto Sans SC', sans-serif" }}>
      <header style={{
        position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 16px', ...GLASS_CARD, borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none',
      }}>
        <motion.button type="button" whileTap={{ scale: 0.92 }} onClick={() => router.back()}
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: INK }}>
          <ArrowLeft size={22} />
        </motion.button>
        <Plane size={22} color={INK} />
        <span style={{ fontSize: 17, fontWeight: 700, color: INK }}>旅行规划</span>
      </header>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '12px 16px 32px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['plan', 'history'] as const).map(t => (
            <motion.button
              key={t}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px', borderRadius: 12, border: 'none', fontWeight: 600, cursor: 'pointer',
                background: tab === t ? ACCENT : 'rgba(255,255,255,0.5)', color: tab === t ? '#fff' : THEME.text,
              }}>
              {t === 'plan' ? '规划行程' : '历史行程'}
            </motion.button>
          ))}
        </div>

        {tab === 'history' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {history.length === 0 ? (
              <div style={{ color: THEME.muted, textAlign: 'center', padding: 32 }}>暂无保存的行程</div>
            ) : (
              history.map((h: any) => (
                <div key={h.id} style={{ ...GLASS_CARD, padding: 14, fontSize: 14 }}>
                  <div style={{ fontWeight: 700, color: INK }}>{h.destination}</div>
                  <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
                    {h.start_date} → {h.end_date} · {h.status}
                  </div>
                  {h.plan?.summary && (
                    <div style={{ marginTop: 8, fontSize: 13, color: THEME.text, lineHeight: 1.6 }}>{h.plan.summary}</div>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <>
            <Field label={<><MapPin size={14} style={{ verticalAlign: 'middle' }} /> 出发地</>}>
              <input value={departure} onChange={e => setDeparture(e.target.value)}
                style={inputStyle} placeholder="城市" />
            </Field>
            <Field label="目的地">
              <input value={destination} onChange={e => setDestination(e.target.value)} style={inputStyle} placeholder="国家/城市" />
            </Field>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Field label={<><CalIcon size={14} style={{ verticalAlign: 'middle' }} /> 出发日期</>}>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="返回日期">
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
                </Field>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <Field label="大人">
                  <input type="number" min={1} value={adults} onChange={e => setAdults(Number(e.target.value) || 1)} style={inputStyle} />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="小孩">
                  <input type="number" min={0} value={childrenCount} onChange={e => setChildrenCount(Number(e.target.value) || 0)} style={inputStyle} />
                </Field>
              </div>
            </div>
            <Field label="预算（可选）">
              <select value={budget} onChange={e => setBudget(e.target.value)} style={inputStyle}>
                {BUDGET_OPTIONS.map(o => <option key={o.value || 'any'} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
            <Field label="旅行偏好">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PREF_OPTIONS.map(p => (
                  <motion.button
                    key={p.id}
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => togglePref(p.id)}
                    style={{
                      padding: '8px 12px', borderRadius: 20, border: prefs.includes(p.id) ? `2px solid ${GOLD}` : '1px solid rgba(0,0,0,0.1)',
                      background: prefs.includes(p.id) ? 'rgba(164,99,85,0.12)' : 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer',
                    }}>
                    {p.label}
                  </motion.button>
                ))}
              </div>
            </Field>

            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              disabled={planning}
              onClick={() => void submitPlan()}
              style={{
                width: '100%', padding: 14, borderRadius: 14, border: 'none', background: ACCENT, color: '#fff',
                fontWeight: 700, fontSize: 15, cursor: planning ? 'wait' : 'pointer', marginTop: 8,
              }}>
              {planning ? '根正在规划你的专属行程…' : '生成行程方案'}
            </motion.button>

            {planning && (
              <div style={{ textAlign: 'center', padding: 20, color: THEME.muted, display: 'flex', justifyContent: 'center' }}>
                <Loader size={26} style={{ animation: 'tspin 0.85s linear infinite' }} />
                <style>{`@keyframes tspin { to { transform: rotate(360deg) } }`}</style>
              </div>
            )}

            {plan && !planning && (
              <div style={{ marginTop: 20, ...GLASS_CARD, padding: 16 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: INK, marginBottom: 8 }}>行程概述</div>
                <p style={{ fontSize: 14, lineHeight: 1.75, color: THEME.text }}>{plan.summary}</p>
                {plan.duration && <div style={{ fontSize: 13, color: THEME.muted, marginTop: 6 }}>{plan.duration}</div>}
                {Array.isArray(plan.highlights) && plan.highlights.length > 0 && (
                  <ul style={{ marginTop: 10, paddingLeft: 18, fontSize: 14, color: THEME.text }}>
                    {plan.highlights.map((h: string, i: number) => <li key={i} style={{ marginBottom: 4 }}>{h}</li>)}
                  </ul>
                )}

                {Array.isArray(plan.itinerary) && plan.itinerary.length > 0 && (
                  <>
                    <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginTop: 18 }}>每日安排</div>
                    {plan.itinerary.map((d: any) => (
                      <div key={d.day} style={{ marginTop: 12, padding: 12, ...GLASS_CARD }}>
                        <div style={{ fontWeight: 700 }}>第{d.day}天 {d.date ? `· ${d.date}` : ''} {d.title ? `· ${d.title}` : ''}</div>
                        <div style={{ fontSize: 13, marginTop: 6 }}>上午：{d.morning}</div>
                        <div style={{ fontSize: 13 }}>下午：{d.afternoon}</div>
                        <div style={{ fontSize: 13 }}>晚上：{d.evening}</div>
                        {d.tips && <div style={{ fontSize: 12, color: GOLD, marginTop: 6 }}>提示：{d.tips}</div>}
                      </div>
                    ))}
                  </>
                )}

                {plan.packing_list && (
                  <>
                    <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginTop: 18 }}>打包清单</div>
                    {['documents', 'clothing', 'kids', 'others'].map(key => {
                      const arr = plan.packing_list[key]
                      if (!Array.isArray(arr) || !arr.length) return null
                      return (
                        <div key={key} style={{ marginTop: 8 }}>
                          <div style={{ fontSize: 12, color: THEME.muted }}>{key}</div>
                          <ul style={{ paddingLeft: 18, fontSize: 13 }}>{arr.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul>
                        </div>
                      )
                    })}
                  </>
                )}

                {plan.budget_breakdown && (
                  <div style={{ marginTop: 16, fontSize: 13, lineHeight: 1.7, color: THEME.text }}>
                    <div style={{ fontWeight: 700, color: INK, marginBottom: 6 }}>预算参考</div>
                    {Object.entries(plan.budget_breakdown).map(([k, v]) => (
                      <div key={k}>{k}: {String(v)}</div>
                    ))}
                  </div>
                )}

                {plan.useful_info && (
                  <div style={{ marginTop: 16, fontSize: 13, lineHeight: 1.7, color: THEME.text }}>
                    <div style={{ fontWeight: 700, color: INK, marginBottom: 6 }}>实用信息</div>
                    {Object.entries(plan.useful_info).map(([k, v]) => (
                      <div key={k} style={{ marginBottom: 6 }}><strong>{k}</strong>：{String(v)}</div>
                    ))}
                  </div>
                )}

                {plan.kid_friendly_tips && (
                  <div style={{ marginTop: 14, fontSize: 13, color: THEME.text, background: 'rgba(164,99,85,0.08)', padding: 12, borderRadius: 12 }}>
                    <strong>亲子提示</strong>：{plan.kid_friendly_tips}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}>
                  <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={addTodosFromPlan}
                    style={{ padding: 12, borderRadius: 12, border: `1px solid ${GOLD}`, background: 'rgba(164,99,85,0.1)', fontWeight: 600, cursor: 'pointer' }}>
                    加入待办（签证 / 机票 / 保险）
                  </motion.button>
                  <motion.button type="button" whileTap={{ scale: 0.98 }} disabled={savingPlan} onClick={() => void savePlanToDb()}
                    style={{ padding: 12, borderRadius: 12, border: 'none', background: ACCENT, color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Bookmark size={16} /> {savingPlan ? '保存中…' : '保存行程'}
                  </motion.button>
                </div>

                <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: INK, marginBottom: 10 }}>机票方案</div>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.98 }}
                    disabled={flightLoading}
                    onClick={() => void fetchFlights()}
                    style={{
                      width: '100%', padding: 12, borderRadius: 12, border: '1px solid rgba(0,0,0,0.12)',
                      background: 'rgba(255,255,255,0.85)', fontWeight: 600, cursor: flightLoading ? 'wait' : 'pointer', marginBottom: 12,
                    }}>
                    {flightLoading ? '正在分析机票…' : '获取机票方案（比价与策略）'}
                  </motion.button>

                  {flightResult && (
                    <div style={{ fontSize: 13, lineHeight: 1.65, color: THEME.text }}>
                      {Array.isArray(flightResult.search_links) && flightResult.search_links.length > 0 && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontWeight: 700, marginBottom: 6 }}>比价平台</div>
                          {flightResult.search_links.map((l: any, i: number) => (
                            <div key={i} style={{ marginBottom: 8 }}>
                              <a href={l.url} target="_blank" rel="noreferrer" style={{ color: INK, fontWeight: 600 }}>{l.platform}</a>
                              <div style={{ fontSize: 12, color: THEME.muted }}>{l.description}</div>
                              {l.tip && <div style={{ fontSize: 12 }}>{l.tip}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                      {Array.isArray(flightResult.airlines) && flightResult.airlines.length > 0 && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontWeight: 700, marginBottom: 6 }}>航司参考</div>
                          {flightResult.airlines.map((a: any, i: number) => (
                            <div key={i} style={{ marginBottom: 8, padding: 10, ...GLASS_CARD }}>
                              <strong>{a.name}</strong> · {a.type} · {a.duration} · {a.price_range}
                              {a.kid_friendly ? ' · 亲子友好' : ''}
                              <div style={{ fontSize: 12 }}>优：{a.pros} / 劣：{a.cons}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {flightResult.booking_strategy && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontWeight: 700, marginBottom: 6 }}>购票策略</div>
                          {Object.entries(flightResult.booking_strategy).map(([k, v]) => (
                            <div key={k}>{k}: {String(v)}</div>
                          ))}
                        </div>
                      )}
                      {Array.isArray(flightResult.money_saving_tips) && (
                        <ul style={{ paddingLeft: 18, marginBottom: 14 }}>
                          {flightResult.money_saving_tips.map((t: string, i: number) => <li key={i}>{t}</li>)}
                        </ul>
                      )}
                      {flightResult.with_kids_tips && <div style={{ marginBottom: 8 }}><strong>带娃乘机</strong>：{flightResult.with_kids_tips}</div>}
                      {flightResult.baggage_tips && <div style={{ marginBottom: 8 }}><strong>行李</strong>：{flightResult.baggage_tips}</div>}
                      {Array.isArray(flightResult.comparison_table) && flightResult.comparison_table.length > 0 && (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                            <tbody>
                              {flightResult.comparison_table.map((row: any, i: number) => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                  <td style={{ padding: '6px 4px', verticalAlign: 'top' }}>{row.option}</td>
                                  <td style={{ padding: '6px 4px', verticalAlign: 'top' }}>{row.airline}</td>
                                  <td style={{ padding: '6px 4px', verticalAlign: 'top' }}>{row.price}</td>
                                  <td style={{ padding: '6px 4px', verticalAlign: 'top' }}>{row.duration}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

const inputStyle: CSSProperties = {
  width: '100%', padding: '11px 12px', borderRadius: 12,
  border: '1.5px solid rgba(164,99,85,0.15)',
  background: '#f7f4ee', fontSize: 14, color: THEME.text, boxSizing: 'border-box',
}
