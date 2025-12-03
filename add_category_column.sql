-- Add category column to scheduled_sends_v2 table
ALTER TABLE public.scheduled_sends_v2 
ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'AVAILABILITY' 
CHECK (category IN ('AVAILABILITY', 'PARTIAL_MATCHES', 'COMPETITIONS_ACADEMIES'));

-- Create index on category for better performance
CREATE INDEX IF NOT EXISTS idx_scheduled_sends_v2_category_status_next_run 
ON public.scheduled_sends_v2 (category, status, next_run_at_utc);
