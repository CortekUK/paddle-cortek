-- Add background image properties to social_templates table
ALTER TABLE public.social_templates 
ADD COLUMN IF NOT EXISTS bg_natural_w integer,
ADD COLUMN IF NOT EXISTS bg_natural_h integer,
ADD COLUMN IF NOT EXISTS bg_fit text DEFAULT 'cover' CHECK (bg_fit IN ('cover', 'contain')),
ADD COLUMN IF NOT EXISTS bg_offset_x integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS bg_offset_y integer DEFAULT 0;