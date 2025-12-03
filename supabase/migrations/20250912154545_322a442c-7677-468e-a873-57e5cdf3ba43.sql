-- Create storage bucket for social posts
INSERT INTO storage.buckets (id, name, public) VALUES ('social-posts', 'social-posts', true);

-- Create social_post_renders table
CREATE TABLE public.social_post_renders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL,
  template_id uuid NOT NULL REFERENCES public.social_templates(id),
  source text NOT NULL CHECK (source IN ('COURT_AVAILABILITY','PARTIAL_MATCHES','COMPETITIONS')),
  summary_variant text,
  message_content_raw text NOT NULL,
  message_content_resolved text NOT NULL,
  image_path text NOT NULL,
  image_url text NOT NULL,
  width int NOT NULL,
  height int NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_post_renders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view renders for their org"
ON public.social_post_renders
FOR SELECT
USING (is_org_member(org_id, auth.uid()) OR is_admin_user(auth.uid()));

CREATE POLICY "Users can create renders for their org"
ON public.social_post_renders
FOR INSERT
WITH CHECK (is_org_member(org_id, auth.uid()) OR is_admin_user(auth.uid()));

-- Storage policies for social-posts bucket
CREATE POLICY "Users can view social posts for their org"
ON storage.objects
FOR SELECT
USING (bucket_id = 'social-posts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload social posts for their org"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'social-posts' AND auth.uid()::text = (storage.foldername(name))[1]);