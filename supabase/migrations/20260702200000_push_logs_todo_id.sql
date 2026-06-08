ALTER TABLE public.push_logs
  ADD COLUMN IF NOT EXISTS todo_id UUID;

CREATE INDEX IF NOT EXISTS push_logs_user_created_at_idx
  ON public.push_logs (user_id, created_at DESC);
