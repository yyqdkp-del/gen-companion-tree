-- Product: align children columns with app payload (fixes PostgREST 400 on unknown columns)

ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS school TEXT,
  ADD COLUMN IF NOT EXISTS transport_method TEXT,
  ADD COLUMN IF NOT EXISTS medications_current JSONB,
  ADD COLUMN IF NOT EXISTS preferred_hospitals JSONB,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
