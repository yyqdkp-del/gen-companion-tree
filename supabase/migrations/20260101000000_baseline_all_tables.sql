-- Baseline: core app tables inferred from codebase (CREATE IF NOT EXISTS + RLS).
-- Notes:
-- * Service role bypasses RLS (cron/API routes).
-- * Some legacy inserts omit user_id; those columns are nullable where needed.
-- * Child-scoped rows use policies: own user_id OR parent child belongs to auth.uid().

-- ── helpers ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END; $$;

-- ── schools (global reference) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  name_full TEXT,
  name_short TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS schools_name_full_idx ON public.schools (name_full);

-- ── family_profile ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.family_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  member_name TEXT,
  member_nationality TEXT,
  member_role TEXT,
  phone TEXT,
  email TEXT,
  passport_number TEXT,
  passport_expiry TEXT,
  passport_issue_place TEXT,
  passport_issue_date DATE,
  passport_country TEXT,
  visa_type TEXT,
  visa_expiry TEXT,
  tm30_number TEXT,
  insurance_number TEXT,
  insurance_company TEXT,
  insurance_expiry DATE,
  home_address_en TEXT,
  home_address_zh TEXT,
  school_name TEXT,
  school_address TEXT,
  hospital_name TEXT,
  resident_city TEXT,
  emergency_name TEXT,
  emergency_relation TEXT,
  emergency_phone TEXT,
  blood_type TEXT,
  allergies TEXT,
  chronic_conditions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- ── user_consents / user_line_credentials ──────────────────────────
CREATE TABLE IF NOT EXISTS public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  privacy_agreed BOOLEAN,
  ai_training_agreed BOOLEAN,
  version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.user_line_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  fake_email TEXT,
  fake_password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- ── riqi_access (treehouse PIN; legacy row may have user_id NULL) ───
CREATE TABLE IF NOT EXISTS public.riqi_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS riqi_access_user_id_idx ON public.riqi_access (user_id);

-- ── auth_temp_codes ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.auth_temp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (code)
);

-- ── children ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT,
  grade TEXT,
  school_short TEXT,
  school_name TEXT,
  school_email_domain TEXT,
  school_start_time TEXT,
  school_end_time TEXT,
  usual_bedtime TEXT,
  weekend_bedtime TEXT,
  birthdate DATE,
  avatar_url TEXT,
  health_status TEXT,
  mood_status TEXT,
  energy INTEGER DEFAULT 50,
  progress INTEGER DEFAULT 0,
  urgent_items JSONB,
  languages JSONB,
  blood_type TEXT,
  allergies JSONB,
  medical_conditions JSONB,
  passport_number TEXT,
  passport_expiry DATE,
  nationality TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS children_user_id_idx ON public.children (user_id);

-- ── family_places / family_documents / family_habits / interest_weights / family_learning_dna / user_locations
CREATE TABLE IF NOT EXISTS public.family_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  place_type TEXT,
  label TEXT,
  name TEXT,
  address TEXT,
  address_zh TEXT,
  city TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  is_primary BOOLEAN DEFAULT FALSE,
  visit_frequency TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS family_places_user_id_idx ON public.family_places (user_id);

CREATE TABLE IF NOT EXISTS public.family_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  member_name TEXT,
  doc_type TEXT,
  title TEXT NOT NULL,
  expiry_date DATE,
  reminder_days_before INTEGER[] DEFAULT ARRAY[90,30,7]::INT[],
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.family_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  habit_type TEXT,
  notes TEXT,
  pattern_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.interest_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, topic)
);

CREATE TABLE IF NOT EXISTS public.family_learning_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  last_input_type TEXT,
  last_learned_at TIMESTAMPTZ,
  total_sessions INTEGER DEFAULT 0,
  preferred_scene TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.user_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  city TEXT,
  country TEXT,
  country_code TEXT,
  timezone TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  geofence_id TEXT,
  geofence_name TEXT,
  local_config JSONB,
  source TEXT,
  accuracy TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- ── child_* (depend on children) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.child_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children (id) ON DELETE CASCADE,
  class_schedule JSONB,
  activities JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (child_id)
);

CREATE TABLE IF NOT EXISTS public.child_school_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children (id) ON DELETE CASCADE,
  event_type TEXT,
  title TEXT NOT NULL,
  date_start DATE,
  date_end DATE,
  description TEXT,
  requires_action TEXT,
  requires_items JSONB DEFAULT '[]'::JSONB,
  requires_payment NUMERIC,
  source TEXT,
  confidence NUMERIC,
  ai_action_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS child_school_calendar_child_idx ON public.child_school_calendar (child_id, date_start);

CREATE TABLE IF NOT EXISTS public.child_health_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children (id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT,
  description TEXT,
  doctor_name TEXT,
  hospital TEXT,
  follow_up_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.child_daily_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children (id) ON DELETE CASCADE,
  date DATE NOT NULL,
  health_status TEXT,
  mood_status TEXT,
  health_notes TEXT,
  mood_notes TEXT,
  sleep_start TEXT,
  sleep_end TEXT,
  medication_taken BOOLEAN DEFAULT FALSE,
  notable_events JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (child_id, date)
);

CREATE TABLE IF NOT EXISTS public.child_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  type TEXT,
  days JSONB,
  start_time TEXT,
  end_time TEXT,
  location TEXT,
  monthly_fee INTEGER,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  compatibility_score NUMERIC,
  compatibility_notes TEXT,
  recommended_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.child_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children (id) ON DELETE CASCADE,
  title TEXT,
  body JSONB,
  achieved_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.child_schedule_template (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children (id) ON DELETE CASCADE,
  day_of_week INTEGER,
  subject TEXT,
  period_start TEXT,
  requires_items JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.child_packing_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  item_name TEXT NOT NULL,
  preference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (child_id, event_type, item_name)
);

CREATE TABLE IF NOT EXISTS public.family_vision (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children (id) ON DELETE CASCADE,
  person_type TEXT,
  vision_statement TEXT,
  priorities JSONB,
  concerns JSONB,
  target_school_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── todo / hotspot / action_queue ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.todo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  family_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  repeat TEXT,
  due_date DATE,
  completed_at TIMESTAMPTZ,
  source TEXT,
  source_ref_id UUID,
  ai_draft TEXT,
  ai_action_type TEXT,
  ai_action_data JSONB,
  one_tap_ready BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS todo_items_user_status_idx ON public.todo_items (user_id, status);

CREATE TABLE IF NOT EXISTS public.hotspot_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  family_id TEXT,
  category TEXT,
  urgency TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  relevance_reason TEXT,
  action_available BOOLEAN DEFAULT FALSE,
  action_type TEXT,
  action_data JSONB,
  status TEXT NOT NULL DEFAULT 'unread',
  expires_at TIMESTAMPTZ,
  linked_todo_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS hotspot_items_user_created_idx ON public.hotspot_items (user_id, created_at);

CREATE TABLE IF NOT EXISTS public.action_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  title TEXT,
  category TEXT,
  urgency_level INTEGER,
  execution_pack JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS action_queue_user_source_idx ON public.action_queue (user_id, source_type, source_id, status);

-- ── reminder_chains / reminders ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reminder_chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  family_id TEXT,
  todo_id UUID REFERENCES public.todo_items (id) ON DELETE CASCADE,
  level INTEGER,
  trigger_days_before INTEGER,
  trigger_date DATE,
  status TEXT DEFAULT 'pending',
  benefit_description TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  trigger_date DATE,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── packing_lists / shopping_list ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.packing_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children (id) ON DELETE CASCADE,
  date DATE NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (child_id, date, user_id)
);

CREATE TABLE IF NOT EXISTS public.shopping_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  family_id TEXT,
  item_name TEXT NOT NULL,
  category TEXT,
  urgency TEXT,
  deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── push ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.push_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  push_type TEXT NOT NULL,
  event_id TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── chinese ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chinese_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children (id) ON DELETE SET NULL,
  input_text TEXT,
  input_type TEXT,
  result JSONB,
  location_scene TEXT,
  learned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hanzi_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  char TEXT NOT NULL,
  pinyin TEXT,
  traditional TEXT,
  meaning_short TEXT,
  parts JSONB,
  evolution JSONB,
  phonics_bridge TEXT,
  family JSONB,
  mom_script TEXT,
  scene_universal TEXT,
  chengyu_connected JSONB,
  level_tag TEXT,
  result JSONB,
  created_by TEXT,
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (char)
);

CREATE TABLE IF NOT EXISTS public.chengyu_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  chengyu TEXT NOT NULL,
  pinyin TEXT,
  meaning TEXT,
  result JSONB,
  hit_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (chengyu)
);

-- ── user_habits ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  action_type TEXT,
  target_category TEXT,
  target_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── form_templates (global rows: user_id NULL) ──────────────────────
CREATE TABLE IF NOT EXISTS public.form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  form_type TEXT NOT NULL,
  download_url TEXT,
  official_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (form_type)
);

-- ── assessments / essay_materials / pathway_* ─────────────────────
CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children (id) ON DELETE SET NULL,
  child_name TEXT,
  child_age INTEGER,
  level TEXT,
  standard_level TEXT,
  answers JSONB,
  report JSONB,
  source TEXT,
  geofence_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.essay_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children (id) ON DELETE CASCADE,
  content TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.pathway_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children (id) ON DELETE CASCADE,
  profile_scores JSONB,
  narrative TEXT,
  gaps JSONB,
  roadmap JSONB,
  this_semester JSONB,
  spike_options JSONB,
  today_priority JSONB,
  key_insight TEXT,
  years_to_apply INTEGER,
  target_path TEXT,
  grade TEXT,
  selected_spike JSONB,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pathway_reports_child_gen_idx ON public.pathway_reports (child_id, generated_at DESC);

CREATE TABLE IF NOT EXISTS public.pathway_node_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES public.children (id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  condition_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (child_id, node_id, condition_id)
);

-- ── email / raw ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.processed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  from_email TEXT,
  subject TEXT,
  email_type TEXT,
  is_school_related BOOLEAN,
  processed_at TIMESTAMPTZ,
  todos_created INTEGER DEFAULT 0,
  events_created INTEGER DEFAULT 0,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id)
);

CREATE TABLE IF NOT EXISTS public.child_school_comms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children (id) ON DELETE SET NULL,
  email_from TEXT,
  email_subject TEXT,
  email_date TIMESTAMPTZ,
  email_type TEXT,
  summary TEXT,
  reply_needed BOOLEAN,
  reply_draft TEXT,
  processed_at TIMESTAMPTZ,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.raw_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  input_type TEXT,
  raw_content TEXT,
  file_url TEXT,
  processed BOOLEAN DEFAULT FALSE,
  status TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── misc ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  status TEXT DEFAULT 'pending',
  due_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.app_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  page TEXT NOT NULL,
  component TEXT,
  config_key TEXT,
  config_value JSONB,
  is_visible BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  child_id UUID REFERENCES public.children (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS app_config_page_idx ON public.app_config (page, is_visible, sort_order);

-- ── updated_at triggers (idempotent) ────────────────────────────────
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT unnest(ARRAY[
    'schools','family_profile','user_consents','user_line_credentials','riqi_access','auth_temp_codes',
    'children','family_places','family_documents','family_habits','interest_weights','family_learning_dna','user_locations',
    'child_profiles','child_school_calendar','child_health_records','child_daily_log','child_activities','child_achievements',
    'child_schedule_template','child_packing_habits','family_vision',
    'todo_items','hotspot_items','action_queue','reminder_chains','reminders','packing_lists','shopping_list',
    'push_subscriptions','push_logs','chinese_sessions','hanzi_library','chengyu_library','user_habits','form_templates',
    'assessments','essay_materials','pathway_reports','pathway_node_conditions',
    'processed_emails','child_school_comms','raw_inputs','conversation_log','tasks','app_config'
  ]::text[]) AS tbl
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated ON public.%I', r.tbl, r.tbl);
    EXECUTE format('CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', r.tbl, r.tbl);
  END LOOP;
END $$;

-- ══ RLS ═════════════════════════════════════════════════════════════

-- Policy helper: own user_id
-- Child-linked: user_id match OR child belongs to user

-- schools: readable by any signed-in user (reference data)
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS schools_select_auth ON public.schools;
CREATE POLICY schools_select_auth ON public.schools FOR SELECT TO authenticated USING (true);

-- Standard user-owned tables (user_id must match JWT)
DO $rls$ DECLARE t text; pol text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'family_profile','user_consents','user_line_credentials','auth_temp_codes',
    'children','family_places','family_documents','family_habits','interest_weights','family_learning_dna','user_locations',
    'child_profiles','todo_items','action_queue','reminders','push_subscriptions','push_logs',
    'chinese_sessions','user_habits','assessments','essay_materials','pathway_reports','raw_inputs','shopping_list'
  ]
  LOOP
    pol := t || '_all_own';
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, t);
    EXECUTE format($p$
      CREATE POLICY %I ON public.%I FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid())
    $p$, pol, t);
  END LOOP;
END $rls$;

-- riqi_access: own row or legacy global (user_id IS NULL)
ALTER TABLE public.riqi_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS riqi_access_select ON public.riqi_access;
CREATE POLICY riqi_access_select ON public.riqi_access FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

-- Child-scoped: own user_id or inferred from children.owner
DO $child$ DECLARE t text; pol text; qual text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'child_school_calendar','child_health_records','child_daily_log','child_activities','child_achievements',
    'child_schedule_template','child_packing_habits','packing_lists','family_vision','pathway_node_conditions','child_school_comms'
  ]
  LOOP
    pol := t || '_child_scope';
    qual := format(
      'COALESCE(%s.user_id, (SELECT c.user_id FROM public.children c WHERE c.id = %s.child_id)) = auth.uid()',
      quote_ident(t), quote_ident(t)
    );
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol, t);
    EXECUTE 'CREATE POLICY ' || quote_ident(pol) || ' ON public.' || quote_ident(t)
      || ' FOR ALL TO authenticated USING (' || qual || ') WITH CHECK (' || qual || ')';
  END LOOP;
END $child$;

-- hotspot_items: user-owned OR match via linked todo
ALTER TABLE public.hotspot_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hotspot_items_policy ON public.hotspot_items;
CREATE POLICY hotspot_items_policy ON public.hotspot_items FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR (linked_todo_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.todo_items ti WHERE ti.id = hotspot_items.linked_todo_id AND ti.user_id = auth.uid()
    ))
  )
  WITH CHECK (user_id = auth.uid());

-- reminder_chains: by user_id or owning todo
ALTER TABLE public.reminder_chains ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reminder_chains_policy ON public.reminder_chains;
CREATE POLICY reminder_chains_policy ON public.reminder_chains FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.todo_items ti WHERE ti.id = reminder_chains.todo_id AND ti.user_id = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.todo_items ti WHERE ti.id = reminder_chains.todo_id AND ti.user_id = auth.uid())
  );

-- hanzi / chengyu: shared dictionary — authenticated read; writes only own user_id rows or global (NULL)
ALTER TABLE public.hanzi_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hanzi_select ON public.hanzi_library;
CREATE POLICY hanzi_select ON public.hanzi_library FOR SELECT TO authenticated USING (true);
-- Writes go through service role (bypasses RLS); clients only read shared library

-- form_templates: global rows (user_id null) readable; per-user rows scoped
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS form_templates_select ON public.form_templates;
CREATE POLICY form_templates_select ON public.form_templates FOR SELECT TO authenticated USING (user_id IS NULL OR user_id = auth.uid());
DROP POLICY IF EXISTS form_templates_ins ON public.form_templates;
CREATE POLICY form_templates_ins ON public.form_templates FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS form_templates_upd ON public.form_templates;
CREATE POLICY form_templates_upd ON public.form_templates FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS form_templates_del ON public.form_templates;
CREATE POLICY form_templates_del ON public.form_templates FOR DELETE TO authenticated USING (user_id = auth.uid());

-- processed_emails
ALTER TABLE public.processed_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS processed_emails_policy ON public.processed_emails;
CREATE POLICY processed_emails_policy ON public.processed_emails FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- conversation_log: own rows (user_id defaulted from JWT on insert)
ALTER TABLE public.conversation_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS conversation_log_policy ON public.conversation_log;
CREATE POLICY conversation_log_policy ON public.conversation_log FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tasks_policy ON public.tasks;
CREATE POLICY tasks_policy ON public.tasks FOR ALL TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid())
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- app_config: global (null user) visible to all authenticated; scoped rows per user/child
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_config_select ON public.app_config;
CREATE POLICY app_config_select ON public.app_config FOR SELECT TO authenticated
  USING (
    user_id IS NULL
    OR user_id = auth.uid()
    OR (child_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.children c WHERE c.id = app_config.child_id AND c.user_id = auth.uid()))
  );
DROP POLICY IF EXISTS app_config_write ON public.app_config;
CREATE POLICY app_config_write ON public.app_config FOR ALL TO authenticated
  USING (user_id = auth.uid() OR (child_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.children c WHERE c.id = app_config.child_id AND c.user_id = auth.uid())))
  WITH CHECK (user_id = auth.uid() OR (child_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.children c WHERE c.id = app_config.child_id AND c.user_id = auth.uid())));
