-- 家庭携带记忆 + 确认日志（智能学习）
CREATE TABLE IF NOT EXISTS public.family_packing_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children (id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  course TEXT,
  source TEXT NOT NULL DEFAULT 'schedule',
  remind_days_before INTEGER NOT NULL DEFAULT 0,
  remind_morning BOOLEAN NOT NULL DEFAULT TRUE,
  remind_evening BOOLEAN NOT NULL DEFAULT FALSE,
  forget_count INTEGER NOT NULL DEFAULT 0,
  confirm_count INTEGER NOT NULL DEFAULT 0,
  last_forgotten DATE,
  last_confirmed DATE,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 0.7,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (child_id, item_name, course)
);

CREATE INDEX IF NOT EXISTS family_packing_memory_child_active_idx
  ON public.family_packing_memory (child_id, is_active);

ALTER TABLE public.family_packing_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user own packing memory"
  ON public.family_packing_memory
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.packing_confirm_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children (id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  course TEXT,
  date DATE NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS packing_confirm_logs_child_date_idx
  ON public.packing_confirm_logs (child_id, date);

ALTER TABLE public.packing_confirm_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user own packing confirm logs"
  ON public.packing_confirm_logs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
