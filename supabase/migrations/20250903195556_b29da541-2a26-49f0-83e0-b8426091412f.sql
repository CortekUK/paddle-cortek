-- Fix cron job to use service role key and run every minute
SELECT cron.unschedule('run-availability-schedules-every-5-min');

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