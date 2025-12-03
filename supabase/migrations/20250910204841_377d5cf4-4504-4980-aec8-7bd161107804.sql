-- Create storage bucket for social templates
INSERT INTO storage.buckets (id, name, public) VALUES ('social-templates', 'social-templates', true);

-- Create RLS policies for social templates bucket
CREATE POLICY "Users can view social template files for their org" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'social-templates' AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text);

CREATE POLICY "Users can upload social template files for their org" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'social-templates' AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text);

CREATE POLICY "Users can update social template files for their org" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'social-templates' AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text);

CREATE POLICY "Users can delete social template files for their org" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'social-templates' AND (storage.foldername(name))[1] = get_user_org_id(auth.uid())::text);