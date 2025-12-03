import { supabase } from '@/integrations/supabase/client';

export async function ensureOrgForUser(userId: string): Promise<string> {
  // Check if user already has organization membership - use .limit(1) to handle duplicates
  const { data: existing, error: existingError } = await supabase
    .from('organization_members')
    .select('org_id, organizations(*)')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error('Error checking existing membership:', existingError);
    throw existingError;
  }

  if (existing) {
    return existing.org_id;
  }

  // User doesn't have an organization, create one
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 14);

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: null,
      status: 'active',
      created_by: userId
    })
    .select('id')
    .single();

  if (orgError) {
    console.error('Error creating organization:', orgError);
    throw orgError;
  }

  // Create organization membership
  const { error: membershipError } = await supabase
    .from('organization_members')
    .insert({
      org_id: org.id,
      user_id: userId,
      role: 'owner'
    });

  if (membershipError) {
    console.error('Error creating membership:', membershipError);
    throw membershipError;
  }

  return org.id;
}