-- Add event_id and summary_variant fields to social_templates for event locking
ALTER TABLE public.social_templates
  ADD COLUMN IF NOT EXISTS event_id text,
  ADD COLUMN IF NOT EXISTS summary_variant text,
  ADD COLUMN IF NOT EXISTS source_category text CHECK (source_category IN ('COURT_AVAILABILITY', 'PARTIAL_MATCHES', 'COMPETITIONS_ACADEMIES'));

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_social_templates_source_category 
  ON public.social_templates(source_category);

