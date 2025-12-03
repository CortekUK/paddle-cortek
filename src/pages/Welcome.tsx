import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserMenu } from '@/components/layout/UserMenu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/hooks/useAuth';
import cortekLogo from '@/assets/cortek-logo.svg';

export default function Welcome() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const features = [
    {
      title: "Court Availability",
      description: "Automatic notifications when courts become available"
    },
    {
      title: "Match Alerts",  
      description: "Get notified about partially filled matches to join"
    },
    {
      title: "Competition Updates",
      description: "Stay updated on competitions and academy sessions"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-purple-50/40 to-blue-50/30 dark:from-background dark:via-purple-950/20 dark:to-blue-950/20 relative overflow-hidden">
      {/* Floating gradient orbs for atmosphere */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 dark:bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 dark:bg-accent/20 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10 rounded-full blur-3xl" />
      
      {/* Header with theme toggle and user menu */}
      <div className="relative z-10 flex justify-end items-center gap-2 p-4">
        <ThemeToggle />
        {user && <UserMenu />}
      </div>
      
      <div className="relative z-10 flex items-center justify-center p-4 pt-0">
        {/* Gradient border wrapper */}
        <div className="relative p-[1px] rounded-3xl bg-gradient-to-br from-primary/20 via-background to-accent/20 shadow-2xl shadow-primary/5 dark:shadow-primary/10">
          <Card className="w-full max-w-2xl text-center bg-card/95 backdrop-blur-xl rounded-3xl border-0">
            <CardHeader className="pb-2">
              <img src={cortekLogo} alt="CORTEK" className="h-12 mx-auto mb-6" />
              <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
                Padel Club Automation
              </CardTitle>
              <CardDescription className="text-base mt-2 text-muted-foreground font-medium">
                Streamlined. Automated. Effortless.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6 pt-4">
              <div className="space-y-3 text-left max-w-md mx-auto">
                {features.map((feature, index) => (
                  <div 
                    key={index} 
                    className="flex items-start gap-3 px-3 py-2.5 -mx-3 rounded-lg hover:bg-primary/5 transition-colors duration-200 cursor-default"
                  >
                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm">
                      <span className="font-medium text-foreground">{feature.title}</span>
                      <span className="text-muted-foreground"> — {feature.description}</span>
                    </p>
                  </div>
                ))}
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/20">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary font-medium">Trial starts when you complete setup</span>
              </div>
              
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate('/auth')}
                  className="w-full h-12 rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 transition-all duration-300 text-base font-semibold"
                  size="lg"
                  variant="hero"
                >
                  Start Free Trial
                </Button>
                
                <Button 
                  onClick={() => navigate('/auth?tab=login')}
                  variant="outline"
                  className="w-full h-12 rounded-xl border-border/60 hover:bg-muted/30 transition-all duration-300 text-base"
                  size="lg"
                >
                  Log In
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground/80 font-medium pt-1">
                No credit card required • Cancel anytime
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
