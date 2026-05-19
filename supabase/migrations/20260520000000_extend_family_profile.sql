-- 家庭档案 / 孩子档案：填表与预填 PDF 所需字段
-- family_profile：护照签发日期、签发国、保险
ALTER TABLE public.family_profile
  ADD COLUMN IF NOT EXISTS passport_issue_date DATE,
  ADD COLUMN IF NOT EXISTS passport_country TEXT,
  ADD COLUMN IF NOT EXISTS insurance_number TEXT,
  ADD COLUMN IF NOT EXISTS insurance_company TEXT,
  ADD COLUMN IF NOT EXISTS insurance_expiry DATE;

-- children：护照与国籍（血型/过敏/病史若表上尚无则补列）
ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS passport_number TEXT,
  ADD COLUMN IF NOT EXISTS passport_expiry DATE,
  ADD COLUMN IF NOT EXISTS nationality TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'children' AND column_name = 'blood_type'
  ) THEN
    ALTER TABLE public.children ADD COLUMN blood_type TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'children' AND column_name = 'allergies'
  ) THEN
    ALTER TABLE public.children ADD COLUMN allergies JSONB;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'children' AND column_name = 'medical_conditions'
  ) THEN
    ALTER TABLE public.children ADD COLUMN medical_conditions JSONB;
  END IF;
END $$;

-- family_profile：医疗与紧急联系（应用已读写；仅在不存时补列）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'family_profile' AND column_name = 'blood_type'
  ) THEN
    ALTER TABLE public.family_profile ADD COLUMN blood_type TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'family_profile' AND column_name = 'allergies'
  ) THEN
    ALTER TABLE public.family_profile ADD COLUMN allergies TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'family_profile' AND column_name = 'chronic_conditions'
  ) THEN
    ALTER TABLE public.family_profile ADD COLUMN chronic_conditions TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'family_profile' AND column_name = 'emergency_name'
  ) THEN
    ALTER TABLE public.family_profile ADD COLUMN emergency_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'family_profile' AND column_name = 'emergency_relation'
  ) THEN
    ALTER TABLE public.family_profile ADD COLUMN emergency_relation TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'family_profile' AND column_name = 'emergency_phone'
  ) THEN
    ALTER TABLE public.family_profile ADD COLUMN emergency_phone TEXT;
  END IF;
END $$;
