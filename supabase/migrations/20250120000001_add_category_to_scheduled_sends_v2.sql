-- Add category column to scheduled_sends_v2 table
ALTER TABLE public.scheduled_sends_v2 
ADD COLUMN category text NOT NULL DEFAULT 'AVAILABILITY' 
CHECK (category IN ('AVAILABILITY', 'PARTIAL_MATCHES', 'COMPETITIONS_ACADEMIES'));

-- Create index on category for better performance
CREATE INDEX ON public.scheduled_sends_v2 (category, status, next_run_at_utc);
