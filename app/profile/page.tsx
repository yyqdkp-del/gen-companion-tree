'use client'
import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Loader, Save, User, FileText, MapPin, Shield, Mail, Calendar } from 'lucide-react'
import { THEME } from '@/app/_shared/_constants/theme'
import { NAV_HEIGHT_CSS } from '@/app/_shared/_constants/layout'
import { Field, SelectField } from '@/app/_shared/_components/FormField'
import { StepMember }    from './steps/StepMember'
import { StepPassport }  from './steps/StepPassport'
import { StepAddress }   from './steps/StepAddress'
import { StepEmergency } from './steps/StepEmergency'
import { useApp } from '@/app/context/AppContext'
import { logOrAlertNetworkError } from '@/lib/errors/logOrAlertNetworkError'
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth'
import TourGuide, { type TourStep } from '@/app/components/TourGuide'

const supabase = createClient()

const PROFILE_GLASS: React.CSSProperties = {
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

const STEPS = [
  { id: 'member', icon: <User size={18} />, label: '本人信息' },
  { id: 'passport', icon: <FileText size={18} />, label: '护照签证' },
  { id: 'address', icon: <MapPin size={18} />, label: '常用地址' },
  { id: 'emergency', icon: <Shield size={18} />, label: '紧急联系' },
]

const PROFILE_TOUR: TourStep[] = [
  {
    id: 'profile',
    title: '填得越详细，根越懂你',
    desc: '孩子的学校、签证类型、居住城市，这些信息让AI热点和提醒更精准。',
    emoji: '📋',
    position: 'top',
    targetHint: '从基本信息开始填',
  },
  {
    id: 'cards',
    title: '证件与医疗卡随身带',
    desc: '护照到期、签证类型、孩子血型过敏，点击「证件与医疗卡」生成可打印的就诊卡。',
    emoji: '🗂️',
    position: 'center',
  },
]

function ProfileContent() {
  const router = useRouter()
  const { signOut } = useApp()
  const searchParams = useSearchParams()
  const isEdit = searchParams.get('mode') === 'edit'

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [existingId, setExistingId] = useState<string | null>(null)

  const [memberData, setMemberData] = useState({
    member_name: '', member_nationality: '中国', member_role: 'admin',
    phone: '', email: '',
  })
  const [passportData, setPassportData] = useState({
    passport_number: '', passport_expiry: '', passport_issue_place: '',
    passport_issue_date: '', passport_country: '',
    visa_type: '', visa_type_note: '', visa_expiry: '', tm30_number: '',
    insurance_number: '', insurance_company: '', insurance_expiry: '',
  })
  const [addressData, setAddressData] = useState({
    home_address_en: '', home_address_zh: '',
    school_name: '', school_address: '', hospital_name: '',
    resident_city: '', resident_city_custom: '',
  })
  const [emergencyData, setEmergencyData] = useState({
    emergency_name: '', emergency_relation: '', emergency_phone: '',
    emergency_name_2: '', emergency_relation_2: '', emergency_phone_2: '',
    blood_type: '', allergies: '', chronic_conditions: '',
  })

  const [connectUserId, setConnectUserId] = useState<string | null>(null)
  const [gmailConnected, setGmailConnected] = useState(false)
  const [calendarConnected, setCalendarConnected] = useState(false)
  const [oauthBanner, setOauthBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [isPro, setIsPro] = useState(false)

  useEffect(() => {
    const loadSub = async () => {
      try {
        const r = await fetchWithAuth('/api/stripe/status')
        const data = await r.json().catch(() => ({}))
        setIsPro(!!data?.is_pro)
      } catch { /* noop */ }
    }
    void loadSub()
  }, [searchParams])

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) return

      const { data } = await supabase.from('family_profile')
        .select('*').eq('user_id', session.user.id).single()

      if (data) {
        setExistingId(data.id)
        setMemberData({
          member_name: data.member_name || '',
          member_nationality: data.member_nationality || '中国',
          member_role: data.member_role || 'admin',
          phone: data.phone || '',
          email: data.email || '',
        })
        setPassportData({
          passport_number: data.passport_number || '',
          passport_expiry: data.passport_expiry || '',
          passport_issue_place: data.passport_issue_place || '',
          passport_issue_date: data.passport_issue_date || '',
          passport_country: data.passport_country || '',
          visa_type: data.visa_type || '',
          visa_type_note: data.visa_type_note || '',
          visa_expiry: data.visa_expiry || '',
          tm30_number: data.tm30_number || '',
          insurance_number: data.insurance_number || '',
          insurance_company: data.insurance_company || '',
          insurance_expiry: data.insurance_expiry || '',
        })
        setAddressData({
          home_address_en: data.home_address_en || '',
          home_address_zh: data.home_address_zh || '',
          school_name: data.school_name || '',
          school_address: data.school_address || '',
          hospital_name: data.hospital_name || '',
          resident_city: data.resident_city || '',  // ← 修复：读回城市
          resident_city_custom: data.resident_city_custom || '',
        })
        setEmergencyData({
          emergency_name: data.emergency_name || '',
          emergency_relation: data.emergency_relation || '',
          emergency_phone: data.emergency_phone || '',
          emergency_name_2: data.emergency_name_2 || '',
          emergency_relation_2: data.emergency_relation_2 || '',
          emergency_phone_2: data.emergency_phone_2 || '',
          blood_type: data.blood_type || '',
          allergies: data.allergies || '',
          chronic_conditions: data.chronic_conditions || '',
        })
      }
    }
    load()
  }, [])

  useEffect(() => {
    let cancelled = false
    const loadGoogle = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid || cancelled) return
      setConnectUserId(uid)
      const { data, error } = await supabase.from('user_google_tokens').select('service').eq('user_id', uid)
      if (error) {
        // 生产库若未跑 20260520000001 迁移，service 列不存在；降级为仅判断是否有 token 行
        if (error.message.includes('service')) {
          const legacy = await supabase.from('user_google_tokens').select('id').eq('user_id', uid)
          if (!cancelled && !legacy.error) {
            setGmailConnected((legacy.data?.length ?? 0) > 0)
            setCalendarConnected(false)
          }
        } else {
          console.warn('user_google_tokens:', error.message)
        }
        return
      }
      if (cancelled) return
      setGmailConnected(!!data?.some((r: { service: string }) => r.service === 'gmail'))
      setCalendarConnected(!!data?.some((r: { service: string }) => r.service === 'calendar'))
    }
    void loadGoogle()
    return () => { cancelled = true }
  }, [searchParams])

  useEffect(() => {
    const err = searchParams.get('error')
    const connected = searchParams.get('connected')
    if (err) setOauthBanner({ type: 'err', text: decodeURIComponent(err.replace(/\+/g, ' ')) })
    if (connected) {
      setOauthBanner({
        type: 'ok',
        text: `已连接 ${connected === 'gmail' ? 'Gmail' : connected === 'calendar' ? 'Google 日历' : connected}`,
      })
    }
  }, [searchParams])

  const connectGmail = async () => {
    if (!connectUserId) {
      setOauthBanner({ type: 'err', text: '请先登录' })
      return
    }
    try {
      const { getAuthUrl, GMAIL_SCOPE } = await import('@/lib/google/oauth')
      const state = Buffer.from(`gmail:${connectUserId}`).toString('base64')
      window.location.href = getAuthUrl(GMAIL_SCOPE, state)
    } catch (e: any) {
      setOauthBanner({ type: 'err', text: e?.message || '无法启动 Gmail 授权' })
    }
  }

  const connectCalendar = async () => {
    if (!connectUserId) {
      setOauthBanner({ type: 'err', text: '请先登录' })
      return
    }
    try {
      const { getAuthUrl, CALENDAR_SCOPE } = await import('@/lib/google/oauth')
      const state = Buffer.from(`calendar:${connectUserId}`).toString('base64')
      window.location.href = getAuthUrl(CALENDAR_SCOPE, state)
    } catch (e: any) {
      setOauthBanner({ type: 'err', text: e?.message || '无法启动日历授权' })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid) { router.push('/'); return }

      const resolvedCity =
        addressData.resident_city === 'other'
          ? (addressData.resident_city_custom?.trim() || null)
          : (addressData.resident_city || null)

      const payload = {
        user_id: uid,
        ...memberData,
        ...passportData,
        ...addressData,
        ...emergencyData,
        updated_at: new Date().toISOString(),
      }

      if (existingId) {
        const { error: updateErr } = await supabase
          .from('family_profile')
          .update(payload)
          .eq('user_id', uid)
        if (updateErr) {
          setSaveError('保存失败: ' + updateErr.message)
          setSaving(false)
          return
        }
      } else {
        const { data, error: insertErr } = await supabase
          .from('family_profile')
          .insert(payload)
          .select()
          .single()
        if (insertErr) {
          setSaveError('保存失败: ' + insertErr.message)
          setSaving(false)
          return
        }
        if (data) setExistingId(data.id)
      }

      // 同步地址到 family_places
      if (addressData.home_address_en) {
        const { data: existingPlace } = await supabase.from('family_places')
          .select('id').eq('user_id', uid).eq('place_type', 'home').single()
        const placePayload = {
          user_id: uid, place_type: 'home', name: '家',
          address: addressData.home_address_en,
          address_zh: addressData.home_address_zh,
          city: resolvedCity,
          is_primary: true,
        }
        if (existingPlace) {
          await supabase.from('family_places').update(placePayload).eq('id', existingPlace.id)
        } else {
          await supabase.from('family_places').insert(placePayload)
        }
      }

      setSaved(true)
      // 编辑模式返回上一页，新建模式跳主页
      setTimeout(() => {
        if (isEdit) router.back()
        else router.push('/')
      }, 1200)

    } catch (e) {
      if (!logOrAlertNetworkError(e)) setSaveError('保存失败，请检查网络后重试')
    }
    setSaving(false)
  }

  const isLastStep = step === STEPS.length - 1
  const canProceed = step === 0 ? !!memberData.member_name.trim() : true

  return (
    <main style={{ minHeight: '100dvh', backgroundColor: '#fbf9f6', fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif", paddingBottom: NAV_HEIGHT_CSS }}>

      {/* 顶部 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        ...PROFILE_GLASS,
        borderRadius: 0,
        borderLeft: 'none',
        borderRight: 'none',
        borderTop: 'none',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.3)',
      }}>
        <motion.button whileTap={{ scale: 0.9 }}
          onClick={() => step > 0 ? setStep(step - 1) : router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: INK }}>
          <ArrowLeft size={20} />
        </motion.button>
        {/* 标题根据模式变化 */}
        <span style={{ fontSize: 16, fontWeight: 700, color: INK }}>
          {isEdit ? '编辑个人资料' : '建立家庭档案'}
        </span>
        <span onClick={() => router.back()}
          style={{ fontSize: 13, color: THEME.muted, cursor: 'pointer', textDecoration: 'underline' }}>
          {isEdit ? '取消' : '跳过'}
        </span>
      </div>

      <div style={{ padding: '20px 20px 0', maxWidth: 640, margin: '0 auto' }}>

        {!isPro && (
          <button
            type="button"
            onClick={() => router.push('/upgrade')}
            style={{
              width: '100%',
              padding: '14px 20px',
              background: 'linear-gradient(135deg, #a46355 0%, #8a5247 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 16,
              fontSize: 15,
              fontFamily: "'Noto Serif SC', serif",
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              boxShadow: '0 4px 16px rgba(164,99,85,0.3)',
            }}
          >
            <span>🌳 升级 Pro 解锁全部功能</span>
            <span style={{ fontSize: 13, opacity: 0.9 }}>$9.99/月 →</span>
          </button>
        )}

        {isPro && (
          <div style={{
            width: '100%',
            padding: '12px 20px',
            background: 'rgba(92,122,94,0.08)',
            border: '1px solid rgba(92,122,94,0.2)',
            borderRadius: 14,
            fontSize: 14,
            color: '#5c7a5e',
            fontFamily: 'sans-serif',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
          >
            ✓ Pro 会员已激活
          </div>
        )}

        {/* 快捷入口 - 在进度条之前 */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            padding: '10px 14px',
            borderBottom: '1px solid rgba(45,50,47,0.06)',
          }}
        >
          <button
            type="button"
            onClick={() => router.push('/profile/cards')}
            style={{
              flex: 1,
              padding: '9px 10px',
              background: 'rgba(164,99,85,0.06)',
              border: '1px solid rgba(164,99,85,0.12)',
              borderRadius: 12,
              fontSize: 12,
              color: '#a46355',
              fontFamily: 'sans-serif',
              cursor: 'pointer',
            }}
          >
            🗂️ 证件与医疗卡
          </button>
          <button
            type="button"
            onClick={() => router.push('/children')}
            style={{
              flex: 1,
              padding: '9px 10px',
              background: 'rgba(45,50,47,0.04)',
              border: '1px solid rgba(45,50,47,0.08)',
              borderRadius: 12,
              fontSize: 12,
              color: '#2d322f',
              fontFamily: 'sans-serif',
              cursor: 'pointer',
            }}
          >
            👶 孩子档案
          </button>
        </div>

        {/* 进度条 */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {STEPS.map((s, i) => (
            <div key={i} onClick={() => i < step && setStep(i)}
              style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i <= step ? ACCENT : 'rgba(164,99,85,0.12)',
                cursor: i < step ? 'pointer' : 'default',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>

        {/* 步骤标题 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(164,99,85,0.1)',
            border: '1.5px solid rgba(164,99,85,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: ACCENT,
          }}>
            {STEPS[step].icon}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: INK }}>{STEPS[step].label}</div>
            <div style={{ fontSize: 11, color: THEME.muted }}>步骤 {step + 1} / {STEPS.length}</div>
          </div>
        </div>

        {/* 内容卡片 */}
        <div style={{ ...PROFILE_GLASS, padding: '24px 20px', marginBottom: 20 }}>
          <AnimatePresence mode="wait">
            <motion.div key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}>
              {step === 0 && <StepMember data={memberData} onChange={setMemberData} />}
              {step === 1 && <StepPassport data={passportData} onChange={setPassportData} />}
              {step === 2 && <StepAddress data={addressData} onChange={setAddressData} />}
              {step === 3 && <StepEmergency data={emergencyData} onChange={setEmergencyData} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 错误提示 */}
        {saveError && (
          <div style={{ color: '#7a5a35', fontSize: 13, textAlign: 'center', marginBottom: 12, padding: '10px 14px', borderRadius: 12, background: '#fcf7ed', border: '1px solid #f2e2cd' }}>
            ⚠️ {saveError}
          </div>
        )}

        {oauthBanner && (
          <div style={{
            fontSize: 13, textAlign: 'center', marginBottom: 14, padding: '10px 14px', borderRadius: 12,
            color: oauthBanner.type === 'ok' ? '#166534' : '#B45309',
            background: oauthBanner.type === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(251,191,36,0.12)',
            border: oauthBanner.type === 'ok' ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(251,191,36,0.35)',
          }}>
            {oauthBanner.type === 'ok' ? '✅ ' : '⚠️ '}{oauthBanner.text}
          </div>
        )}

        <div style={{ ...PROFILE_GLASS, padding: '18px 16px', marginBottom: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 6 }}>Google 服务连接</div>
          <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 14, lineHeight: 1.6 }}>
            连接后可使用 Gmail 真正代发邮件；日历授权为后续一键写日程预留。
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={() => void connectGmail()}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 14px', borderRadius: 14, border: '1px solid rgba(0,0,0,0.08)',
                background: gmailConnected ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.75)',
                color: INK, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              <Mail size={18} color={gmailConnected ? '#16a34a' : THEME.muted} />
              {gmailConnected ? 'Gmail 已连接' : '连接 Gmail（一键发邮件）'}
            </motion.button>
            <motion.button type="button" whileTap={{ scale: 0.98 }} onClick={() => void connectCalendar()}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 14px', borderRadius: 14, border: '1px solid rgba(0,0,0,0.08)',
                background: calendarConnected ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.75)',
                color: INK, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              <Calendar size={18} color={calendarConnected ? '#16a34a' : THEME.muted} />
              {calendarConnected ? 'Google 日历已连接' : '连接 Google 日历（预留）'}
            </motion.button>
          </div>
        </div>

        {/* 底部按钮 */}
        <div style={{ display: 'flex', gap: 10, paddingBottom: `max(calc(env(safe-area-inset-bottom) + 20px), 24px)` }}>
          {isLastStep ? (
            <>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep(step - 1)}
                style={{ flex: 1, padding: '14px', borderRadius: 16, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', fontSize: 14, color: THEME.muted, cursor: 'pointer' }}>
                上一步
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving || saved}
                style={{
                  flex: 2, padding: '14px', borderRadius: 14, border: 'none',
                  background: saved ? '#22C55E' : ACCENT,
                  color: '#ffffff', fontSize: 14, fontWeight: 600,
                  boxShadow: saved ? 'none' : '0 4px 16px rgba(164,99,85,0.25)',
                  cursor: saving ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'background 0.3s',
                }}>
                {saving ? <Loader size={16} /> : saved ? <Check size={16} /> : <Save size={16} />}
                {saving ? '保存中…' : saved ? '已保存 🌿' : isEdit ? '保存修改' : '保存档案'}
              </motion.button>
            </>
          ) : (
            <>
              {step > 0 && (
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep(step - 1)}
                  style={{ flex: 1, padding: '14px', borderRadius: 16, border: '1px solid rgba(0,0,0,0.1)', background: 'transparent', fontSize: 14, color: THEME.muted, cursor: 'pointer' }}>
                  上一步
                </motion.button>
              )}
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => canProceed && setStep(step + 1)}
                style={{
                  flex: 2, padding: '14px', borderRadius: 16, border: 'none',
                  background: canProceed ? ACCENT : 'rgba(0,0,0,0.08)',
                  boxShadow: canProceed ? '0 4px 16px rgba(164,99,85,0.25)' : 'none',
                  color: canProceed ? '#fff' : THEME.muted,
                  fontSize: 14, fontWeight: 600, cursor: canProceed ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                下一步 <ArrowRight size={16} />
              </motion.button>
            </>
          )}
        </div>

        {/* 底部辅助文字 */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <button type="button" onClick={() => void signOut()}
            style={{ display: 'block', width: '100%', marginBottom: 16, padding: '12px', background: 'transparent',
              border: '1px solid #f2e2cd', borderRadius: 12, color: '#7a5a35', fontSize: 13,
              cursor: 'pointer', fontFamily: "'Noto Sans SC', sans-serif" }}>
            退出登录
          </button>
          <button
            type="button"
            onClick={async () => {
              if (!confirm('确认注销账号？30 天后将永久删除所有数据，期间可联系客服撤销。')) return
              const res = await fetchWithAuth('/api/account/delete', { method: 'POST' })
              if (!res.ok) {
                alert('注销失败，请稍后重试或联系客服')
                return
              }
              await signOut()
              router.push('/auth')
            }}
            style={{
              display: 'block', width: '100%', marginBottom: 24,
              background: 'none', border: 'none',
              color: 'rgba(45,50,47,0.35)', fontSize: 12,
              cursor: 'pointer', padding: '8px 0',
              fontFamily: "'Noto Sans SC', sans-serif",
              textDecoration: 'underline',
            }}>
            注销账号
          </button>
          {isLastStep ? (
            <span onClick={() => router.back()}
              style={{ fontSize: 12, color: THEME.muted, cursor: 'pointer', textDecoration: 'underline', opacity: 0.7 }}>
              {isEdit ? '放弃修改，返回' : '跳过，先去看看主页 →'}
            </span>
          ) : (
            <span onClick={() => setStep(step + 1)}
              style={{ fontSize: 12, color: THEME.muted, cursor: 'pointer', textDecoration: 'underline', opacity: 0.7 }}>
              暂时跳过，稍后填写
            </span>
          )}
        </div>

      </div>

      <TourGuide tourId="profile" steps={PROFILE_TOUR} />
    </main>
  )
}

// ── 导出：包 Suspense 解决 useSearchParams 的 SSR 问题 ──
export default function ProfilePage() {
  return (
    <Suspense>
      <ProfileContent />
    </Suspense>
  )
}
