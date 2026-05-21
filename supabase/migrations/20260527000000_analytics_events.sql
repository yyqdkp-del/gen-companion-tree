CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  event_type TEXT NOT NULL,
  page TEXT,
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analytics_events_user_idx 
  ON public.analytics_events (user_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS analytics_events_type_idx 
  ON public.analytics_events (event_type, created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_events" ON public.analytics_events;
CREATE POLICY "users_own_events" ON public.analytics_events
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "users_read_own_events" ON public.analytics_events;
CREATE POLICY "users_read_own_events" ON public.analytics_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
