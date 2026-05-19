CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  nickname TEXT,
  make TEXT,
  model TEXT,
  year TEXT,
  license_plate TEXT,
  color TEXT,
  vin TEXT,
  insurance_company TEXT,
  insurance_policy TEXT,
  insurance_expiry DATE,
  insurance_phone TEXT,
  roadside_assistance TEXT,
  registration_expiry DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS vehicles_user_id_idx ON public.vehicles (user_id);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access their own vehicles" ON public.vehicles;

CREATE POLICY "Users can only access their own vehicles"
  ON public.vehicles
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.vehicles IS '家庭车辆与车险信息，用于事故/年检一键办。';
