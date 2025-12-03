-- Fix message_templates category constraint to match the actual categories used in the codebase
-- Update constraint to allow: 'AVAILABILITY', 'PARTIAL_MATCHES', 'COMPETITIONS_ACADEMIES'

-- Drop the old constraint
ALTER TABLE public.message_templates 
  DROP CONSTRAINT IF EXISTS message_templates_category_check;

-- Add new constraint with correct values
ALTER TABLE public.message_templates 
  ADD CONSTRAINT message_templates_category_check 
  CHECK (category IN ('AVAILABILITY', 'PARTIAL_MATCHES', 'COMPETITIONS_ACADEMIES'));

