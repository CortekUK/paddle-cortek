-- Check scheduled sends in the database
SELECT 
  id,
  name,
  time_local,
  tz,
  target,
  whatsapp_group,
  template_id,
  status,
  category,
  next_run_at_utc,
  created_at,
  updated_at
FROM public.scheduled_sends_v2 
ORDER BY created_at DESC;

-- Check current time in UTC
SELECT NOW() as current_utc_time;

-- Check if any schedules are due to run
SELECT 
  name,
  next_run_at_utc,
  NOW() as current_time,
  (next_run_at_utc <= NOW()) as is_due
FROM public.scheduled_sends_v2 
WHERE status = 'ACTIVE'
ORDER BY next_run_at_utc;
