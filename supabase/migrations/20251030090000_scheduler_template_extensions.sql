-- Extend message_templates and scheduled_sends_v2 to support variants, events, custom ranges, and one-off runs

-- 1) message_templates extensions
ALTER TABLE public.message_templates
  ADD COLUMN IF NOT EXISTS module text CHECK (module IN ('PARTIAL_MATCHES','COMPETITIONS_ACADEMIES')),
  ADD COLUMN IF NOT EXISTS summary_variant text,
  ADD COLUMN IF NOT EXISTS linked_event_id text,
  ADD COLUMN IF NOT EXISTS whatsapp_group text;

-- Optional partial index for faster org/category queries (if templates are large)
CREATE INDEX IF NOT EXISTS idx_message_templates_org_category
  ON public.message_templates (org_id, category);

-- 2) scheduled_sends_v2 extensions
ALTER TABLE public.scheduled_sends_v2
  ADD COLUMN IF NOT EXISTS summary_variant text,
  ADD COLUMN IF NOT EXISTS event_id text,
  ADD COLUMN IF NOT EXISTS date_start_utc timestamptz,
  ADD COLUMN IF NOT EXISTS date_end_utc timestamptz,
  ADD COLUMN IF NOT EXISTS is_one_off boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS run_at_utc timestamptz;

-- Helpful composite indexes
CREATE INDEX IF NOT EXISTS idx_schedules_v2_oneoff_run
  ON public.scheduled_sends_v2 (is_one_off, run_at_utc);

-- Ensure existing category index exists (guarded)
CREATE INDEX IF NOT EXISTS idx_schedules_v2_category_status_next
  ON public.scheduled_sends_v2 (category, status, next_run_at_utc);


