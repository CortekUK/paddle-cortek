-- Update social_templates table structure for Fabric.js integration
ALTER TABLE social_templates 
  ADD COLUMN IF NOT EXISTS canvas_w INTEGER NOT NULL DEFAULT 1080,
  ADD COLUMN IF NOT EXISTS canvas_h INTEGER NOT NULL DEFAULT 1080;

-- Update the layers column to store Fabric.js compatible JSON
UPDATE social_templates SET layers = '[]'::jsonb WHERE layers IS NULL;

-- Create social_renders table for generated images
CREATE TABLE IF NOT EXISTS social_renders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('COURT_AVAILABILITY', 'PARTIAL_MATCHES', 'COMPETITIONS')),
  template_id UUID REFERENCES social_templates(id) ON DELETE CASCADE,
  compiled_text TEXT NOT NULL,
  compiled_payload JSONB NOT NULL,
  bg_url TEXT,
  layers JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RENDERING', 'COMPLETED', 'FAILED')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create social_post_schedules table for scheduled rendering
CREATE TABLE IF NOT EXISTS social_post_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('COURT_AVAILABILITY', 'PARTIAL_MATCHES', 'COMPETITIONS')),
  template_id UUID NOT NULL REFERENCES social_templates(id) ON DELETE CASCADE,
  compiled_payload JSONB NOT NULL,
  run_at_utc TIMESTAMPTZ NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'ONCE' CHECK (frequency IN ('ONCE', 'DAILY', 'WEEKLY')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED')),
  last_run_at_utc TIMESTAMPTZ,
  next_run_at_utc TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on social_renders
ALTER TABLE social_renders ENABLE ROW LEVEL SECURITY;

-- RLS policies for social_renders
CREATE POLICY "Renders: org members can view" 
ON social_renders FOR SELECT 
USING (is_org_member(org_id, auth.uid()) OR is_admin_user(auth.uid()));

CREATE POLICY "Renders: org owners/managers can delete" 
ON social_renders FOR DELETE 
USING (is_org_owner_or_manager(org_id, auth.uid()) OR is_admin_user(auth.uid()));

CREATE POLICY "Renders: system can insert" 
ON social_renders FOR INSERT 
WITH CHECK (true);

-- Enable RLS on social_post_schedules
ALTER TABLE social_post_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies for social_post_schedules
CREATE POLICY "Schedules: org members can view" 
ON social_post_schedules FOR SELECT 
USING (is_org_member(org_id, auth.uid()) OR is_admin_user(auth.uid()));

CREATE POLICY "Schedules: org owners/managers can manage" 
ON social_post_schedules FOR ALL 
USING (is_org_owner_or_manager(org_id, auth.uid()) OR is_admin_user(auth.uid()))
WITH CHECK (is_org_owner_or_manager(org_id, auth.uid()) OR is_admin_user(auth.uid()));

-- Create storage bucket for rendered images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('social-renders', 'social-renders', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for social-renders bucket
CREATE POLICY "Rendered images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'social-renders');

CREATE POLICY "System can upload rendered images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'social-renders');

-- Add updated_at trigger for social_renders
CREATE TRIGGER update_social_renders_updated_at
BEFORE UPDATE ON social_renders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for social_post_schedules
CREATE TRIGGER update_social_post_schedules_updated_at
BEFORE UPDATE ON social_post_schedules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();