import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Zap, MessageSquare, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { UserMenu } from '@/components/layout/UserMenu';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header with user menu */}
      <div className="flex justify-end p-4">
        <UserMenu />
      </div>
      
      <div className="flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 bg-primary rounded-full flex items-center justify-center">
                <Zap className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold">Welcome to CORTEK</CardTitle>
            <CardDescription className="text-lg">
              Paddle Club Automation - Start your free 14-day trial
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {features.map((feature, index) => (
                <div key={index} className="flex flex-col items-center text-center p-4">
                  <feature.icon className="h-8 w-8 text-primary mb-2" />
                  <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-6">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Trial starts when you complete setup</span>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/auth')}
                className="w-full"
                size="lg"
              >
                Start Free Trial
              </Button>
              
              <Button 
                onClick={() => navigate('/auth?tab=login')}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Log In
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              No credit card required • Cancel anytime
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}