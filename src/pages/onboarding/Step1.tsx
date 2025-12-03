import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useOrganizationAuth } from '@/hooks/useOrganizationAuth';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import cortekLogo from '@/assets/cortek-logo.svg';

export default function OnboardingStep1() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createOrgAndMembership } = useOrganizationAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: user?.email || '',
    agreedToTerms: false
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.agreedToTerms) {
      alert('Please agree to the Terms & Privacy Policy');
      return;
    }

    setLoading(true);
    try {
      const orgId = await createOrgAndMembership(
        formData.firstName,
        formData.lastName,
        formData.phone,
        user?.email || formData.email
      );

      // Store orgId for next steps
      sessionStorage.setItem('onboarding_org_id', orgId);
      navigate('/onboarding/step-2');
    } catch (error) {
      console.error('Failed to create organization:', error);
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
              <p className="text-sm text-muted-foreground mb-2">Step 1 of 3</p>
              <CardTitle className="text-2xl font-bold">Set up your Club</CardTitle>
              <CardDescription>
                Let's get your club set up for automated messaging
              </CardDescription>
            </CardHeader>
            
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    className="h-11 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    className="h-11 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="h-11 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="h-11 rounded-lg"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={formData.agreedToTerms}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, agreedToTerms: checked as boolean })
                    }
                  />
                  <Label htmlFor="terms" className="text-sm">
                    I agree to the{' '}
                    <a href="#" className="text-primary hover:underline">Terms</a>
                    {' '}&{' '}
                    <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                    {' '}*
                  </Label>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3 pt-2">
                <Button 
                  type="submit" 
                  className="w-full h-11 rounded-lg" 
                  disabled={loading}
                  variant="hero"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Organization...
                    </>
                  ) : (
                    'Next'
                  )}
                </Button>
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