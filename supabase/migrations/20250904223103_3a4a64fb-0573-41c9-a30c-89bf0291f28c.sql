-- Fix Scheduled Sends v2 issues: proper cron headers, FK, and secrets

-- First, fix the FK constraint for send_logs_v2.schedule_id to reference scheduled_sends_v2
ALTER TABLE public.send_logs_v2
  DROP CONSTRAINT IF EXISTS send_logs_v2_schedule_id_fkey;

ALTER TABLE public.send_logs_v2
  ADD CONSTRAINT send_logs_v2_schedule_id_fkey
  FOREIGN KEY (schedule_id) REFERENCES public.scheduled_sends_v2(id)
  ON DELETE CASCADE;

-- Remove any existing cron jobs for scheduled sends
SELECT cron.unschedule('run-scheduled-sends-sql') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'run-scheduled-sends-sql'
);

SELECT cron.unschedule('run-scheduled-sends-v2') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'run-scheduled-sends-v2'
);

-- Create new cron job that calls Edge Function every 1 minute with proper headers from secrets
DO $$
DECLARE
    service_role_key TEXT;
BEGIN
    -- Get service role key from vault
    SELECT decrypted_secret INTO service_role_key 
    FROM vault.decrypted_secrets 
    WHERE name = 'SUPABASE_SERVICE_ROLE_KEY';
    
    -- Schedule the cron job with proper headers
    PERFORM cron.schedule(
        'run-scheduled-sends-v2',
        '* * * * *',
        format(
            $$
            SELECT
              net.http_post(
                  url:='https://dygljrvbxvbrqrihrxyn.supabase.co/functions/v1/run-scheduled-sends-v2',
                  headers:='{"Content-Type": "application/json", "Authorization": "Bearer %s", "apikey": "%s"}'::jsonb,
                  body:='{}'::jsonb
              ) as request_id;
            $$,
            service_role_key,
            service_role_key
        )
    );
END $$;