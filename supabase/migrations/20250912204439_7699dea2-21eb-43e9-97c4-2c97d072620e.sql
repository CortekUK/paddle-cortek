-- Ensure social_post_renders table has correct structure
CREATE TABLE IF NOT EXISTS public.social_post_renders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL,
  template_id uuid NULL,
  source text NOT NULL CHECK (source IN ('COURTS', 'PARTIALS', 'COMPETITIONS')),
  summary_variant text NOT NULL,
  message_content_raw text NOT NULL,
  message_content_resolved text NOT NULL,
  image_url text NOT NULL,
  image_path text NOT NULL,
  width integer NOT NULL DEFAULT 1080,
  height integer NOT NULL DEFAULT 1080,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_post_renders ENABLE ROW LEVEL SECURITY;

-- Create policies for social_post_renders
CREATE POLICY "Users can view renders for their org" 
ON public.social_post_renders 
FOR SELECT 
USING (is_org_member(org_id, auth.uid()) OR is_admin_user(auth.uid()));

CREATE POLICY "Users can create renders for their org" 
ON public.social_post_renders 
FOR INSERT 
WITH CHECK (is_org_member(org_id, auth.uid()) OR is_admin_user(auth.uid()));

CREATE POLICY "Users can delete renders for their org" 
ON public.social_post_renders 
FOR DELETE 
USING (is_org_owner_or_manager(org_id, auth.uid()) OR is_admin_user(auth.uid()));

-- Create storage bucket for social posts if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('social-posts', 'social-posts', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for social-posts bucket
CREATE POLICY "Public read access for social posts" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'social-posts');

CREATE POLICY "Users can upload social posts for their org" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'social-posts' AND auth.role() = 'service_role');

CREATE POLICY "Users can update social posts for their org" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'social-posts' AND auth.role() = 'service_role');

CREATE POLICY "Users can delete social posts for their org" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'social-posts' AND auth.role() = 'service_role');