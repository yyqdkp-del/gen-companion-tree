-- 根的发现：processed_emails 摘要/状态；raw_inputs .dismiss 标记

ALTER TABLE public.processed_emails
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS summary TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

UPDATE public.processed_emails
SET
  summary = COALESCE(NULLIF(TRIM(summary), ''), NULLIF(TRIM(subject), '')),
  source_type = COALESCE(source_type, 'email'),
  status = COALESCE(status, 'active')
WHERE summary IS NULL OR source_type IS NULL OR status IS NULL;

ALTER TABLE public.raw_inputs
  ADD COLUMN IF NOT EXISTS discovery_dismissed BOOLEAN NOT NULL DEFAULT FALSE;
