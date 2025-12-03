-- Fix the cron job using vault secret
-- First, remove any existing cron jobs
SELECT cron.unschedule('run-scheduled-sends-v2') WHERE EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'run-scheduled-sends-v2'
);

-- Create a new cron job using vault secret
SELECT cron.schedule(
    'run-scheduled-sends-v2',
    '* * * * *', -- Every minute
    $$
    SELECT net.http_post(
        url := 'https://dygljrvbxvbrqrihrxyn.supabase.co/functions/v1/run-scheduled-sends-v2',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || vault.secret('service_role_key'),
            'apikey', vault.secret('service_role_key')
        ),
        body := '{}'::jsonb
    );
    $$
);

-- Check if the cron job was created
SELECT * FROM cron.job WHERE jobname = 'run-scheduled-sends-v2';
