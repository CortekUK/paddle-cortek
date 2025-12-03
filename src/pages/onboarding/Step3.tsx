import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOrganizationAuth } from '@/hooks/useOrganizationAuth';
import { Loader2, MessageSquare } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import cortekLogo from '@/assets/cortek-logo.svg';

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
          <Card className="w-full max-w-lg bg-card/95 backdrop-blur-xl rounded-3xl border-0">
            <CardHeader className="text-center pb-2">
              <img src={cortekLogo} alt="CORTEK" className="h-10 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-2">Step 3 of 3</p>
              <CardTitle className="text-2xl font-bold">WhatsApp Setup</CardTitle>
              <CardDescription>
                Configure your WhatsApp groups for automated messages
              </CardDescription>
            </CardHeader>
            
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-5">
                {/* Bot Number Panel */}
                <Alert className="bg-primary/5 border-primary/20">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-foreground">
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
                <div className="space-y-2 p-4 bg-muted/50 rounded-xl">
                  <Label htmlFor="useOneNameForAll" className="text-sm font-medium">Use one name for all groups (optional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="useOneNameForAll"
                      type="text"
                      value={useOneNameForAll}
                      onChange={(e) => setUseOneNameForAll(e.target.value)}
                      placeholder="Pure Padel"
                      className="h-11 rounded-lg"
                    />
                    <Button type="button" onClick={applyToAll} variant="outline" className="h-11 rounded-lg">
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
                      className="h-11 rounded-lg"
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
                      className="h-11 rounded-lg"
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
                      className="h-11 rounded-lg"
                    />
                    <p className="text-xs text-muted-foreground">
                      Must match the WhatsApp group name exactly (including spaces and capitals).
                    </p>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3 pt-2">
                <div className="flex gap-3 w-full">
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/onboarding/step-2')}
                    className="flex-1 h-11 rounded-lg"
                  >
                    Back
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 h-11 rounded-lg" 
                    disabled={loading || !botAdded}
                    variant="hero"
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