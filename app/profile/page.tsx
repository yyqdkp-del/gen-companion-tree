'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Loader, Save, User, FileText, MapPin, Shield } from 'lucide-react'
import { THEME } from '@/app/_shared/_constants/theme'
import { NAV_HEIGHT_CSS } from '@/app/_shared/_constants/layout'
import { Field, SelectField } from '@/app/_shared/_components/FormField'
import { StepMember }    from './steps/StepMember'
import { StepPassport }  from './steps/StepPassport'
import { StepAddress }   from './steps/StepAddress'
import { StepEmergency } from './steps/StepEmergency'

const supabase = createClient()

const STEPS = [
  { id: 'member', icon: <User size={18} />, label: '本人信息' },
  { id: 'passport', icon: <FileText size={18} />, label: '护照签证' },
  { id: 'address', icon: <MapPin size={18} />, label: '常用地址' },
  { id: 'emergency', icon: <Shield size={18} />, label: '紧急联系' },
]

function ProfileContent() {
  const router = useRouter()
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
    visa_type: '', visa_expiry: '', tm30_number: '',
  })
  const [addressData, setAddressData] = useState({
    home_address_en: '', home_address_zh: '',
    school_name: '', school_address: '', hospital_name: '',
    resident_city: '',
  })
  const [emergencyData, setEmergencyData] = useState({
    emergency_name: '', emergency_relation: '', emergency_phone: '',
    blood_type: '', allergies: '', chronic_conditions: '',
  })

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
          visa_type: data.visa_type || '',
          visa_expiry: data.visa_expiry || '',
          tm30_number: data.tm30_number || '',
        })
        setAddressData({
          home_address_en: data.home_address_en || '',
          home_address_zh: data.home_address_zh || '',
          school_name: data.school_name || '',
          school_address: data.school_address || '',
          hospital_name: data.hospital_name || '',
          resident_city: data.resident_city || '',  // ← 修复：读回城市
        })
        setEmergencyData({
          emergency_name: data.emergency_name || '',
          emergency_relation: data.emergency_relation || '',
          emergency_phone: data.emergency_phone || '',
          blood_type: data.blood_type || '',
          allergies: data.allergies || '',
          chronic_conditions: data.chronic_conditions || '',
        })
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid) { router.push('/'); return }

      const payload = {
        user_id: uid,
        ...memberData,
        ...passportData,
        ...addressData,
        ...emergencyData,
        updated_at: new Date().toISOString(),
      }

      if (existingId) {
        await supabase.from('family_profile').update(payload).eq('id', existingId)
      } else {
        const { data } = await supabase.from('family_profile').insert(payload).select().single()
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
          city: addressData.resident_city || null,
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
      console.error('保存失败', e)
      setSaveError('保存失败，请检查网络后重试')
    }
    setSaving(false)
  }

  const isLastStep = step === STEPS.length - 1
  const canProceed = step === 0 ? !!memberData.member_name.trim() : true

  return (
    <main style={{ minHeight: '100dvh', background: THEME.bg, fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif", paddingBottom: NAV_HEIGHT_CSS }}>

      {/* 顶部 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(167,215,217,0.85)',
        backdropFilter: 'blur(20px)',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.3)',
      }}>
        <motion.button whileTap={{ scale: 0.9 }}
          onClick={() => step > 0 ? setStep(step - 1) : router.back()}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: THEME.navy }}>
          <ArrowLeft size={20} />
        </motion.button>
        {/* 标题根据模式变化 */}
        <span style={{ fontSize: 16, fontWeight: 700, color: THEME.navy }}>
          {isEdit ? '编辑个人资料' : '建立家庭档案'}
        </span>
        <span onClick={() => router.back()}
          style={{ fontSize: 13, color: THEME.muted, cursor: 'pointer', textDecoration: 'underline' }}>
          {isEdit ? '取消' : '跳过'}
        </span>
      </div>

      <div style={{ padding: '20px 20px 0', maxWidth: 640, margin: '0 auto' }}>

        {/* 进度条 */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {STEPS.map((s, i) => (
            <div key={i} onClick={() => i < step && setStep(i)}
              style={{
                flex: 1, height: 3, borderRadius: 2,
                background: i <= step ? THEME.gold : 'rgba(0,0,0,0.1)',
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
            background: 'rgba(176,141,87,0.12)',
            border: '1.5px solid rgba(176,141,87,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: THEME.gold,
          }}>
            {STEPS[step].icon}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: THEME.navy }}>{STEPS[step].label}</div>
            <div style={{ fontSize: 11, color: THEME.muted }}>步骤 {step + 1} / {STEPS.length}</div>
          </div>
        </div>

        {/* 内容卡片 */}
        <div style={{
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(30px)',
          borderRadius: 24, padding: '24px 20px',
          border: '1px solid rgba(255,255,255,0.8)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
          marginBottom: 20,
        }}>
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
          <div style={{ color: '#E07B2A', fontSize: 13, textAlign: 'center', marginBottom: 12, padding: '10px 14px', borderRadius: 12, background: 'rgba(224,123,42,0.08)', border: '1px solid rgba(224,123,42,0.2)' }}>
            ⚠️ {saveError}
          </div>
        )}

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
                  flex: 2, padding: '14px', borderRadius: 16, border: 'none',
                  background: saved ? '#22C55E' : THEME.navy,
                  color: '#fff', fontSize: 14, fontWeight: 600,
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
                  background: canProceed ? THEME.navy : 'rgba(0,0,0,0.08)',
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
