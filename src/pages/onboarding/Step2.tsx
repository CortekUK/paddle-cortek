import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOrganizationAuth } from '@/hooks/useOrganizationAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import cortekLogo from '@/assets/cortek-logo.svg';

export default function OnboardingStep2() {
  const navigate = useNavigate();
  const { updateTenantDetails } = useOrganizationAuth();
  const [clubUrl, setClubUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validated, setValidated] = useState(false);
  const [tenantName, setTenantName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clubUrl.startsWith('https://playtomic.com/clubs/')) {
      setError('Please enter a valid Playtomic club URL starting with https://playtomic.com/clubs/');
      return;
    }

    setLoading(true);
    setError('');
    setValidated(false);

    try {
      const orgId = sessionStorage.getItem('onboarding_org_id');
      if (!orgId) {
        throw new Error('Organization ID not found. Please start over.');
      }

      const { data, error: tenantError } = await supabase.functions.invoke('discover-tenant', {
        body: { club_url: clubUrl }
      });

      if (tenantError || !data?.tenant_id) {
        setError('Unable to locate this club. Please make sure the URL is correct and try again.');
        return;
      }

      setValidated(true);
      setTenantName(data.tenant_name || 'Your club');

      await updateTenantDetails(
        orgId,
        clubUrl,
        data.tenant_id,
        data.tenant_name
      );

      setTimeout(() => {
        navigate('/onboarding/step-3');
      }, 1000);
    } catch (error) {
      console.error('Failed to set tenant details:', error);
      setError('Failed to connect to your club. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-background via-purple-50/40 to-blue-50/30 dark:from-background dark:via-purple-950/20 dark:to-blue-950/20">
      {/* Floating gradient orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 dark:bg-primary/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 dark:bg-accent/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-gradient-to-br from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      
      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="p-[1px] rounded-3xl bg-gradient-to-br from-primary/20 via-background to-accent/20 shadow-2xl shadow-primary/10 dark:shadow-primary/5">
          <Card className="w-full max-w-md bg-card/95 backdrop-blur-xl rounded-3xl border-0">
            <CardHeader className="text-center pb-2">
              <img src={cortekLogo} alt="CORTEK" className="h-10 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-2">Step 2 of 3</p>
              <CardTitle className="text-2xl font-bold">Connect Your Club</CardTitle>
              <CardDescription>
                Link your Playtomic club to enable automation
              </CardDescription>
            </CardHeader>
            
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="clubUrl">Playtomic Club URL *</Label>
                  <Input
                    id="clubUrl"
                    type="url"
                    value={clubUrl}
                    onChange={(e) => {
                      setClubUrl(e.target.value);
                      setValidated(false);
                      setError('');
                    }}
                    placeholder="https://playtomic.com/clubs/pure-padel-manchester"
                    required
                    className="h-11 rounded-lg"
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste your club page URL from Playtomic
                  </p>
                </div>

                {validated && (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-4 py-3 rounded-lg border border-green-200 dark:border-green-800">
                    <CheckCircle className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm font-medium">Club connected: {tenantName}</span>
                  </div>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>

              <CardFooter className="flex flex-col gap-3 pt-2">
                <div className="flex gap-3 w-full">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/onboarding/step-1')}
                    className="flex-1 h-11 rounded-lg"
                  >
                    Back
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 h-11 rounded-lg" 
                    disabled={loading || validated}
                    variant="hero"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Looking up club...
                      </>
                    ) : validated ? (
                      'Connected!'
                    ) : (
                      'Next'
                    )}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/client/dashboard')}
                  className="w-full text-muted-foreground hover:text-foreground"
                >
                  Skip to Dashboard
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
