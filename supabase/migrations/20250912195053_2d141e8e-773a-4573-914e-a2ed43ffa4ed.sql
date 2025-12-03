-- Update social_templates table to support multi-layer design
ALTER TABLE social_templates 
DROP COLUMN IF EXISTS canvas,
ADD COLUMN IF NOT EXISTS layers jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS canvas_w integer NOT NULL DEFAULT 1080,
ADD COLUMN IF NOT EXISTS canvas_h integer NOT NULL DEFAULT 1080,
ADD COLUMN IF NOT EXISTS bg_url text NOT NULL DEFAULT '';

-- Update social_renders table for better tracking
ALTER TABLE social_renders 
ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES social_templates(id),
ADD COLUMN IF NOT EXISTS variant_key text,
ADD COLUMN IF NOT EXISTS payload jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'READY';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_social_templates_org_id ON social_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_social_renders_template_id ON social_renders(template_id);
CREATE INDEX IF NOT EXISTS idx_social_renders_org_status ON social_renders(org_id, status);