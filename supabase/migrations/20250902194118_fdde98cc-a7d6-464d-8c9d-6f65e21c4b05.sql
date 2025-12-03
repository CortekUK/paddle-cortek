-- Create enums
create type public.automation_category as enum (
  'court_availability',
  'partial_matches',
  'competitions_academies'
);

create type public.billing_status as enum (
  'trialing', 'active', 'past_due', 'canceled'
);

create type public.user_role as enum (
  'super_admin', 'org_admin', 'org_member'
);

-- Create organizations table
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text,
  playtomic_club_url text,
  tenant_id uuid,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text default 'active'
);

-- Update profiles table to include organization and role
alter table public.profiles add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists role public.user_role not null default 'org_member';

-- Create whatsapp_routes table
create table if not exists public.whatsapp_routes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category public.automation_category not null,
  group_name text not null,
  confirmed_added boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, category)
);

-- Create billing_stub table
create table if not exists public.billing_stub (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  status public.billing_status not null default 'trialing',
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  plan text default 'starter',
  stripe_customer_id text,
  stripe_sub_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create audit_logs table
create table if not exists public.audit_logs (
  id bigserial primary key,
  organization_id uuid references public.organizations(id) on delete cascade,
  actor_uid uuid references public.profiles(uid) on delete set null,
  action text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- Create indexes
create index if not exists idx_profiles_org on public.profiles (organization_id);
create index if not exists idx_whatsapp_routes_org on public.whatsapp_routes (organization_id);
create index if not exists idx_audit_logs_org on public.audit_logs (organization_id);

-- Enable RLS
alter table public.organizations enable row level security;
alter table public.whatsapp_routes enable row level security;
alter table public.billing_stub enable row level security;
alter table public.audit_logs enable row level security;

-- Helper function: current user's org
create or replace function public.current_org_id()
returns uuid language sql stable as $$
  select organization_id from public.profiles where uid = auth.uid()
$$;

-- Organizations policies
create policy org_select on public.organizations
  for select using (id = public.current_org_id() or exists (
    select 1 from public.profiles p
    where p.uid = auth.uid() and p.role = 'super_admin'
));

create policy org_update on public.organizations
  for update using (
    exists (select 1 from public.profiles p where p.uid = auth.uid() and p.organization_id = organizations.id and p.role in ('org_admin','super_admin'))
);

create policy org_insert_by_server_only on public.organizations
  for insert with check (auth.role() = 'service_role');

-- Profiles policies (update existing)
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;

create policy profiles_self_select on public.profiles
  for select using (
    uid = auth.uid()
    or organization_id = public.current_org_id()
    or exists (select 1 from public.profiles p where p.uid = auth.uid() and p.role='super_admin')
);

create policy profiles_self_update on public.profiles
  for update using (uid = auth.uid());

create policy profiles_insert_server_only on public.profiles
  for insert with check (auth.role() = 'service_role');

-- WhatsApp routes policies
create policy wr_select on public.whatsapp_routes
  for select using (organization_id = public.current_org_id()
    or exists (select 1 from public.profiles p where p.uid = auth.uid() and p.role='super_admin')
);

create policy wr_mutate_admins on public.whatsapp_routes
  for all using (
    exists (select 1 from public.profiles p where p.uid = auth.uid() and p.organization_id = whatsapp_routes.organization_id and p.role in ('org_admin','super_admin'))
);

-- Billing stub policies
create policy billing_select on public.billing_stub
  for select using (organization_id = public.current_org_id()
    or exists (select 1 from public.profiles p where p.uid = auth.uid() and p.role='super_admin')
);

create policy billing_update_admins on public.billing_stub
  for update using (
    exists (select 1 from public.profiles p where p.uid = auth.uid() and p.organization_id = billing_stub.organization_id and p.role in ('org_admin','super_admin'))
);

create policy billing_insert_server_only on public.billing_stub
  for insert with check (auth.role() = 'service_role');

-- Audit logs policies
create policy audit_select on public.audit_logs
  for select using (organization_id = public.current_org_id()
    or exists (select 1 from public.profiles p where p.uid = auth.uid() and p.role='super_admin')
);

create policy audit_insert_server_only on public.audit_logs
  for insert with check (auth.role() = 'service_role');

-- RPC functions for secure onboarding operations
create or replace function public.onboarding_create_org_and_profile(
  p_first_name text,
  p_last_name text,
  p_phone text
) returns uuid
language plpgsql
security definer
as $$
declare
  v_org_id uuid;
begin
  insert into public.organizations (created_by)
  values (auth.uid())
  returning id into v_org_id;

  insert into public.profiles (uid, organization_id, first_name, last_name, phone, email, role)
  values (auth.uid(), v_org_id, p_first_name, p_last_name, p_phone,
          (select email from auth.users where id = auth.uid()),
          'org_admin');

  return v_org_id;
end;
$$;

create or replace function public.onboarding_set_tenant(
  p_org_id uuid,
  p_club_url text,
  p_tenant_id uuid,
  p_tenant_name text
) returns void
language sql
security definer
as $$
  update public.organizations
    set playtomic_club_url = p_club_url,
        tenant_id = p_tenant_id,
        name = coalesce(p_tenant_name, name),
        updated_at = now()
    where id = p_org_id;
$$;

create or replace function public.onboarding_finalize(
  p_org_id uuid,
  p_routes jsonb
) returns void
language plpgsql
security definer
as $$
begin
  -- routes
  insert into public.whatsapp_routes (organization_id, category, group_name, confirmed_added)
  select p_org_id, (r->>'category')::public.automation_category, r->>'group_name', true
  from jsonb_array_elements(p_routes) r
  on conflict (organization_id, category)
  do update set group_name = excluded.group_name,
                confirmed_added = true,
                updated_at = now();

  -- billing stub
  insert into public.billing_stub (organization_id)
  values (p_org_id)
  on conflict (organization_id) do nothing;
end;
$$;