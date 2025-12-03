-- Fix cron job by recreating it with proper service role key
DO $$
DECLARE
    service_role_key TEXT;
BEGIN
    -- Get service role key from vault
    SELECT decrypted_secret INTO service_role_key 
    FROM vault.decrypted_secrets 
    WHERE name = 'SUPABASE_SERVICE_ROLE_KEY';
    
    -- Remove existing cron job
    PERFORM cron.unschedule('run-scheduled-sends-v2');
    
    -- Create new cron job with proper service role key
    PERFORM cron.schedule(
        'run-scheduled-sends-v2',
        '* * * * *',
        format('select net.http_post(
            url:=''https://dygljrvbxvbrqrihrxyn.supabase.co/functions/v1/run-scheduled-sends-v2'',
            headers:=''{"Content-Type": "application/json", "Authorization": "Bearer %s", "apikey": "%s"}''::jsonb,
            body:=''{}''::jsonb
        ) as request_id;', service_role_key, service_role_key)
    );
END $$;