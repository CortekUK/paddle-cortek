-- Fix 401 Unauthorized issue for run-scheduled-sends-v2 cron job

-- 1. Store service role key in database settings
ALTER DATABASE postgres 
SET app.settings.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Z2xqcnZieHZicnFyaWhyeHluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjEyODU2OCwiZXhwIjoyMDcxNzA0NTY4fQ.dciy8xhvmrCX4lJsgaD3TddIgCYCDkhNXDGNp3tzmP0';

-- 2. Remove existing cron jobs (clean slate)
SELECT cron.unschedule('run-scheduled-sends-v2') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'run-scheduled-sends-v2'
);

-- 3. Create new cron job with proper Authorization and apikey headers
SELECT cron.schedule(
  'run-scheduled-sends-v2',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://dygljrvbxvbrqrihrxyn.supabase.co/functions/v1/run-scheduled-sends-v2',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.SUPABASE_SERVICE_ROLE_KEY', true),
      'apikey', current_setting('app.settings.SUPABASE_SERVICE_ROLE_KEY', true)
    ),
    body := '{}'::jsonb
  );
  $$
);