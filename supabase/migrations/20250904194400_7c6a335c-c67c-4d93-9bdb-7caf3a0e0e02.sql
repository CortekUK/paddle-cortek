-- Create scheduled_sends_v2 table
CREATE TABLE public.scheduled_sends_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  time_local text NOT NULL CHECK (time_local ~ '^\d{2}:\d{2}$'), -- 'HH:mm'
  tz text NOT NULL,
  target text NOT NULL CHECK (target IN ('TODAY','TOMORROW')),
  whatsapp_group text NOT NULL,
  template_id uuid NOT NULL REFERENCES public.message_templates(id),
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PAUSED')),
  next_run_at_utc timestamptz NOT NULL,
  last_run_at_utc timestamptz,
  last_status text,
  last_error text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX ON public.scheduled_sends_v2 (status, next_run_at_utc);
CREATE INDEX ON public.scheduled_sends_v2 (org_id);

-- Enable RLS
ALTER TABLE public.scheduled_sends_v2 ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Schedules v2: org members can view" 
ON public.scheduled_sends_v2 
FOR SELECT 
USING (is_org_member(org_id, auth.uid()) OR is_admin_user(auth.uid()));

CREATE POLICY "Schedules v2: org owners/managers can manage" 
ON public.scheduled_sends_v2 
FOR ALL 
USING (is_org_owner_or_manager(org_id, auth.uid()) OR is_admin_user(auth.uid()))
WITH CHECK (is_org_owner_or_manager(org_id, auth.uid()) OR is_admin_user(auth.uid()));

-- Create or update send_logs_v2 table
CREATE TABLE IF NOT EXISTS public.send_logs_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  schedule_id uuid,
  category text NOT NULL,
  status text NOT NULL,
  response_text text,
  message_excerpt text,
  whatsapp_group text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for send_logs_v2
CREATE INDEX IF NOT EXISTS idx_send_logs_v2_org ON public.send_logs_v2 (org_id);
CREATE INDEX IF NOT EXISTS idx_send_logs_v2_sched ON public.send_logs_v2 (schedule_id);

-- Update cron job to use new runner
SELECT cron.unschedule('run-availability-schedules-every-1-min');
SELECT cron.schedule(
  'run-scheduled-sends-v2-every-1-min',
  '* * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://dygljrvbxvbrqrihrxyn.supabase.co/functions/v1/run-scheduled-sends-v2',
      headers:='{
        "Content-Type": "application/json",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Z2xqcnZieHZicnFyaWhyeHluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjEyODU2OCwiZXhwIjoyMDcxNzA0NTY4fQ.uzZfKijlGX7VE-Yg2dz6kaEwxfGlk_IKuBQQJCaQc-s"
      }'::jsonb,
      body:='{}'::jsonb
    );
  $$
);