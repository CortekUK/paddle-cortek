-- Fix FK constraint for send_logs_v2.schedule_id to reference scheduled_sends_v2
ALTER TABLE public.send_logs_v2
  DROP CONSTRAINT IF EXISTS send_logs_v2_schedule_id_fkey;

ALTER TABLE public.send_logs_v2
  ADD CONSTRAINT send_logs_v2_schedule_id_fkey
  FOREIGN KEY (schedule_id) REFERENCES public.scheduled_sends_v2(id)
  ON DELETE CASCADE;

-- Remove the SQL function cron job (keep only Edge Function cron)
SELECT cron.unschedule('run-scheduled-sends-sql') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'run-scheduled-sends-sql'
);

-- Update the Edge Function cron to run every 1 minute instead of 5
SELECT cron.unschedule('run-scheduled-sends-v2') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'run-scheduled-sends-v2'
);

SELECT cron.schedule(
  'run-scheduled-sends-v2',
  '* * * * *',
  $$
  select
    net.http_post(
        url:='https://dygljrvbxvbrqrihrxyn.supabase.co/functions/v1/run-scheduled-sends-v2',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Z2xqcnZieHZicnFyaWhyeHluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjEyODU2OCwiZXhwIjoyMDcxNzA0NTY4fQ.Q6Trx2Rx5tAOxFdDQ4vXnVsx0_0A7uhEwkm7fBpd2Cw"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);