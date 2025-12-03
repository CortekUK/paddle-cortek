-- Extend social_post_schedules for daily and range scheduling
CREATE TABLE IF NOT EXISTS public.social_post_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  template_id uuid NOT NULL,
  source text NOT NULL,
  target text DEFAULT 'TODAY',
  summary_variant text,
  time_local text,
  tz text DEFAULT 'Europe/London',
  frequency text DEFAULT 'ONE_OFF' CHECK (frequency IN ('ONE_OFF','DAILY','RANGE_DAILY')),
  run_at_utc timestamptz,
  next_run_at_utc timestamptz,
  last_run_at_utc timestamptz,
  range_start_utc timestamptz,
  range_end_utc timestamptz,
  status text DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PAUSED','COMPLETED','CANCELLED')),
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_social_post_schedules_next ON public.social_post_schedules (status, next_run_at_utc);
CREATE INDEX IF NOT EXISTS idx_social_post_schedules_org ON public.social_post_schedules (org_id, status);


