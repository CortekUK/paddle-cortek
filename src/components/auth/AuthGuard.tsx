import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { checkOnboardingStatus } from '@/utils/routeGuards';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectOnCompleteOnboarding?: boolean;
}

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  redirectOnCompleteOnboarding = false 
}: AuthGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (authLoading) return;

      setChecking(true);

      // If auth is required but user is not logged in
      if (requireAuth && !user) {
        navigate('/auth');
        return;
      }

      // If user is logged in and we need to check onboarding status
      if (user && (location.pathname.startsWith('/onboarding') || redirectOnCompleteOnboarding)) {
        try {
          const status = await checkOnboardingStatus(user.id);
          
          // If on onboarding route but already complete, redirect to dashboard
          if (location.pathname.startsWith('/onboarding') && status.hasOrg && status.hasTenant && status.hasSettings) {
            navigate('/client/dashboard');
            return;
          }
          
          // If on dashboard but onboarding not complete, redirect to appropriate step
          if (redirectOnCompleteOnboarding && (!status.hasOrg || !status.hasTenant || !status.hasSettings)) {
            if (!status.hasOrg) {
              navigate('/onboarding/step-1');
            } else if (!status.hasTenant) {
              navigate('/onboarding/step-2');
            } else if (!status.hasSettings) {
              navigate('/onboarding/step-3');
            }
            return;
          }
        } catch (error) {
          console.error('Error checking onboarding status:', error);
        }
      }

      setChecking(false);
    };

    checkAuth();
  }, [user, authLoading, location.pathname, navigate, requireAuth, redirectOnCompleteOnboarding]);

  if (authLoading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}