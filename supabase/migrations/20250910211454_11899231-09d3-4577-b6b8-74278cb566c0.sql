-- Create cron schedule for social post processing
SELECT
  cron.schedule(
    'run-social-post-schedules',
    '*/5 * * * *', -- every 5 minutes
    $$
    SELECT
      net.http_post(
        url:='https://dygljrvbxvbrqrihrxyn.supabase.co/functions/v1/run-social-post-schedules',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.supabase_service_key', true) || '"}'::jsonb,
        body:=concat('{"triggered_at": "', now(), '"}')::jsonb
      ) as request_id;
    $$
  );