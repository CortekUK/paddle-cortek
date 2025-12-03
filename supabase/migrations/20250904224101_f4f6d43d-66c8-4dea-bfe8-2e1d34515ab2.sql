-- Fix 401 Unauthorized issue for run-scheduled-sends-v2 cron job
-- Use existing service role key from vault instead of database settings

DO $$
DECLARE
    service_role_key TEXT;
BEGIN
    -- Get service role key from vault (it should already exist)
    SELECT decrypted_secret INTO service_role_key 
    FROM vault.decrypted_secrets 
    WHERE name = 'SUPABASE_SERVICE_ROLE_KEY';
    
    -- Remove existing cron job if it exists
    PERFORM cron.unschedule('run-scheduled-sends-v2') WHERE EXISTS (
        SELECT 1 FROM cron.job WHERE jobname = 'run-scheduled-sends-v2'
    );
    
    -- Create new cron job with proper Authorization and apikey headers using vault secret
    PERFORM cron.schedule(
        'run-scheduled-sends-v2',
        '* * * * *',
        format($$
        SELECT net.http_post(
            url := 'https://dygljrvbxvbrqrihrxyn.supabase.co/functions/v1/run-scheduled-sends-v2',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer %s',
                'apikey', '%s'
            ),
            body := '{}'::jsonb
        );
        $$, service_role_key, service_role_key)
    );
    
    RAISE NOTICE 'Cron job recreated with service role key from vault';
END $$;