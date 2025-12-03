-- Social Media Library: Templates table
CREATE TABLE public.social_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  bg_url text NOT NULL,
  canvas jsonb NOT NULL,
  layers jsonb NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Social Media Library: Rendered posts
CREATE TABLE public.social_renders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source text NOT NULL,
  summary_variant text NOT NULL,
  template_id uuid REFERENCES social_templates(id),
  target text NOT NULL,
  run_at_utc timestamptz NOT NULL,
  result_url text NOT NULL,
  inputs jsonb NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Social Media Library: Schedules for automatic image generation
CREATE TABLE public.social_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source text NOT NULL,
  summary_variant text NOT NULL,
  template_id uuid NOT NULL REFERENCES social_templates(id),
  target text NOT NULL,
  tz text NOT NULL,
  time_local text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  next_run_at_utc timestamptz NOT NULL,
  last_run_at_utc timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.social_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_renders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for social_templates
CREATE POLICY "Templates: org members can view"
  ON public.social_templates
  FOR SELECT
  USING (is_org_member(org_id, auth.uid()) OR is_admin_user(auth.uid()));

CREATE POLICY "Templates: org owners/managers can manage"
  ON public.social_templates
  FOR ALL
  USING (is_org_owner_or_manager(org_id, auth.uid()) OR is_admin_user(auth.uid()))
  WITH CHECK (is_org_owner_or_manager(org_id, auth.uid()) OR is_admin_user(auth.uid()));

-- RLS Policies for social_renders
CREATE POLICY "Renders: org members can view"
  ON public.social_renders
  FOR SELECT
  USING (is_org_member(org_id, auth.uid()) OR is_admin_user(auth.uid()));

CREATE POLICY "Renders: system can insert"
  ON public.social_renders
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Renders: org owners/managers can delete"
  ON public.social_renders
  FOR DELETE
  USING (is_org_owner_or_manager(org_id, auth.uid()) OR is_admin_user(auth.uid()));

-- RLS Policies for social_schedules
CREATE POLICY "Schedules: org members can view"
  ON public.social_schedules
  FOR SELECT
  USING (is_org_member(org_id, auth.uid()) OR is_admin_user(auth.uid()));

CREATE POLICY "Schedules: org owners/managers can manage"
  ON public.social_schedules
  FOR ALL
  USING (is_org_owner_or_manager(org_id, auth.uid()) OR is_admin_user(auth.uid()))
  WITH CHECK (is_org_owner_or_manager(org_id, auth.uid()) OR is_admin_user(auth.uid()));

-- Create storage bucket for social media assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('social-media', 'social-media', true);

-- Storage policies for social media bucket
CREATE POLICY "Social media: org members can view"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'social-media');

CREATE POLICY "Social media: org members can upload"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'social-media' AND auth.uid() IS NOT NULL);

-- Triggers for updating timestamps
CREATE TRIGGER update_social_templates_updated_at
  BEFORE UPDATE ON public.social_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_schedules_updated_at
  BEFORE UPDATE ON public.social_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();