import { supabase } from '@/integrations/supabase/client';

export async function routeAfterLogin(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return '/auth';

  // Check if user has admin role first
  const { data: adminRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (adminRole) {
    return '/admin';
  }

  // Check if user has organization membership - prioritize complete organizations
  const { data: memberships } = await supabase
    .from('organization_members')
    .select(`
      org_id, 
      organizations(name, tenant_id)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (!memberships || memberships.length === 0) {
    return '/onboarding/step-1';
  }

  // Check each organization for completeness
  for (const membership of memberships) {
    const org = membership.organizations;
    if (!org?.tenant_id) continue;

    // Check if this org has automation settings
    const { data: settings } = await supabase
      .from('org_automation_settings')
      .select('org_id')
      .eq('org_id', membership.org_id)
      .maybeSingle();

    if (settings) {
      // Found a complete organization
      return '/client/dashboard';
    }
  }

  // Find an organization with tenant_id but no settings
  const orgWithTenant = memberships.find(membership => {
    const org = membership.organizations;
    return org?.tenant_id;
  });

  if (orgWithTenant) {
    return '/onboarding/step-3';
  }

  // Find any organization (will go to step 2 for tenant setup)
  const anyOrg = memberships.find(membership => membership.organizations);
  
  if (anyOrg?.organizations) {
    return '/onboarding/step-2';
  }

  // No valid organization found
  return '/onboarding/step-1';
}

export async function checkOnboardingStatus(userId: string): Promise<{
  hasOrg: boolean;
  hasTenant: boolean;
  hasSettings: boolean;
  orgId?: string;
}> {
  const { data: membership } = await supabase
    .from('organization_members')
    .select('org_id, organizations(tenant_id)')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return { hasOrg: false, hasTenant: false, hasSettings: false };
  }

  const hasTenant = !!membership.organizations?.tenant_id;
  
  const { data: settings } = await supabase
    .from('org_automation_settings')
    .select('org_id')
    .eq('org_id', membership.org_id)
    .maybeSingle();

  return {
    hasOrg: true,
    hasTenant,
    hasSettings: !!settings,
    orgId: membership.org_id
  };
}