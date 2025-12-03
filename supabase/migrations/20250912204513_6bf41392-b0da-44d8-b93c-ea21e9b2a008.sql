-- Drop existing policies for social_post_renders if they exist
DROP POLICY IF EXISTS "Users can view renders for their org" ON public.social_post_renders;
DROP POLICY IF EXISTS "Users can create renders for their org" ON public.social_post_renders;  
DROP POLICY IF EXISTS "Users can delete renders for their org" ON public.social_post_renders;

-- Recreate policies with correct logic
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

-- Ensure storage bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('social-posts', 'social-posts', true)
ON CONFLICT (id) DO NOTHING;

-- Drop and recreate storage policies for social-posts bucket
DROP POLICY IF EXISTS "Public read access for social posts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload social posts for their org" ON storage.objects;
DROP POLICY IF EXISTS "Users can update social posts for their org" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete social posts for their org" ON storage.objects;

CREATE POLICY "Public read access for social posts" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'social-posts');

CREATE POLICY "Service role can manage social posts" 
ON storage.objects 
FOR ALL
USING (bucket_id = 'social-posts' AND auth.role() = 'service_role')
WITH CHECK (bucket_id = 'social-posts' AND auth.role() = 'service_role');