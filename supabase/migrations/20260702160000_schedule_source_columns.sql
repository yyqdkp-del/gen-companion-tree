-- 课表统一写入层：记录来源与更新时间

ALTER TABLE public.child_profiles
  ADD COLUMN IF NOT EXISTS schedule_source TEXT,
  ADD COLUMN IF NOT EXISTS schedule_updated_at TIMESTAMPTZ;
