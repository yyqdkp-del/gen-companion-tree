-- Gmail + PDF 结构化提取：processed_emails 扩展字段；校历/待办关联

ALTER TABLE public.processed_emails
  ADD COLUMN IF NOT EXISTS from_address TEXT,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS extracted_events JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS extracted_amounts JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS extracted_requirements JSONB DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS attachment_count INTEGER DEFAULT 0;

ALTER TABLE public.child_school_calendar
  ADD COLUMN IF NOT EXISTS source_email_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS child_school_calendar_gmail_uniq
  ON public.child_school_calendar (user_id, child_id, title, date_start)
  WHERE source = 'gmail' AND date_start IS NOT NULL AND child_id IS NOT NULL;
