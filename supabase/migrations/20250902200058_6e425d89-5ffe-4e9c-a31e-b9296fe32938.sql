-- Create new tables first, then update functions

-- Create user roles table if not exists
CREATE TABLE IF NOT EXISTS public.user_roles (
  user_id uuid PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('admin','customer')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create organization members table (cleaner approach)
CREATE TABLE IF NOT EXISTS public.organization_members (
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('owner','manager','viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

-- Create automation settings table
CREATE TABLE IF NOT EXISTS public.org_automation_settings (
  org_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  wa_confirmed boolean NOT NULL DEFAULT false,
  wa_group_availability text,
  wa_group_matches text,
  wa_group_competitions text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid NOT NULL
);

-- Enable RLS on new tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_automation_settings ENABLE ROW LEVEL SECURITY;

-- Now recreate current_org_id function to use organization_members table instead of profiles
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Create helper functions with SECURITY DEFINER to avoid recursion
CREATE OR REPLACE FUNCTION public.get_user_org_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM organization_members WHERE user_id = p_user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE org_id = p_org_id AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_owner_or_manager(p_org_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE org_id = p_org_id AND user_id = p_user_id AND role IN ('owner', 'manager')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = p_user_id AND role = 'admin'
  );
$$;

-- Fix profiles policies to avoid recursion
DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_server_only ON public.profiles;

CREATE POLICY profiles_select ON public.profiles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR 
  is_admin_user(auth.uid())
);

CREATE POLICY profiles_update ON public.profiles
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY profiles_insert ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Fix organizations policies
DROP POLICY IF EXISTS org_select ON public.organizations;
DROP POLICY IF EXISTS org_update ON public.organizations;
DROP POLICY IF EXISTS org_insert_by_server_only ON public.organizations;

CREATE POLICY org_insert_self ON public.organizations
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY org_select_members ON public.organizations
FOR SELECT TO authenticated
USING (
  created_by = auth.uid() OR
  is_org_member(id, auth.uid()) OR
  is_admin_user(auth.uid())
);

CREATE POLICY org_update_members ON public.organizations
FOR UPDATE TO authenticated
USING (
  created_by = auth.uid() OR
  is_org_owner_or_manager(id, auth.uid()) OR
  is_admin_user(auth.uid())
);

-- Organization members policies
CREATE POLICY member_insert_self ON public.organization_members
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY member_select_self ON public.organization_members
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR
  is_admin_user(auth.uid())
);

CREATE POLICY member_update_owner ON public.organization_members
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid() OR
  is_org_owner_or_manager(org_id, auth.uid()) OR
  is_admin_user(auth.uid())
);

-- Automation settings policies
CREATE POLICY settings_select_members ON public.org_automation_settings
FOR SELECT TO authenticated
USING (
  is_org_member(org_id, auth.uid()) OR
  is_admin_user(auth.uid())
);

CREATE POLICY settings_upsert_owner ON public.org_automation_settings
FOR INSERT TO authenticated
WITH CHECK (
  is_org_owner_or_manager(org_id, auth.uid()) OR
  is_admin_user(auth.uid())
);

CREATE POLICY settings_update_owner ON public.org_automation_settings
FOR UPDATE TO authenticated
USING (
  is_org_owner_or_manager(org_id, auth.uid()) OR
  is_admin_user(auth.uid())
);

-- User roles policies
CREATE POLICY user_roles_select_self ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY user_roles_insert_self ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create RPC functions for onboarding
CREATE OR REPLACE FUNCTION public.onboarding_create_org_and_membership(
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  -- Create or get organization
  INSERT INTO public.organizations (created_by, name)
  VALUES (v_user_id, p_first_name || ' ' || p_last_name || ' Club')
  RETURNING id INTO v_org_id;

  -- Create organization membership
  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (v_org_id, v_user_id, 'owner');

  -- Upsert profile
  INSERT INTO public.profiles (user_id, first_name, last_name, phone, email, organization_id)
  VALUES (v_user_id, p_first_name, p_last_name, p_phone, p_email, v_org_id)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    organization_id = EXCLUDED.organization_id,
    updated_at = now();

  RETURN v_org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.onboarding_update_tenant_details(
  p_org_id uuid,
  p_club_url text,
  p_tenant_id uuid,
  p_tenant_name text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.organizations
  SET 
    playtomic_club_url = p_club_url,
    tenant_id = p_tenant_id,
    name = COALESCE(p_tenant_name, name),
    updated_at = now()
  WHERE id = p_org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.onboarding_save_automation_settings(
  p_org_id uuid,
  p_wa_confirmed boolean,
  p_wa_group_availability text,
  p_wa_group_matches text,
  p_wa_group_competitions text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.org_automation_settings (
    org_id, 
    wa_confirmed, 
    wa_group_availability, 
    wa_group_matches, 
    wa_group_competitions,
    updated_by
  )
  VALUES (
    p_org_id, 
    p_wa_confirmed, 
    p_wa_group_availability, 
    p_wa_group_matches, 
    p_wa_group_competitions,
    auth.uid()
  )
  ON CONFLICT (org_id) 
  DO UPDATE SET
    wa_confirmed = EXCLUDED.wa_confirmed,
    wa_group_availability = EXCLUDED.wa_group_availability,
    wa_group_matches = EXCLUDED.wa_group_matches,
    wa_group_competitions = EXCLUDED.wa_group_competitions,
    updated_at = now(),
    updated_by = EXCLUDED.updated_by;
END;
$$;