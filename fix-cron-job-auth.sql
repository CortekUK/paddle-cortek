-- Fix the cron job with working service role key
-- First, remove the existing cron job
SELECT cron.unschedule('run-scheduled-sends-v2') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'run-scheduled-sends-v2'
);

-- Create a new cron job with the working service role key
SELECT cron.schedule(
    'run-scheduled-sends-v2',
    '* * * * *', -- Every minute
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

-- Verify the cron job was created
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'run-scheduled-sends-v2';

-- Test the function manually to verify it works
SELECT net.http_post(
    url := 'https://dygljrvbxvbrqrihrxyn.supabase.co/functions/v1/run-scheduled-sends-v2',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Z2xqcnZieHZicnFyaWhyeHluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjEyODU2OCwiZXhwIjoyMDcxNzA0NTY4fQ.dciy8xhvmrCX4lJsgaD3TddIgCYCDkhNXDGNp3tzmP0',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Z2xqcnZieHZicnFyaWhyeHluIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjEyODU2OCwiZXhwIjoyMDcxNzA0NTY4fQ.dciy8xhvmrCX4lJsgaD3TddIgCYCDkhNXDGNp3tzmP0'
    ),
    body := '{}'::jsonb
);
