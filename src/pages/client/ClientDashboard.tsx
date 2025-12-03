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
  ArrowRight,
  Sparkles
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
      gradient: 'from-emerald-500/20 to-green-400/20',
      iconColor: 'text-emerald-600'
    },
    {
      title: 'Partial Matches',
      description: 'Find players for incomplete bookings',
      status: 'Active', 
      icon: Users,
      href: '/client/partial-matches',
      gradient: 'from-primary/20 to-blue-400/20',
      iconColor: 'text-primary'
    },
    {
      title: 'Competitions & Academies',
      description: 'Tournament and training updates',
      status: 'Active',
      icon: Trophy, 
      href: '/client/competitions-academies',
      gradient: 'from-accent/20 to-purple-400/20',
      iconColor: 'text-accent'
    }
  ];

  return (
    <div className="relative space-y-10">
      {/* Dashboard Header */}
      <div className="pt-2 pb-4">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground/80 mt-1">
          Welcome to your CORTEK club automation hub
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-4">
        {/* Trial Days Remaining */}
        <Card className="bg-white dark:bg-card rounded-2xl shadow-lg shadow-primary/5 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 p-6">
            <CardTitle className="text-sm font-medium text-muted-foreground">Trial Days Remaining</CardTitle>
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/15 to-blue-400/15">
              <Clock className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-4xl font-bold text-foreground">12</div>
            <p className="text-xs text-muted-foreground/70 mt-1.5">
              of 14 day trial
            </p>
          </CardContent>
        </Card>

        {/* Automation Categories */}
        <Card className="bg-white dark:bg-card rounded-2xl shadow-lg shadow-primary/5 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 p-6">
            <CardTitle className="text-sm font-medium text-muted-foreground">Automation Categories</CardTitle>
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/15 to-emerald-400/15">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-4xl font-bold text-foreground">3</div>
            <p className="text-xs text-muted-foreground/70 mt-1.5">
              WhatsApp groups configured
            </p>
          </CardContent>
        </Card>

        {/* Messages Sent */}
        <Card className="bg-white dark:bg-card rounded-2xl shadow-lg shadow-primary/5 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 p-6">
            <CardTitle className="text-sm font-medium text-muted-foreground">Messages Sent</CardTitle>
            <div className="p-3 rounded-xl bg-gradient-to-br from-accent/15 to-purple-400/15">
              <MessageCircle className="h-5 w-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-4xl font-bold text-foreground">247</div>
            <p className="text-xs text-muted-foreground/70 mt-1.5">
              this month
            </p>
          </CardContent>
        </Card>

        {/* Club Info */}
        <Card className="bg-white dark:bg-card rounded-2xl shadow-lg shadow-primary/5 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 p-6">
            <CardTitle className="text-sm font-medium text-muted-foreground">Club Status</CardTitle>
            <Badge className="bg-green-500/10 text-green-600 border-0 hover:bg-green-500/20 font-medium">Active</Badge>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <div className="text-xl font-bold text-foreground truncate">
              {organization?.name || 'Your Club'}
            </div>
            <p className="text-xs text-muted-foreground/70 mt-1.5">
              Automation enabled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Automation Services */}
      <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
        {automationCards.map((card) => (
          <Card 
            key={card.title} 
            className="bg-white dark:bg-card rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer border-0 group"
            onClick={() => navigate(card.href)}
          >
            <CardHeader className="p-6 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-4 rounded-2xl bg-gradient-to-br",
                    card.gradient
                  )}>
                    <card.icon className={cn("h-6 w-6", card.iconColor)} />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-foreground">{card.title}</CardTitle>
                    <Badge variant="outline" className="mt-2 text-xs border-green-500/30 text-green-600 bg-green-500/10">
                      {card.status}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary group-hover:bg-primary/10 transition-all duration-200"
                >
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
              <CardDescription className="text-sm text-muted-foreground">{card.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Coming Soon - with gradient border */}
      <div className="p-[1px] rounded-2xl bg-gradient-to-r from-primary/20 via-accent/10 to-primary/20">
        <Card className="bg-white dark:bg-card rounded-2xl border-0">
          <CardContent className="py-10 px-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center p-3 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 mb-4">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-base font-medium text-foreground mb-2">More Features Coming Soon</h3>
              <p className="text-sm text-muted-foreground/80 max-w-md mx-auto">
                We're cooking up some exciting new features for you! Advanced analytics, custom automation rules, and detailed reporting are on the way.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
