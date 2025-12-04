import { useOrganizationAuth } from '@/hooks/useOrganizationAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  Users, 
  Flag, 
  Send, 
  Clock,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Activity,
  Image
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { organization, loading } = useOrganizationAuth();

  const cardClass = "bg-white/70 dark:bg-card/70 backdrop-blur-sm rounded-2xl shadow-lg border border-border/60 dark:border-white/[0.12] overflow-hidden";

  const secondaryAutomations = [
    {
      title: 'Partial Matches',
      description: 'Auto-find players for incomplete bookings',
      status: 'Active', 
      icon: Users,
      href: '/client/partial-matches',
      accentColor: 'border-l-primary/50'
    },
    {
      title: 'Competitions',
      description: 'Tournament & academy updates',
      status: 'Active',
      icon: Flag, 
      href: '/client/competitions-academies',
      accentColor: 'border-l-accent/50'
    },
    {
      title: 'Social Media',
      description: 'Create and schedule social posts',
      status: 'Active',
      icon: Image,
      href: '/client/social-media-library',
      accentColor: 'border-l-purple-500/50'
    }
  ];

  if (loading) {
    return (
      <div className="relative space-y-8">
        {/* Header Skeleton */}
        <div className="relative -mx-8 -mt-8 px-8 py-10 mb-4 bg-gradient-to-r from-primary/20 via-purple-500/15 to-primary/10 dark:from-primary/15 dark:via-purple-500/10 dark:to-primary/8 border-b border-primary/15">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/50" />
          <div className="relative">
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-72" />
          </div>
        </div>
        
        {/* Stats Row Skeleton */}
        <div className="grid gap-5 grid-cols-1 md:grid-cols-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="md:col-span-2 h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        
        {/* Features Skeleton */}
        <div>
          <Skeleton className="h-5 w-40 mb-4" />
          <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
            <Skeleton className="md:col-span-2 md:row-span-2 h-80 rounded-3xl" />
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-8">
      {/* Premium Gradient Page Header */}
      <div className="relative -mx-8 -mt-8 px-8 py-10 mb-4 bg-gradient-to-r from-primary/20 via-purple-500/15 to-primary/10 dark:from-primary/15 dark:via-purple-500/10 dark:to-primary/8 border-b border-primary/15">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/50" />
        <div className="relative text-left">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Welcome back{organization?.club_name ? `, ${organization.club_name}` : ''}
          </h1>
          <p className="text-muted-foreground mt-1.5">
            Overview of your automation platform
          </p>
        </div>
      </div>

      {/* Bento Grid - Stats Row */}
      <div className="grid gap-5 grid-cols-1 md:grid-cols-4">
        {/* Trial Days - Compact */}
        <Card className={cn(cardClass, "group hover:shadow-xl transition-all duration-300")}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Trial</span>
              <Clock className="h-4 w-4 text-muted-foreground/60" />
            </div>
            <div className="flex items-center gap-4">
              {/* Mini progress ring */}
              <div className="relative">
                <svg className="w-12 h-12 -rotate-90">
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" fill="none" className="text-muted/20" />
                  <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" fill="none" 
                    className="text-primary" 
                    strokeDasharray={`${(12/14) * 126} 126`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">12</span>
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">12 days</div>
                <p className="text-xs text-muted-foreground">remaining</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Combined Stats Card - Wide (spans 2 columns) */}
        <Card className={cn(cardClass, "md:col-span-2")}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Performance</span>
              <Activity className="h-4 w-4 text-muted-foreground/60" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              {/* Automations */}
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-muted/50 dark:bg-muted/30">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">3</div>
                  <p className="text-xs text-muted-foreground">Active automations</p>
                </div>
              </div>
              {/* Messages */}
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-lg bg-muted/50 dark:bg-muted/30">
                  <Send className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-foreground">247</span>
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-[10px] font-medium px-1.5 py-0">
                      <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                      +23%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Messages this month</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Club Status - Compact */}
        <Card className={cn(cardClass, "group hover:shadow-xl transition-all duration-300")}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <div className="text-lg font-bold text-foreground truncate mb-1">
              {organization?.name || 'Your Club'}
            </div>
            <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-xs font-medium">
              All systems active
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Bento Grid - Features */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
            <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
          </div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Your Automations</h2>
        </div>
        <div className="grid gap-5 grid-cols-1 md:grid-cols-3 auto-rows-fr">
          {/* Hero Card - Court Availability */}
          <Card 
            className={cn(cardClass, "md:col-span-2 md:row-span-2 rounded-3xl shadow-xl group cursor-pointer hover:shadow-2xl transition-all duration-300")}
            onClick={() => navigate('/client/court-availability')}
          >
            <CardContent className="p-8 h-full flex flex-col">
              <div className="flex items-start justify-between mb-6">
                <div className="p-3 rounded-xl bg-muted/50 dark:bg-muted/30 group-hover:bg-muted/70 transition-colors duration-300">
                  <Calendar className="h-6 w-6 text-foreground" strokeWidth={1.5} />
                </div>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 animate-pulse-soft">
                  Active
                </Badge>
              </div>
              
              <div className="flex-1">
                <CardTitle className="text-2xl font-bold text-foreground mb-3">Court Availability</CardTitle>
                <CardDescription className="text-base text-muted-foreground leading-relaxed max-w-md">
                  Automated availability notifications sent directly to your members when courts become free. Never miss a booking opportunity.
                </CardDescription>
              </div>

              <div className="flex items-center justify-between mt-6 pt-6 border-t border-border/40">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Last sent 2 hours ago</span>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  className="rounded-xl"
                >
                  Manage
                  <ArrowRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Secondary Cards - Stacked */}
          {secondaryAutomations.map((card, index) => (
            <Card 
              key={card.title}
              className={cn(
                cardClass,
                "border-l-4 group cursor-pointer hover:shadow-xl transition-all duration-300",
                card.accentColor
              )}
              onClick={() => navigate(card.href)}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-5 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-lg bg-muted/50 dark:bg-muted/30">
                    <card.icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                  </div>
                  <Badge variant="outline" className="border-border text-muted-foreground bg-muted/30 text-[10px]">
                    {card.status}
                  </Badge>
                </div>
                
                <div className="flex-1">
                  <CardTitle className="text-base font-semibold text-foreground mb-1">{card.title}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground line-clamp-2">{card.description}</CardDescription>
                </div>

                <div className="flex items-center justify-end mt-4">
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
