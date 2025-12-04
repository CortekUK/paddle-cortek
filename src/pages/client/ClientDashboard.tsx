import { useOrganizationAuth } from '@/hooks/useOrganizationAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Users, Flag, Image, BarChart3 } from 'lucide-react';
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
        <div className="grid gap-5 grid-cols-2 md:grid-cols-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
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
            Welcome Back{organization?.club_name ? `, ${organization.club_name}` : ''}
          </h1>
          <p className="text-muted-foreground mt-1.5">
            Overview of your automation platform
          </p>
        </div>
      </div>

      {/* Ultra-Minimal Stats Row */}
      <div className="grid gap-5 grid-cols-2 md:grid-cols-4">
        {/* Trial Days */}
        <Card className={cn(cardClass)}>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Trial</p>
            <div className="text-3xl font-bold text-foreground">12</div>
            <p className="text-sm text-muted-foreground">days left</p>
          </CardContent>
        </Card>

        {/* Automations */}
        <Card className={cn(cardClass)}>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Automations</p>
            <div className="text-3xl font-bold text-foreground">3</div>
            <p className="text-sm text-muted-foreground">active</p>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card className={cn(cardClass)}>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Messages</p>
            <div className="text-3xl font-bold text-foreground">247</div>
            <p className="text-sm text-muted-foreground">this month</p>
          </CardContent>
        </Card>

        {/* Status */}
        <Card className={cn(cardClass)}>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Status</p>
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-500">Active</div>
            <p className="text-sm text-muted-foreground truncate">{organization?.name || 'All systems'}</p>
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
              <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                <div className="p-3 rounded-xl bg-muted/50 dark:bg-muted/30 group-hover:bg-primary/10 transition-colors">
                  <item.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" strokeWidth={1.5} />
                </div>
                <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[10px]">
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
