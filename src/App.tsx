
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { OrganizationAuthProvider } from '@/hooks/useOrganizationAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { ClientLayout } from '@/components/layout/ClientLayout';
import { AuthPage } from '@/components/auth/AuthPage';
import { AuthGuard } from '@/components/auth/AuthGuard';
import Welcome from '@/pages/Welcome';
import CustomerDashboard from '@/pages/App';
import AdminDashboard from '@/pages/Dashboard';
import Setup from '@/pages/Setup';
import SendMessage from '@/pages/SendMessage';
import Users from '@/pages/Users';
import Logs from '@/pages/Logs';
import EmulatorTest from '@/pages/EmulatorTest';
import Billing from '@/pages/Billing';
import NotFound from '@/pages/NotFound';
import ResetPassword from '@/pages/ResetPassword';
import PlaytomicAPI from '@/pages/PlaytomicAPI';
import OnboardingStep1 from '@/pages/onboarding/Step1';
import OnboardingStep2 from '@/pages/onboarding/Step2';
import OnboardingStep3 from '@/pages/onboarding/Step3';
import OnboardingComplete from '@/pages/onboarding/Complete';
import ClientDashboard from '@/pages/client/ClientDashboard';
import ClientSettings from '@/pages/client/ClientSettings';
import CourtAvailability from '@/pages/client/CourtAvailability';
import PartialMatches from '@/pages/client/PartialMatches';
import CompetitionsAcademies from '@/pages/client/CompetitionsAcademies';
import SocialMediaLibrary from '@/pages/client/SocialMediaLibrary';
import { AdminRoute } from '@/components/AdminRoute';
import './App.css';

const queryClient = new QueryClient();

function ClientRoute({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAuth={true}>
      {children}
    </AuthGuard>
  );
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAuth={true}>
      {children}
    </AuthGuard>
  );
}

function AuthenticatedRoute({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAuth={true} redirectOnCompleteOnboarding={true}>
      {children}
    </AuthGuard>
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OrganizationAuthProvider>
          <Router>
            <div className="min-h-screen bg-background">
              <Routes>
                {/* Landing and Auth Routes */}
                <Route path="/" element={
                  <PublicRoute>
                    <Welcome />
                  </PublicRoute>
                } />
                <Route path="/auth" element={
                  <PublicRoute>
                    <AuthPage />
                  </PublicRoute>
                } />
                <Route path="/reset-password" element={<ResetPassword />} />
                
                {/* Onboarding Routes */}
                <Route path="/onboarding/step-1" element={
                  <OnboardingRoute>
                    <OnboardingStep1 />
                  </OnboardingRoute>
                } />
                <Route path="/onboarding/step-2" element={
                  <OnboardingRoute>
                    <OnboardingStep2 />
                  </OnboardingRoute>
                } />
                <Route path="/onboarding/step-3" element={
                  <OnboardingRoute>
                    <OnboardingStep3 />
                  </OnboardingRoute>
                } />
                <Route path="/onboarding/complete" element={
                  <OnboardingRoute>
                    <OnboardingComplete />
                  </OnboardingRoute>
                } />

                {/* Legacy Dashboard Redirect */}
                <Route path="/dashboard" element={<Navigate to="/client/dashboard" replace />} />

                {/* Client Portal Routes */}
                <Route path="/client" element={
                  <ClientRoute>
                    <ClientLayout />
                  </ClientRoute>
                }>
                  <Route path="dashboard" element={<ClientDashboard />} />
                  <Route path="court-availability" element={<CourtAvailability />} />
                  <Route path="partial-matches" element={<PartialMatches />} />
                  <Route path="competitions-academies" element={<CompetitionsAcademies />} />
                  <Route path="social-media-library" element={<SocialMediaLibrary />} />
                  <Route path="settings" element={<ClientSettings />} />
                  <Route index element={<Navigate to="dashboard" replace />} />
                </Route>

                {/* Admin Routes - Admin Console with AppLayout */}
                <Route path="/admin" element={
                  <AdminRoute>
                    <AppLayout />
                  </AdminRoute>
                }>
                  <Route index element={<AdminDashboard />} />
                  <Route path="billing" element={<Billing />} />
                  <Route path="logs" element={<Logs />} />
                  <Route path="send-message" element={<SendMessage />} />
                  <Route path="emulator-test" element={<EmulatorTest />} />
                  <Route path="playtomic-api" element={<PlaytomicAPI />} />
                  <Route path="setup" element={<Setup />} />
                  <Route path="users" element={<Users />} />
                </Route>
                
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Toaster />
            </div>
          </Router>
        </OrganizationAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
