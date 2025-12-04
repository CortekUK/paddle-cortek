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

  const quickAccessItems = [
    {
      title: 'Court Availability',
      status: 'Active', 
      icon: Calendar,
      href: '/client/court-availability',
    },
    {
      title: 'Partial Matches',
      status: 'Active', 
      icon: Users,
      href: '/client/partial-matches',
    },
    {
      title: 'Competitions',
      status: 'Active',
      icon: Flag, 
      href: '/client/competitions-academies',
    },
    {
      title: 'Social Media',
      status: 'Active',
      icon: Image,
      href: '/client/social-media-library',
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
        
        {/* Quick Access Skeleton */}
        <div>
          <Skeleton className="h-5 w-40 mb-4" />
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
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

      {/* Quick Access Strip */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
            <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
          </div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Quick Access</h2>
        </div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {quickAccessItems.map((item) => (
            <Card 
              key={item.title}
              className={cn(
                cardClass,
                "group cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
              )}
              onClick={() => navigate(item.href)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted/50 dark:bg-muted/30 group-hover:bg-primary/10 transition-colors">
                  <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground truncate">{item.title}</h3>
                </div>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[10px] shrink-0">
                  {item.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
