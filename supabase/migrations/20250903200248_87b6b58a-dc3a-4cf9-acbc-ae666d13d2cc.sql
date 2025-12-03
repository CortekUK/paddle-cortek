-- Enable required extensions first
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Remove old cron job if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'run-availability-schedules-every-5-min') THEN
    PERFORM cron.unschedule('run-availability-schedules-every-5-min');
  END IF;
END $$;

-- Create new cron job with service role key and 1-minute interval
SELECT cron.schedule(
  'run-availability-schedules-every-1-min',
  '* * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://dygljrvbxvbrqrihrxyn.supabase.co/functions/v1/run-availability-schedules',
      headers:='{
        "Content-Type": "application/json",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Z2xqcnZieHZicnFyaWhyeHluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjEyODU2OCwiZXhwIjoyMDcxNzA0NTY4fQ.uzZfKijlGX7VE-Yg2dz6kaEwxfGlk_IKuBQQJCaQc-s"
      }'::jsonb,
      body:='{}'::jsonb
    );
  $$
);