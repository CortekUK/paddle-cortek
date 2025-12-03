
import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'admin' | 'location_admin' | 'editor' | 'viewer';

export function useUserRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      if (!user) {
        setRoles([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) throw error;

        const userRoles = data.map(r => r.role as AppRole);
        
        // If user has no roles, automatically assign 'viewer'
        if (userRoles.length === 0) {
          const { error: insertError } = await supabase
            .from('user_roles')
            .insert({ user_id: user.id, role: 'viewer' });
          
          if (!insertError) {
            userRoles.push('viewer');
          }
        }

        setRoles(userRoles);
      } catch (error) {
        console.error('Error fetching user roles:', error);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [user]);

  const hasRole = (role: AppRole) => roles.includes(role);
  const isAdmin = () => hasRole('admin');
  const canManageLocation = () => hasRole('admin') || hasRole('location_admin');
  const highestRole = () => {
    if (hasRole('admin')) return 'admin';
    if (hasRole('location_admin')) return 'location_admin';
    if (hasRole('editor')) return 'editor';
    return 'viewer';
  };

  return {
    roles,
    loading,
    hasRole,
    isAdmin,
    canManageLocation,
    highestRole
  };
}
