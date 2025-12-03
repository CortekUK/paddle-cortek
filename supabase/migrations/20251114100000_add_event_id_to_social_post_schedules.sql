-- Add event_id field to social_post_schedules for event locking support
ALTER TABLE public.social_post_schedules
  ADD COLUMN IF NOT EXISTS event_id text;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_social_post_schedules_event_id 
  ON public.social_post_schedules(event_id) 
  WHERE event_id IS NOT NULL;

