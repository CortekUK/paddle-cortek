-- Fix 401 Unauthorized issue by recreating cron job with service role key

-- Remove existing cron jobs
SELECT cron.unschedule('run-scheduled-sends-v2') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'run-scheduled-sends-v2'
);

-- Create new cron job with proper Authorization and apikey headers
SELECT cron.schedule(
    'run-scheduled-sends-v2',
    '* * * * *',
    $$
    SELECT net.http_post(
        url := 'https://dygljrvbxvbrqrihrxyn.supabase.co/functions/v1/run-scheduled-sends-v2',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Z2xqcnZieHZicnFyaWhyeHluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjEyODU2OCwiZXhwIjoyMDcxNzA0NTY4fQ.dciy8xhvmrCX4lJsgaD3TddIgCYCDkhNXDGNp3tzmP0',
            'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Z2xqcnZieHZicnFyaWhyeHluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjEyODU2OCwiZXhwIjoyMDcxNzA0NTY4fQ.dciy8xhvmrCX4lJsgaD3TddIgCYCDkhNXDGNp3tzmP0'
        ),
        body := '{}'::jsonb
    );
    $$
);