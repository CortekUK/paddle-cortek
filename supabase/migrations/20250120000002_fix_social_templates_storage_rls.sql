-- Fix RLS policies for social-templates storage bucket
-- Simplify policies to directly check organization_members table

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view social template files for their org" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload social template files for their org" ON storage.objects;
DROP POLICY IF EXISTS "Users can update social template files for their org" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete social template files for their org" ON storage.objects;

-- Create simpler policies that directly check organization_members
CREATE POLICY "Users can view social template files for their org" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'social-templates' AND 
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.organizations 
    WHERE id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can upload social template files for their org" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'social-templates' AND 
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.organizations 
    WHERE id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can update social template files for their org" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'social-templates' AND 
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.organizations 
    WHERE id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Users can delete social template files for their org" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'social-templates' AND 
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.organizations 
    WHERE id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
  )
);

