
-- 1) Enable required extensions (safe to run multiple times)
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema extensions;

-- 2) Create a cron job to invoke the runner every 5 minutes (idempotent)
do $$
begin
  if not exists (
    select 1 from cron.job where jobname = 'run-availability-schedules-every-5-min'
  ) then
    perform cron.schedule(
      'run-availability-schedules-every-5-min',
      '*/5 * * * *',
      $$
      select
        net.http_post(
          url:='https://dygljrvbxvbrqrihrxyn.supabase.co/functions/v1/run-availability-schedules',
          headers:='{
            "Content-Type": "application/json",
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Z2xqcnZieHZicnFyaWhyeHluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjg1NjgsImV4cCI6MjA3MTcwNDU2OH0.yXxoz0eCIg5TS-RJfEYuspR9ApPjER4Ru2Ieeckxek0"
          }'::jsonb,
          body:='{}'::jsonb
        );
      $$
    );
  end if;
end
$$;

-- 3) Trigger one immediate call to the runner (will only process schedules that are due right now)
select
  net.http_post(
    url:='https://dygljrvbxvbrqrihrxyn.supabase.co/functions/v1/run-availability-schedules',
    headers:='{
      "Content-Type": "application/json",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Z2xqcnZieHZicnFyaWhyeHluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjg1NjgsImV4cCI6MjA3MTcwNDU2OH0.yXxoz0eCIg5TS-RJfEYuspR9ApPjER4Ru2Ieeckxek0"
    }'::jsonb,
    body:='{}'::jsonb
  );
