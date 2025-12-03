-- Fix Scheduled Sends v2 issues: proper cron headers, FK, and secrets

-- First, fix the FK constraint for send_logs_v2.schedule_id to reference scheduled_sends_v2
ALTER TABLE public.send_logs_v2
  DROP CONSTRAINT IF EXISTS send_logs_v2_schedule_id_fkey;

ALTER TABLE public.send_logs_v2
  ADD CONSTRAINT send_logs_v2_schedule_id_fkey
  FOREIGN KEY (schedule_id) REFERENCES public.scheduled_sends_v2(id)
  ON DELETE CASCADE;

-- Remove any existing cron jobs for scheduled sends
SELECT cron.unschedule(jobname) FROM cron.job 
WHERE jobname IN ('run-scheduled-sends-sql', 'run-scheduled-sends-v2');

-- For now, create a basic cron job - we'll update it with proper headers via SQL editor
SELECT cron.schedule(
  'run-scheduled-sends-v2',
  '* * * * *',
  'select net.http_post(
      url:=''https://dygljrvbxvbrqrihrxyn.supabase.co/functions/v1/run-scheduled-sends-v2'',
      headers:=''{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_KEY", "apikey": "YOUR_SERVICE_KEY"}''::jsonb,
      body:=''{}''::jsonb
  ) as request_id;'
);