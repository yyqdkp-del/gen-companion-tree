-- 用户对课程携带物品的偏好（dismissed 等）
ALTER TABLE public.child_profiles
  ADD COLUMN IF NOT EXISTS packing_preferences JSONB NOT NULL DEFAULT '{}'::JSONB;
