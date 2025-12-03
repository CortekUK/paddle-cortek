-- Add CANCELLED to the status check constraint
ALTER TABLE public.social_post_schedules 
DROP CONSTRAINT social_post_schedules_status_check;

ALTER TABLE public.social_post_schedules 
ADD CONSTRAINT social_post_schedules_status_check 
CHECK (status = ANY (ARRAY['ACTIVE'::text, 'PAUSED'::text, 'COMPLETED'::text, 'CANCELLED'::text]));