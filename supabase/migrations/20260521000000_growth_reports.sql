-- 成长周报表（跨代连接周报）
CREATE TABLE IF NOT EXISTS public.growth_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  share_token TEXT UNIQUE,
  token_expires_at TIMESTAMPTZ,
  grandparent_views INTEGER DEFAULT 0,
  grandparent_likes INTEGER DEFAULT 0,
  grandparent_voice_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS growth_reports_user_week_idx
  ON public.growth_reports (user_id, child_id, week_start);

CREATE INDEX IF NOT EXISTS growth_reports_share_token_idx
  ON public.growth_reports (share_token)
  WHERE share_token IS NOT NULL;

ALTER TABLE public.growth_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_own_reports ON public.growth_reports;
CREATE POLICY users_own_reports ON public.growth_reports
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS token_access ON public.growth_reports;
CREATE POLICY token_access ON public.growth_reports
  FOR SELECT
  USING (
    share_token IS NOT NULL
    AND token_expires_at > now()
  );
