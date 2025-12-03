import { useOrganizationAuth } from '@/hooks/useOrganizationAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Users, 
  Trophy, 
  MessageCircle, 
  Clock,
  CheckCircle,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { organization } = useOrganizationAuth();

  const automationCards = [
    {
      title: 'Court Availability',
      description: 'Automated availability notifications sent directly to your members',
      status: 'Active',
      icon: Calendar,
      href: '/client/court-availability',
      gradient: 'from-emerald-500/20 to-green-400/10',
      iconColor: 'text-emerald-600',
      hoverGradient: 'group-hover:from-emerald-500/30 group-hover:to-green-400/20'
    },
    {
      title: 'Partial Matches',
      description: 'Automatically find players for incomplete court bookings',
      status: 'Active', 
      icon: Users,
      href: '/client/partial-matches',
      gradient: 'from-primary/20 to-blue-400/10',
      iconColor: 'text-primary',
      hoverGradient: 'group-hover:from-primary/30 group-hover:to-blue-400/20'
    },
    {
      title: 'Competitions & Academies',
      description: 'Tournament registrations and training session updates',
      status: 'Active',
      icon: Trophy, 
      href: '/client/competitions-academies',
      gradient: 'from-accent/20 to-purple-400/10',
      iconColor: 'text-accent',
      hoverGradient: 'group-hover:from-accent/30 group-hover:to-purple-400/20'
    }
  ];

  // Category indicators
  const categories = [
    { name: 'Courts', color: 'bg-emerald-500' },
    { name: 'Matches', color: 'bg-primary' },
    { name: 'Events', color: 'bg-accent' }
  ];

  return (
    <div className="relative space-y-10">
      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Trial Days Remaining - with progress ring */}
        <Card className="bg-white/70 dark:bg-card/70 backdrop-blur-sm rounded-2xl shadow-xl shadow-primary/8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-0 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-6 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Trial Days</CardTitle>
            <div className="relative">
              {/* Progress ring */}
              <svg className="w-14 h-14 -rotate-90">
                <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="none" className="text-muted/30" />
                <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="4" fill="none" 
                  className="text-primary" 
                  strokeDasharray={`${(12/14) * 151} 151`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 relative">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-foreground">12</span>
              <span className="text-lg text-muted-foreground font-medium">/14</span>
            </div>
            <p className="text-xs text-muted-foreground/70 mt-1">days remaining</p>
          </CardContent>
        </Card>

        {/* Automation Categories - with indicator dots */}
        <Card className="bg-white/70 dark:bg-card/70 backdrop-blur-sm rounded-2xl shadow-xl shadow-primary/8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-0 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-6 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Automations</CardTitle>
            <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/15 to-emerald-400/10 shadow-inner">
              <CheckCircle className="h-5 w-5 text-green-600 animate-pulse-soft" />
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 relative">
            <div className="text-4xl font-bold text-foreground">3</div>
            <div className="flex items-center gap-2 mt-2">
              {categories.map((cat) => (
                <div key={cat.name} className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full", cat.color)} />
                  <span className="text-xs text-muted-foreground">{cat.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Messages Sent - with trend */}
        <Card className="bg-white/70 dark:bg-card/70 backdrop-blur-sm rounded-2xl shadow-xl shadow-primary/8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-0 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-6 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Messages Sent</CardTitle>
            <div className="p-3 rounded-xl bg-gradient-to-br from-accent/15 to-purple-400/10 shadow-inner">
              <MessageCircle className="h-5 w-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 relative">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-foreground">247</span>
              <Badge className="bg-green-500/10 text-green-600 border-0 text-xs font-medium px-2 py-0.5">
                <TrendingUp className="h-3 w-3 mr-1" />
                +23%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground/70 mt-1">this month</p>
          </CardContent>
        </Card>

        {/* Club Status - with pulse indicator */}
        <Card className="bg-white/70 dark:bg-card/70 backdrop-blur-sm rounded-2xl shadow-xl shadow-primary/8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-0 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-6 relative">
            <CardTitle className="text-sm font-medium text-muted-foreground">Club Status</CardTitle>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              <Badge className="bg-green-500/10 text-green-600 border-0 hover:bg-green-500/20 font-medium text-xs">
                Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-6 relative">
            <div className="text-xl font-bold text-foreground truncate">
              {organization?.name || 'Your Club'}
            </div>
            <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1.5">
              <Zap className="h-3 w-3 text-primary" />
              All automations running
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Automation Services */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-5">Your Automations</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {automationCards.map((card) => (
            <Card 
              key={card.title} 
              className="bg-white/70 dark:bg-card/70 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer border-0 group hover:-translate-y-1"
              onClick={() => navigate(card.href)}
            >
              <CardHeader className="p-6 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-4 rounded-2xl bg-gradient-to-br transition-all duration-300 shadow-inner",
                      card.gradient,
                      card.hoverGradient
                    )}>
                      <card.icon className={cn("h-7 w-7 transition-transform duration-300 group-hover:scale-110", card.iconColor)} />
                    </div>
                    <div className="pt-1">
                      <CardTitle className="text-lg font-semibold text-foreground">{card.title}</CardTitle>
                      <Badge variant="outline" className="mt-2 text-xs border-green-500/30 text-green-600 bg-green-500/10 animate-pulse-soft">
                        {card.status}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-primary/50 group-hover:text-primary group-hover:bg-primary/10 transition-all duration-300 rounded-xl"
                  >
                    <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0">
                <CardDescription className="text-sm text-muted-foreground leading-relaxed">{card.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Coming Soon - Premium treatment */}
      <div className="p-[1px] rounded-2xl bg-gradient-to-r from-primary/30 via-accent/20 to-primary/30 animate-gradient">
        <Card className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-2xl border-0">
          <CardContent className="py-12 px-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 mb-5 animate-float">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  More Magic Coming Soon
                </span>
              </h3>
              <p className="text-sm text-muted-foreground/80 max-w-md mx-auto leading-relaxed">
                We're building something special. Advanced analytics, custom automation rules, 
                and detailed insights are on the way to supercharge your club.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
