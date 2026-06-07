-- 数据层修复：RLS、索引

ALTER TABLE public.chengyu_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chengyu_select_auth ON public.chengyu_library;
CREATE POLICY chengyu_select_auth ON public.chengyu_library
  FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_child_profiles_user_id
  ON public.child_profiles (user_id);

CREATE INDEX IF NOT EXISTS idx_processed_emails_user_status
  ON public.processed_emails (user_id, status);

CREATE INDEX IF NOT EXISTS idx_raw_inputs_user_status
  ON public.raw_inputs (user_id, processed, status);

CREATE INDEX IF NOT EXISTS idx_todo_items_user_dim
  ON public.todo_items (user_id, category, status);

CREATE INDEX IF NOT EXISTS idx_calendar_child_date
  ON public.child_school_calendar (child_id, date_start);
