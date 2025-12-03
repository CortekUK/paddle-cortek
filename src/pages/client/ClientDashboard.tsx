import { useOrganizationAuth } from '@/hooks/useOrganizationAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Users, 
  Trophy, 
  MessageCircle, 
  Clock,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { organization } = useOrganizationAuth();

  const automationCards = [
    {
      title: 'Court Availability',
      description: 'Automated availability notifications',
      status: 'Active',
      icon: Calendar,
      href: '/client/court-availability',
      gradient: 'from-green-500/20 to-emerald-500/20',
      iconColor: 'text-green-600'
    },
    {
      title: 'Partial Matches',
      description: 'Find players for incomplete bookings',
      status: 'Active', 
      icon: Users,
      href: '/client/partial-matches',
      gradient: 'from-primary/20 to-blue-500/20',
      iconColor: 'text-primary'
    },
    {
      title: 'Competitions & Academies',
      description: 'Tournament and training updates',
      status: 'Active',
      icon: Trophy, 
      href: '/client/competitions-academies',
      gradient: 'from-accent/20 to-purple-500/20',
      iconColor: 'text-accent'
    }
  ];

  return (
    <div className="relative space-y-8">
      {/* Floating gradient orbs */}
      <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl -z-10" />

      {/* Dashboard Header */}
      <div className="text-center pt-4 pb-2">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to your CORTEK club automation hub
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Trial Days Remaining */}
        <Card className="bg-white dark:bg-card shadow-md hover:shadow-lg transition-shadow border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Trial Days Remaining</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-foreground">12</div>
            <p className="text-xs text-muted-foreground mt-1">
              of 14 day trial
            </p>
          </CardContent>
        </Card>

        {/* Automation Categories */}
        <Card className="bg-white dark:bg-card shadow-md hover:shadow-lg transition-shadow border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Automation Categories</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-foreground">3</div>
            <p className="text-xs text-muted-foreground mt-1">
              WhatsApp groups configured
            </p>
          </CardContent>
        </Card>

        {/* Messages Sent */}
        <Card className="bg-white dark:bg-card shadow-md hover:shadow-lg transition-shadow border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Messages Sent</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageCircle className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold text-foreground">247</div>
            <p className="text-xs text-muted-foreground mt-1">
              this month
            </p>
          </CardContent>
        </Card>

        {/* Club Info */}
        <Card className="bg-white dark:bg-card shadow-md hover:shadow-lg transition-shadow border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Club Status</CardTitle>
            <Badge className="bg-primary/10 text-primary border-0 hover:bg-primary/20">Active</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold text-foreground truncate">
              {organization?.name || 'Your Club'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Automation enabled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Automation Services */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {automationCards.map((card) => (
          <Card 
            key={card.title} 
            className="bg-white dark:bg-card shadow-md hover:shadow-lg transition-all cursor-pointer border-0 group"
            onClick={() => navigate(card.href)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-3 rounded-xl bg-gradient-to-br",
                    card.gradient
                  )}>
                    <card.icon className={cn("h-5 w-5", card.iconColor)} />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-foreground">{card.title}</CardTitle>
                    <Badge variant="outline" className="mt-1.5 text-xs border-green-500/30 text-green-600 bg-green-500/10">
                      {card.status}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary group-hover:bg-primary/10 transition-colors"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-sm text-muted-foreground">{card.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Coming Soon */}
      <Card className="bg-white dark:bg-card shadow-sm border-0 rounded-2xl">
        <CardContent className="py-8">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">More Features Coming Soon</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Advanced analytics, custom automation rules, and detailed reporting are on the way.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
