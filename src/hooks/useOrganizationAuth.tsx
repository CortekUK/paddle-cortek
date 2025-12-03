import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type UserRole = 'owner' | 'manager' | 'viewer';

interface Organization {
  id: string;
  name?: string;
  club_name?: string;
  playtomic_club_url?: string;
  tenant_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  status: string;
}

interface Profile {
  user_id: string;
  organization_id?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}

interface OrganizationMember {
  org_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
}

interface OrganizationAuthContextType {
  profile: Profile | null;
  organization: Organization | null;
  membership: OrganizationMember | null;
  loading: boolean;
  isOwner: () => boolean;
  isManager: () => boolean;
  canManageOrg: () => boolean;
  createOrgAndMembership: (firstName: string, lastName: string, phone: string, email: string) => Promise<string>;
  updateTenantDetails: (orgId: string, clubUrl: string, tenantId: string, tenantName?: string) => Promise<void>;
  updateClubName: (clubName: string) => Promise<void>;
  saveAutomationSettings: (orgId: string, settings: AutomationSettings) => Promise<void>;
  needsOnboarding: () => boolean;
}

interface AutomationSettings {
  wa_confirmed: boolean;
  wa_group_availability: string;
  wa_group_matches: string;
  wa_group_competitions: string;
}

const OrganizationAuthContext = createContext<OrganizationAuthContextType | undefined>(undefined);

export function OrganizationAuthProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [membership, setMembership] = useState<OrganizationMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setProfile(null);
        setOrganization(null);
        setMembership(null);
        setLoading(false);
        return;
      }

      try {
        // Fetch user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setLoading(false);
          return;
        }

        setProfile(profileData);

        // Fetch organization membership - prioritize complete organizations
        const { data: membershipsData, error: membershipError } = await supabase
          .from('organization_members')
          .select(`
            *,
            organizations(*, org_automation_settings(org_id))
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (membershipError) {
          console.error('Error fetching membership:', membershipError);
        } else if (membershipsData && membershipsData.length > 0) {
          // Find the most complete organization (with tenant_id and settings)
          let selectedMembership = null;
          let selectedOrg = null;

          for (const membership of membershipsData) {
            const org = membership.organizations;
            if (!org) continue;

            const hasSettings = org.org_automation_settings && typeof org.org_automation_settings === 'object';
            
            if (org.tenant_id && hasSettings) {
              // Found a complete organization
              selectedMembership = membership;
              selectedOrg = org;
              break;
            } else if (org.tenant_id && !selectedMembership) {
              // Found org with tenant but no settings - use as fallback
              selectedMembership = membership;
              selectedOrg = org;
            } else if (!selectedMembership) {
              // Use any org as last resort
              selectedMembership = membership;
              selectedOrg = org;
            }
          }

          if (selectedMembership && selectedOrg) {
            setMembership(selectedMembership as OrganizationMember);
            setOrganization(selectedOrg);
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchUserData();
    }
  }, [user, authLoading]);

  const isOwner = () => membership?.role === 'owner';
  const isManager = () => membership?.role === 'manager';
  const canManageOrg = () => isOwner() || isManager();

  const needsOnboarding = () => {
    return user && (!membership || !organization);
  };

  const createOrgAndMembership = async (firstName: string, lastName: string, phone: string, email: string) => {
    try {
      const { data: orgId, error } = await supabase.rpc('onboarding_create_org_and_membership', {
        p_first_name: firstName,
        p_last_name: lastName,
        p_phone: phone,
        p_email: email
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Organisation created successfully",
      });

      return orgId as string;
    } catch (error) {
      console.error('Error creating organisation:', error);
      toast({
        title: "Error",
        description: "Failed to create organisation",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateTenantDetails = async (orgId: string, clubUrl: string, tenantId: string, tenantName?: string) => {
    try {
      const { error } = await supabase.rpc('onboarding_update_tenant_details', {
        p_org_id: orgId,
        p_club_url: clubUrl,
        p_tenant_id: tenantId,
        p_tenant_name: tenantName || null
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Club details saved successfully",
      });
    } catch (error) {
      console.error('Error updating tenant details:', error);
      toast({
        title: "Error",
        description: "Failed to save club details",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateClubName = async (clubName: string) => {
    if (!organization?.id) {
      throw new Error('No organization found');
    }

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ 
          club_name: clubName,
          name: clubName // Also update name for backward compatibility
        })
        .eq('id', organization.id);

      if (error) throw error;

      // Update local state
      setOrganization(prev => prev ? { ...prev, club_name: clubName, name: clubName } : null);

      toast({
        title: "Success",
        description: "Club name updated successfully!",
      });
    } catch (error) {
      console.error('Error updating club name:', error);
      toast({
        title: "Error",
        description: "Failed to update club name",
        variant: "destructive",
      });
      throw error;
    }
  };

  const saveAutomationSettings = async (orgId: string, settings: AutomationSettings) => {
    try {
      const { error } = await supabase.rpc('onboarding_save_automation_settings', {
        p_org_id: orgId,
        p_wa_confirmed: settings.wa_confirmed,
        p_wa_group_availability: settings.wa_group_availability,
        p_wa_group_matches: settings.wa_group_matches,
        p_wa_group_competitions: settings.wa_group_competitions
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Automation settings saved successfully!",
      });
    } catch (error) {
      console.error('Error saving automation settings:', error);
      toast({
        title: "Error",
        description: "Failed to save automation settings",
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <OrganizationAuthContext.Provider value={{
      profile,
      organization,
      membership,
      loading: loading || authLoading,
      isOwner,
      isManager,
      canManageOrg,
      createOrgAndMembership,
      updateTenantDetails,
      updateClubName,
      saveAutomationSettings,
      needsOnboarding,
    }}>
      {children}
    </OrganizationAuthContext.Provider>
  );
}

export function useOrganizationAuth() {
  const context = useContext(OrganizationAuthContext);
  if (context === undefined) {
    throw new Error('useOrganizationAuth must be used within an OrganizationAuthProvider');
  }
  return context;
}