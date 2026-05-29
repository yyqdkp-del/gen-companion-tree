-- chinese_sessions 确保有 child_id 列及查询索引
ALTER TABLE public.chinese_sessions
  ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES public.children(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS chinese_sessions_child_id_idx
  ON public.chinese_sessions (child_id);

CREATE INDEX IF NOT EXISTS chinese_sessions_user_child_learned_idx
  ON public.chinese_sessions (user_id, child_id, learned_at DESC);
