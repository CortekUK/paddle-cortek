import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOrganizationAuth } from '@/hooks/useOrganizationAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle } from 'lucide-react';

export default function OnboardingStep2() {
  const navigate = useNavigate();
  const { updateTenantDetails } = useOrganizationAuth();
  const [clubUrl, setClubUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate URL format
    if (!clubUrl.startsWith('https://playtomic.com/clubs/')) {
      setError('Please enter a valid Playtomic club URL starting with https://playtomic.com/clubs/');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get orgId from session storage
      const orgId = sessionStorage.getItem('onboarding_org_id');
      if (!orgId) {
        throw new Error('Organization ID not found. Please start over.');
      }

      // Call tenant discovery function
      const { data, error: tenantError } = await supabase.functions.invoke('discover-tenant', {
        body: { club_url: clubUrl }
      });

      if (tenantError || !data?.tenant_id) {
        setError('Unable to locate this club. Please make sure the URL is correct and try again.');
        return;
      }

      // Save tenant details
      await updateTenantDetails(
        orgId,
        clubUrl,
        data.tenant_id,
        data.tenant_name
      );

      navigate('/onboarding/step-3');
    } catch (error) {
      console.error('Failed to set tenant details:', error);
      setError('Failed to connect to your club. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Connect Your Club</CardTitle>
          <CardDescription className="text-center">
            Link your Playtomic club to enable automation
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground mb-4">
              Step 2 of 3: Club URL & Tenant Lookup
            </div>

            <div className="space-y-2">
              <Label htmlFor="clubUrl">Playtomic Club URL *</Label>
              <Input
                id="clubUrl"
                type="url"
                value={clubUrl}
                onChange={(e) => setClubUrl(e.target.value)}
                placeholder="https://playtomic.com/clubs/pure-padel-manchester"
                required
              />
              <p className="text-xs text-muted-foreground">
                Paste your club page URL from Playtomic.
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>

          <CardFooter className="space-y-2">
            <div className="flex gap-2">
              <Button 
                type="button"
                variant="outline"
                onClick={() => navigate('/onboarding/step-1')}
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                type="submit" 
                className="flex-1" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Looking up club...
                  </>
                ) : (
                  'Next'
                )}
              </Button>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/client/dashboard')}
              className="w-full"
            >
              Skip to Dashboard
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}