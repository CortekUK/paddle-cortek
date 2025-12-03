-- Update cron job with proper service role key from secrets
DO $$
DECLARE
    service_role_key TEXT;
    new_command TEXT;
BEGIN
    -- Get service role key from vault
    SELECT decrypted_secret INTO service_role_key 
    FROM vault.decrypted_secrets 
    WHERE name = 'SUPABASE_SERVICE_ROLE_KEY';
    
    -- Build the new command with the actual service role key
    new_command := replace(
        replace(
            (SELECT command FROM cron.job WHERE jobname = 'run-scheduled-sends-v2'),
            'YOUR_SERVICE_KEY',
            service_role_key
        ),
        'Bearer YOUR_SERVICE_KEY',
        'Bearer ' || service_role_key
    );
    
    -- Update the cron job with proper keys
    UPDATE cron.job 
    SET command = new_command 
    WHERE jobname = 'run-scheduled-sends-v2';
END $$;