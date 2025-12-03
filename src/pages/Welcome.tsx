import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Calendar, MessageSquare, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserMenu } from '@/components/layout/UserMenu';
import cortekLogo from '@/assets/cortek-logo.svg';

export default function Welcome() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Calendar,
      title: "Court Availability",
      description: "Automatic notifications when courts become available"
    },
    {
      icon: MessageSquare,
      title: "Match Alerts",  
      description: "Get notified about partially filled matches to join"
    },
    {
      icon: Zap,
      title: "Competition Updates",
      description: "Stay updated on competitions and academy sessions"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-100 relative overflow-hidden">
      {/* Floating gradient orbs for atmosphere */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/15 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/10 to-accent/10 rounded-full blur-3xl" />
      
      {/* Header with user menu */}
      <div className="relative z-10 flex justify-end p-4">
        <UserMenu />
      </div>
      
      <div className="relative z-10 flex items-center justify-center p-4 pt-0">
        {/* Gradient border wrapper */}
        <div className="relative p-[1px] rounded-3xl bg-gradient-to-br from-primary/30 via-white to-accent/30 shadow-2xl shadow-primary/10">
          <Card className="w-full max-w-2xl text-center bg-white/90 backdrop-blur-xl rounded-3xl border-0">
            <CardHeader className="pb-4">
              <img src={cortekLogo} alt="CORTEK" className="h-14 mx-auto mb-6" />
              <CardTitle className="text-4xl font-bold tracking-tight">
                Paddle Club{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                  Automation
                </span>
              </CardTitle>
              <CardDescription className="text-lg mt-3 text-muted-foreground/80">
                Start your free 14-day trial
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {features.map((feature, index) => (
                  <div 
                    key={index} 
                    className="group flex flex-col items-center text-center p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 hover:from-primary/10 hover:to-accent/10 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
                  >
                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 shadow-lg shadow-primary/20 group-hover:shadow-xl group-hover:shadow-primary/30 transition-all duration-300">
                      <feature.icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="font-semibold text-base mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                ))}
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">Trial starts when you complete setup</span>
              </div>
              
              <div className="space-y-3 pt-2">
                <Button 
                  onClick={() => navigate('/auth')}
                  className="w-full rounded-xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300"
                  size="lg"
                  variant="hero"
                >
                  Start Free Trial
                </Button>
                
                <Button 
                  onClick={() => navigate('/auth?tab=login')}
                  variant="outline"
                  className="w-full rounded-xl hover:bg-muted/50 transition-all duration-300"
                  size="lg"
                >
                  Log In
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground/70 pt-2">
                No credit card required • Cancel anytime
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
