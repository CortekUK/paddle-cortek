-- Clean up duplicate incomplete organization for m2@gmail.com
-- Delete the membership to the incomplete organization first
DELETE FROM public.organization_members 
WHERE org_id = '7d7ac656-0ee8-48e9-856e-eabaab1dbe0c'
  AND user_id = (SELECT id FROM auth.users WHERE email = 'm2@gmail.com');

-- Then delete the empty organization record  
DELETE FROM public.organizations 
WHERE id = '7d7ac656-0ee8-48e9-856e-eabaab1dbe0c'
  AND tenant_id IS NULL;