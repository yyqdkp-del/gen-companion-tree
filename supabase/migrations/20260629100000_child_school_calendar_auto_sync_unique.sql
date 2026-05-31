-- Dedupe school_auto_sync calendar rows for upsert on (child_id, date_start, title)
CREATE UNIQUE INDEX IF NOT EXISTS child_school_calendar_auto_sync_uniq
  ON public.child_school_calendar (child_id, date_start, title)
  WHERE source = 'school_auto_sync' AND date_start IS NOT NULL;
