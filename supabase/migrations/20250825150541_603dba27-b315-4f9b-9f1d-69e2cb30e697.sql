
-- 1) Enforce: non-admins cannot create locations
-- Drop the previous permissive INSERT policy that allowed users to create one location
DROP POLICY IF EXISTS "Users can create one location" ON public.locations;

-- Ensure created_by is automatically set on insert (used by existing policies)
DROP TRIGGER IF EXISTS set_locations_created_by_trigger ON public.locations;
CREATE TRIGGER set_locations_created_by_trigger
BEFORE INSERT ON public.locations
FOR EACH ROW
EXECUTE FUNCTION public.set_locations_created_by();

-- Note: The existing policy "Admins can manage all locations" already allows admins to INSERT/SELECT/UPDATE/DELETE

-- 2) Admin action logs (for auditing user/role/location changes)
CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,                         -- e.g. 'promote_user', 'demote_user', 'remove_from_location'
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  details jsonb,                                -- any extra context: {from_role, to_role, reason, etc}
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

-- Admins control and can read
DROP POLICY IF EXISTS "Admins can manage admin actions" ON public.admin_action_logs;
CREATE POLICY "Admins can manage admin actions"
  ON public.admin_action_logs
  FOR ALL
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Optional: allow actors to read their own actions (harmless for transparency)
DROP POLICY IF EXISTS "Actors can view their own admin actions" ON public.admin_action_logs;
CREATE POLICY "Actors can view their own admin actions"
  ON public.admin_action_logs
  FOR SELECT
  USING (actor_user_id = auth.uid());

-- 3) Make user_roles robust: avoid duplicates and allow safe self-assign of 'viewer'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_role_key'
  ) THEN
    ALTER TABLE public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END
$$;

-- Allow users to set themselves as 'viewer' (only that role, only for themselves)
DROP POLICY IF EXISTS "Users can set their viewer role" ON public.user_roles;
CREATE POLICY "Users can set their viewer role"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND role = 'viewer'::app_role);

-- 4) Seed superuser (admin) for the specified email (only if user already exists)
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
LEFT JOIN public.user_roles ur
  ON ur.user_id = u.id AND ur.role = 'admin'::app_role
WHERE u.email = 'morgan.dean@reclaimmyppitax.co.uk'
  AND ur.user_id IS NULL;
