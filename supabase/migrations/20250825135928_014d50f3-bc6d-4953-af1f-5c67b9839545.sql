
-- Ensure RLS is enabled (safe to run even if already enabled)
alter table public.locations enable row level security;

-- Replace existing policies with a safer, permissive set
drop policy if exists "Admins can manage all locations" on public.locations;
drop policy if exists "Users can update their location" on public.locations;
drop policy if exists "Users can view their location" on public.locations;

-- Admins: full access to everything
create policy "Admins can manage all locations"
  on public.locations
  as permissive
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Users: can view their own location
create policy "Users can view their location"
  on public.locations
  as permissive
  for select
  to authenticated
  using (id = public.get_current_user_location_id());

-- Users: can update their own location
create policy "Users can update their location"
  on public.locations
  as permissive
  for update
  to authenticated
  using (id = public.get_current_user_location_id());

-- Users: can create one location only if they don't already have one
create policy "Users can create one location"
  on public.locations
  as permissive
  for insert
  to authenticated
  with check (public.get_current_user_location_id() is null);
