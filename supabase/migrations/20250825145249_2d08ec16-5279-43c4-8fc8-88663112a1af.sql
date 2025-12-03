
-- 1) Add created_by to locations and auto-populate it from the current user
alter table public.locations
  add column if not exists created_by uuid;

create or replace function public.set_locations_created_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_locations_created_by on public.locations;
create trigger trg_set_locations_created_by
before insert on public.locations
for each row execute function public.set_locations_created_by();

-- 2) RLS policies: enable read of own newly-created rows + your assigned location
alter table public.locations enable row level security;

-- Drop previous policies to avoid conflicts
drop policy if exists "Admins can manage all locations" on public.locations;
drop policy if exists "Users can view their location" on public.locations;
drop policy if exists "Users can update their location" on public.locations;
drop policy if exists "Users can create one location" on public.locations;

-- Admins: full access
create policy "Admins can manage all locations"
  on public.locations
  as permissive
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Users: can view their assigned location OR any row they created
create policy "Users can view their location or own rows"
  on public.locations
  as permissive
  for select
  to authenticated
  using (
    id = public.get_current_user_location_id()
    or created_by = auth.uid()
  );

-- Users: can update their assigned location OR any row they created
create policy "Users can update their location or own rows"
  on public.locations
  as permissive
  for update
  to authenticated
  using (
    id = public.get_current_user_location_id()
    or created_by = auth.uid()
  );

-- Users: can create exactly one location if they don't already have one
create policy "Users can create one location"
  on public.locations
  as permissive
  for insert
  to authenticated
  with check (public.get_current_user_location_id() is null);
