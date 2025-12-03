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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-blue-50/50 to-purple-50/30 p-4">
      <Card className="w-full max-w-md shadow-xl rounded-2xl border-0">
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
  );
}