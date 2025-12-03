-- Fix 401 Unauthorized issue for run-scheduled-sends-v2 cron job
-- Use existing service role key from vault

DO $$
DECLARE
    service_role_key TEXT;
    cron_sql TEXT;
BEGIN
    -- Get service role key from vault
    SELECT decrypted_secret INTO service_role_key 
    FROM vault.decrypted_secrets 
    WHERE name = 'SUPABASE_SERVICE_ROLE_KEY';
    
    -- Remove existing cron job if it exists
    PERFORM cron.unschedule('run-scheduled-sends-v2') WHERE EXISTS (
        SELECT 1 FROM cron.job WHERE jobname = 'run-scheduled-sends-v2'
    );
    
    -- Build the cron SQL with proper headers
    cron_sql := 'SELECT net.http_post(' ||
        'url := ''https://dygljrvbxvbrqrihrxyn.supabase.co/functions/v1/run-scheduled-sends-v2'', ' ||
        'headers := jsonb_build_object(' ||
        '''Content-Type'', ''application/json'', ' ||
        '''Authorization'', ''Bearer ' || service_role_key || ''', ' ||
        '''apikey'', ''' || service_role_key || '''), ' ||
        'body := ''{}''::jsonb);';
    
    -- Create new cron job
    PERFORM cron.schedule(
        'run-scheduled-sends-v2',
        '* * * * *',
        cron_sql
    );
    
    RAISE NOTICE 'Cron job recreated with proper authorization headers';
END $$;