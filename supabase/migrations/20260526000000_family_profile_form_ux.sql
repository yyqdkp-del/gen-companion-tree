-- 家长档案向导：多国签证说明、自定义城市、第二紧急联系人
ALTER TABLE public.family_profile
  ADD COLUMN IF NOT EXISTS visa_type_note TEXT,
  ADD COLUMN IF NOT EXISTS resident_city_custom TEXT,
  ADD COLUMN IF NOT EXISTS emergency_name_2 TEXT,
  ADD COLUMN IF NOT EXISTS emergency_relation_2 TEXT,
  ADD COLUMN IF NOT EXISTS emergency_phone_2 TEXT;
