import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOrganizationAuth } from '@/hooks/useOrganizationAuth';
import { Loader2, MessageSquare, Users } from 'lucide-react';

export default function OnboardingStep3() {
  const navigate = useNavigate();
  const { saveAutomationSettings } = useOrganizationAuth();
  const [botAdded, setBotAdded] = useState(false);
  const [groupNames, setGroupNames] = useState({
    courtAvailability: '',
    partialMatches: '',
    competitions: '',
  });
  const [useOneNameForAll, setUseOneNameForAll] = useState('');
  const [loading, setLoading] = useState(false);

  const applyToAll = () => {
    if (useOneNameForAll.trim()) {
      setGroupNames({
        courtAvailability: useOneNameForAll.trim(),
        partialMatches: useOneNameForAll.trim(),
        competitions: useOneNameForAll.trim(),
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!botAdded) {
      alert('Please confirm that you have added the bot number to your WhatsApp groups');
      return;
    }

    if (!groupNames.courtAvailability || !groupNames.partialMatches || !groupNames.competitions) {
      alert('Please fill in all group names');
      return;
    }

    setLoading(true);
    try {
      // Get orgId from session storage
      const orgId = sessionStorage.getItem('onboarding_org_id');
      if (!orgId) {
        throw new Error('Organization ID not found. Please start over.');
      }

      await saveAutomationSettings(orgId, {
        wa_confirmed: botAdded,
        wa_group_availability: groupNames.courtAvailability,
        wa_group_matches: groupNames.partialMatches,
        wa_group_competitions: groupNames.competitions
      });

      navigate('/client/dashboard');

      // Clear session storage
      sessionStorage.removeItem('onboarding_org_id');
    } catch (error) {
      console.error('Failed to finalize onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">WhatsApp Setup</CardTitle>
          <CardDescription className="text-center">
            Configure your WhatsApp groups for automated messages
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="text-center text-sm text-muted-foreground mb-4">
              Step 3 of 3: WhatsApp Setup
            </div>

            {/* Bot Number Panel */}
            <Alert>
              <MessageSquare className="h-4 w-4" />
              <AlertDescription>
                <strong>Add 07757658667 to each WhatsApp group where you want automated messages delivered.</strong>
              </AlertDescription>
            </Alert>

            {/* Confirmation Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="botAdded"
                checked={botAdded}
                onCheckedChange={(checked) => setBotAdded(checked === true)}
              />
              <Label htmlFor="botAdded" className="text-sm">
                I've added 07757658667 to the relevant WhatsApp groups *
              </Label>
            </div>

            {/* Apply to All Helper */}
            <div className="space-y-2 p-4 bg-muted rounded-lg">
              <Label htmlFor="useOneNameForAll">Use one name for all groups (optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="useOneNameForAll"
                  type="text"
                  value={useOneNameForAll}
                  onChange={(e) => setUseOneNameForAll(e.target.value)}
                  placeholder="Pure Padel"
                />
                <Button type="button" onClick={applyToAll} variant="outline">
                  Apply to All
                </Button>
              </div>
            </div>

            {/* Group Name Inputs */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="courtAvailability">1. Court Availability *</Label>
                <Input
                  id="courtAvailability"
                  type="text"
                  value={groupNames.courtAvailability}
                  onChange={(e) => setGroupNames({ ...groupNames, courtAvailability: e.target.value })}
                  placeholder="Pure Padel – Court Availability"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Must match the WhatsApp group name exactly (including spaces and capitals).
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="partialMatches">2. Partially Filled Matches *</Label>
                <Input
                  id="partialMatches"
                  type="text"
                  value={groupNames.partialMatches}
                  onChange={(e) => setGroupNames({ ...groupNames, partialMatches: e.target.value })}
                  placeholder="Pure Padel – Matches"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Must match the WhatsApp group name exactly (including spaces and capitals).
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="competitions">3. Competitions & Academies *</Label>
                <Input
                  id="competitions"
                  type="text"
                  value={groupNames.competitions}
                  onChange={(e) => setGroupNames({ ...groupNames, competitions: e.target.value })}
                  placeholder="Pure Padel – Competitions"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Must match the WhatsApp group name exactly (including spaces and capitals).
                </p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="space-y-2">
            <div className="flex gap-2">
              <Button 
                type="button"
                variant="outline"
                onClick={() => navigate('/onboarding/step-2')}
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                type="submit" 
                className="flex-1" 
                disabled={loading || !botAdded}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finishing Setup...
                  </>
                ) : (
                  'Complete Setup'
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