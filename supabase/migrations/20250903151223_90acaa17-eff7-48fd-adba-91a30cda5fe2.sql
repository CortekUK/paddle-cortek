-- Fix function search path warnings for existing functions
ALTER FUNCTION public.update_message_templates_updated_at() 
SET search_path = public;

ALTER FUNCTION public.update_scheduled_sends_updated_at() 
SET search_path = public;

ALTER FUNCTION public.update_updated_at_column() 
SET search_path = public;

ALTER FUNCTION public.set_locations_created_by() 
SET search_path = public;

ALTER FUNCTION public.onboarding_create_org_and_membership(text, text, text, text) 
SET search_path = public;

ALTER FUNCTION public.onboarding_update_tenant_details(uuid, text, uuid, text) 
SET search_path = public;