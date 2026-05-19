CREATE TABLE IF NOT EXISTS public.travel_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  departure TEXT,
  start_date DATE,
  end_date DATE,
  travelers JSONB,
  plan JSONB,
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS travel_plans_user_id_idx ON public.travel_plans (user_id);

ALTER TABLE public.travel_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access their own travel plans" ON public.travel_plans;

CREATE POLICY "Users can only access their own travel plans"
  ON public.travel_plans
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.travel_plans IS 'AI 旅行规划结果存档。';
