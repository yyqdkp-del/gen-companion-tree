ALTER TABLE public.child_profiles
  ADD COLUMN IF NOT EXISTS schedule_intelligence JSONB NOT NULL DEFAULT '{}'::JSONB;
