-- Add admin role for morgan.dean@reclaimmyppitax.co.uk
-- First check if the user exists and get their ID, then add admin role if they don't have it

-- Insert admin role for the specific user email
INSERT INTO public.user_roles (user_id, role)
SELECT 
  u.id,
  'admin'::app_role
FROM auth.users u
WHERE u.email = 'morgan.dean@reclaimmyppitax.co.uk'
  AND NOT EXISTS (
    SELECT 1 
    FROM public.user_roles ur 
    WHERE ur.user_id = u.id 
      AND ur.role = 'admin'::app_role
  );