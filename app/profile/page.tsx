'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Check,
  User, FileText, MapPin, Shield, Loader, Save,
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

const THEME = {
  bg: 'linear-gradient(180deg, #A7D7D9 0%, #D9A7B4 100%)',
  text: '#2C3E50',
  gold: '#B08D57',
  navy: '#1A3C5E',
  muted: '#6B8BAA',
}

function Field({ label, value, onChange, placeholder, type = 'text', required = false }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; required?: boolean
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 6, letterSpacing: '0.08em' }}>
        {label}{required && <span style={{ color: '#E07B2A', marginLeft: 3 }}>*</span>}
      </div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '12px 14px', borderRadius: 12,
          border: '1px solid rgba(0,0,0,0.1)',
          background: 'rgba(255,255,255,0.65)',
          fontSize: 14, color: THEME.text, outline: 'none',
          boxSizing: 'border-box', fontFamily: 'inherit',
        }}
      />
    </div>
  )
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, marginBottom: 6, letterSpacing: '0.08em' }}>{label}</div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '12px 14px', borderRadius: 12,
          border: '1px solid rgba(0,0,0,0.1)',
          background: 'rgba(255,255,255,0.65)',
          fontSize: 14, color: THEME.text, outline: 'none',
          boxSizing: 'border-box', fontFamily: 'inherit',
          appearance: 'none',
        }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

const STEPS = [
  { id: 'member', icon: <User size={18} />, label: '本人信息' },
  { id: 'passport', icon: <FileText size={18} />, label: '护照签证' },
  { id: 'address', icon: <MapPin size={18} />, label: '常用地址' },
  { id: 'emergency', icon: <Shield size={18} />, label: '紧急联系' },
]

function StepMember({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, color: THEME.navy, marginBottom: 20 }}>告诉根你是谁 🌿</div>
      <Field label="姓名" value={data.member_name} onChange={v => onChange({ ...data, member_name: v })} placeholder="中文姓名或英文名" required />
      <SelectField
        label="国籍"
        value={data.member_nationality}
        onChange={v => onChange({ ...data, member_nationality: v })}
        options={[
          { value: '中国', label: '🇨🇳 中国' },
          { value: '中国香港', label: '🇭🇰 中国香港' },
          { value: '中国台湾', label: '🇹🇼 中国台湾' },
          { value: '新加坡', label: '🇸🇬 新加坡' },
          { value: '马来西亚', label: '🇲🇾 马来西亚' },
          { value: '其他', label: '其他' },
        ]}
      />
      <SelectField
        label="身份"
        value={data.member_role}
        onChange={v => onChange({ ...data, member_role: v })}
        options={[
          { value: 'admin', label: '👩 妈妈（主要管理者）' },
          { value: 'spouse', label: '👨 爸爸' },
          { value: 'other', label: '其他' },
        ]}
      />
      <Field label="手机号码" value={data.phone} onChange={v => onChange({ ...data, phone: v })} placeholder="+66 8x xxxx xxxx" type="tel" />
      <Field label="电子邮箱" value={data.email} onChange={v => onChange({ ...data, email: v })} placeholder="常用邮箱" type="email" />
    </div>
  )
}

function StepPassport({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, color: THEME.navy, marginBottom: 4 }}>证件信息 📋</div>
      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 20, lineHeight: 1.6 }}>仅用于预填表格，不会对外共享</div>
      <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(176,141,87,0.08)', borderLeft: '3px solid rgba(176,141,87,0.4)', marginBottom: 20, fontSize: 12, color: THEME.text, lineHeight: 1.7 }}>
        🔐 证件信息存储于加密数据库
      </div>
      <div style={{ fontSize: 12, color: THEME.gold, fontWeight: 700, marginBottom: 12 }}>护照</div>
      <Field label="护照号码" value={data.passport_number} onChange={v => onChange({ ...data, passport_number: v })} placeholder="E12345678" />
      <Field label="护照到期日" value={data.passport_expiry} onChange={v => onChange({ ...data, passport_expiry: v })} type="date" />
      <Field label="护照签发地" value={data.passport_issue_place} onChange={v => onChange({ ...data, passport_issue_place: v })} placeholder="北京" />
      <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '20px 0' }} />
      <div style={{ fontSize: 12, color: THEME.gold, fontWeight: 700, marginBottom: 12 }}>泰国签证</div>
      <SelectField
        label="当前签证类型"
        value={data.visa_type}
        onChange={v => onChange({ ...data, visa_type: v })}
        options={[
          { value: '', label: '请选择' },
          { value: 'TR', label: 'TR · 旅游签证' },
          { value: 'ED', label: 'ED · 教育签证' },
          { value: 'NON-O', label: 'Non-O · 家属签证' },
          { value: 'NON-B', label: 'Non-B · 商务签证' },
          { value: 'LTR', label: 'LTR · 长居签证' },
          { value: 'other', label: '其他' },
        ]}
      />
      <Field label="签证到期日" value={data.visa_expiry} onChange={v => onChange({ ...data, visa_expiry: v })} type="date" />
      <Field label="TM30 报到号码" value={data.tm30_number} onChange={v => onChange({ ...data, tm30_number: v })} placeholder="如有填写" />
    </div>
  )
}

function StepAddress({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, color: THEME.navy, marginBottom: 4 }}>常用地址 📍</div>
      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 20, lineHeight: 1.6 }}>用于导航和表格填写</div>
      <div style={{ fontSize: 12, color: THEME.gold, fontWeight: 700, marginBottom: 12 }}>住所地址</div>
      <SelectField
        label="居住城市"
        value={data.resident_city}
        onChange={v => onChange({ ...data, resident_city: v })}
        options={[
          { value: '', label: '请选择城市' },
          { value: 'Chiang Mai', label: '🇹🇭 清迈' },
          { value: 'Bangkok', label: '🇹🇭 曼谷' },
          { value: 'Phuket', label: '🇹🇭 普吉' },
          { value: 'Pattaya', label: '🇹🇭 芭提雅' },
          { value: 'Singapore', label: '🇸🇬 新加坡' },
          { value: 'Kuala Lumpur', label: '🇲🇾 吉隆坡' },
          { value: 'Bali', label: '🇮🇩 巴厘岛' },
          { value: 'Manila', label: '🇵🇭 马尼拉' },
          { value: 'Lisbon', label: '🇵🇹 里斯本' },
          { value: 'Barcelona', label: '🇪🇸 巴塞罗那' },
          { value: 'Berlin', label: '🇩🇪 柏林' },
          { value: 'Amsterdam', label: '🇳🇱 阿姆斯特丹' },
          { value: 'Vancouver', label: '🇨🇦 温哥华' },
          { value: 'Los Angeles', label: '🇺🇸 洛杉矶' },
          { value: 'Hong Kong', label: '🇭🇰 香港' },
        ]}
      />
      <Field label="地址（英文）" value={data.home_address_en} onChange={v => onChange({ ...data, home_address_en: v })} placeholder="123 Nimman Rd, Chiang Mai 50200" />
      <Field label="地址（中文，可选）" value={data.home_address_zh} onChange={v => onChange({ ...data, home_address_zh: v })} placeholder="清迈市区尼曼路123号" />
      <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '20px 0' }} />
      <div style={{ fontSize: 12, color: THEME.gold, fontWeight: 700, marginBottom: 12 }}>孩子学校</div>
      <Field label="学校名称" value={data.school_name} onChange={v => onChange({ ...data, school_name: v })} placeholder="Lanna International School" />
      <Field label="学校地址" value={data.school_address} onChange={v => onChange({ ...data, school_address: v })} placeholder="Chiang Mai, Thailand" />
      <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '20px 0' }} />
      <div style={{ fontSize: 12, color: THEME.gold, fontWeight: 700, marginBottom: 12 }}>常用医院（可选）</div>
      <Field label="常用医院" value={data.hospital_name} onChange={v => onChange({ ...data, hospital_name: v })} placeholder="清迈国际医院 / Ram Hospital" />
    </div>
  )
}

function StepEmergency({ data, onChange }: { data: any; onChange: (d: any) => void }) {
  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 600, color: THEME.navy, marginBottom: 4 }}>紧急联系人 🆘</div>
      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 20, lineHeight: 1.6 }}>紧急情况时根会优先联系这些人</div>
      <Field label="紧急联系人姓名" value={data.emergency_name} onChange={v => onChange({ ...data, emergency_name: v })} placeholder="爸爸 / 国内家人姓名" />
      <Field label="关系" value={data.emergency_relation} onChange={v => onChange({ ...data, emergency_relation: v })} placeholder="丈夫 / 父母 / 朋友" />
      <Field label="联系电话" value={data.emergency_phone} onChange={v => onChange({ ...data, emergency_phone: v })} placeholder="+86 138 xxxx xxxx" type="tel" />
      <div style={{ height: 1, background: 'rgba(0,0,0,0.07)', margin: '20px 0' }} />
      <div style={{ fontSize: 12, color: THEME.gold, fontWeight: 700, marginBottom: 12 }}>健康信息（可选）</div>
      <Field label="血型" value={data.blood_type} onChange={v => onChange({ ...data, blood_type: v })} placeholder="A / B / AB / O" />
      <Field label="过敏史" value={data.allergies} onChange={v => onChange({ ...data, allergies: v })} placeholder="青霉素过敏 / 无" />
      <Field label="慢性病史" value={data.chronic_conditions} onChange={v => onChange({ ...data, chronic_conditions: v })} placeholder="如实填写，或填无" />
      <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgba(154,183,232,0.12)', marginTop: 8, fontSize: 12, color: THEME.muted, lineHeight: 1.7 }}>
        💡 健康信息用于生成就诊卡，帮助您在泰国医院顺畅就医
      </div>
    </div>
  )
}

// ── 主组件内容（需要 useSearchParams，包在 Suspense 里）──
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
    <main style={{ minHeight: '100dvh', background: THEME.bg, fontFamily: "'Noto Sans SC', 'PingFang SC', sans-serif" }}>

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
        <div style={{ display: 'flex', gap: 10, paddingBottom: 20 }}>
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
