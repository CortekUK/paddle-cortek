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

-- Create new cron job that calls Edge Function every 1 minute with proper headers from secrets
DO $$
DECLARE
    service_role_key TEXT;
    cron_command TEXT;
BEGIN
    -- Get service role key from vault
    SELECT decrypted_secret INTO service_role_key 
    FROM vault.decrypted_secrets 
    WHERE name = 'SUPABASE_SERVICE_ROLE_KEY';
    
    -- Build the cron command with proper headers
    cron_command := format(
        $$select net.http_post(
            url:='https://dygljrvbxvbrqrihrxyn.supabase.co/functions/v1/run-scheduled-sends-v2',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer %s", "apikey": "%s"}'::jsonb,
            body:='{}'::jsonb
        ) as request_id;$$,
        service_role_key,
        service_role_key
    );
    
    -- Schedule the cron job
    PERFORM cron.schedule(
        'run-scheduled-sends-v2',
        '* * * * *',
        cron_command
    );
END $$;