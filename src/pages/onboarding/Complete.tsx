import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Calendar, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import cortekLogo from '@/assets/cortek-logo.svg';

export default function OnboardingComplete() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-blue-50/50 to-purple-50/30 p-4">
      <Card className="w-full max-w-md text-center shadow-xl rounded-2xl border-0">
        <CardHeader>
          <img src={cortekLogo} alt="CORTEK" className="h-10 mx-auto mb-4" />
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">You're all set!</CardTitle>
          <CardDescription>
            Your 14-day trial is active. You can update settings anytime.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 text-accent" />
            <span className="text-sm">14-day free trial started</span>
          </div>
          
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 text-accent" />
            <span className="text-sm">Automation is now active</span>
          </div>
          
          <div className="pt-4">
            <Button 
              onClick={() => navigate('/client/dashboard')}
              className="w-full"
              variant="hero"
            >
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
