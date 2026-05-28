-- 修复控制台常见 400/406：user_google_tokens.service、family_profile 扩展列

-- user_google_tokens：与 20260520000001 对齐（表已存在但缺 service 时补列）
CREATE TABLE IF NOT EXISTS public.user_google_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK (service IN ('gmail', 'calendar')),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, service)
);

ALTER TABLE public.user_google_tokens
  ADD COLUMN IF NOT EXISTS service TEXT;

UPDATE public.user_google_tokens
SET service = 'gmail'
WHERE service IS NULL;

ALTER TABLE public.user_google_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access their own tokens" ON public.user_google_tokens;
CREATE POLICY "Users can only access their own tokens"
  ON public.user_google_tokens
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- family_profile：档案页表单字段（若未跑过后续迁移）
ALTER TABLE public.family_profile
  ADD COLUMN IF NOT EXISTS passport_issue_date DATE,
  ADD COLUMN IF NOT EXISTS passport_country TEXT,
  ADD COLUMN IF NOT EXISTS insurance_number TEXT,
  ADD COLUMN IF NOT EXISTS insurance_company TEXT,
  ADD COLUMN IF NOT EXISTS insurance_expiry DATE,
  ADD COLUMN IF NOT EXISTS visa_type_note TEXT,
  ADD COLUMN IF NOT EXISTS resident_city_custom TEXT,
  ADD COLUMN IF NOT EXISTS emergency_name_2 TEXT,
  ADD COLUMN IF NOT EXISTS emergency_relation_2 TEXT,
  ADD COLUMN IF NOT EXISTS emergency_phone_2 TEXT,
  ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ;
