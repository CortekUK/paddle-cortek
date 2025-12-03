-- Remove ALL existing cron jobs for scheduled sends
SELECT cron.unschedule(jobname) FROM cron.job 
WHERE jobname IN ('run-scheduled-sends', 'run-scheduled-sends-v2', 'run-scheduled-sends-sql');

-- Create the correct cron job with proper name
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

-- Verify the cron job was created with correct name
SELECT jobname, schedule, active FROM cron.job WHERE jobname LIKE '%scheduled%';

-- Test the function manually to see if it works
SELECT net.http_post(
    url := 'https://dygljrvbxvbrqrihrxyn.supabase.co/functions/v1/run-scheduled-sends-v2',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || vault.secret('service_role_key'),
        'apikey', vault.secret('service_role_key')
    ),
    body := '{}'::jsonb
);
