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
  ArrowRight,
  Sparkles,
  TrendingUp,
  Zap,
  Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { organization } = useOrganizationAuth();

  const secondaryAutomations = [
    {
      title: 'Partial Matches',
      description: 'Auto-find players for incomplete bookings',
      status: 'Active', 
      icon: Users,
      href: '/client/partial-matches',
      accentColor: 'border-l-primary',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary'
    },
    {
      title: 'Competitions',
      description: 'Tournament & academy updates',
      status: 'Active',
      icon: Trophy, 
      href: '/client/competitions-academies',
      accentColor: 'border-l-accent',
      iconBg: 'bg-accent/10',
      iconColor: 'text-accent'
    }
  ];

  return (
    <div className="relative space-y-8">
      {/* Bento Grid - Stats Row */}
      <div className="grid gap-5 grid-cols-1 md:grid-cols-4">
        {/* Trial Days - Compact */}
        <Card className="bg-white/70 dark:bg-card/70 backdrop-blur-sm rounded-2xl shadow-lg border-0 overflow-hidden group hover:shadow-xl transition-all duration-300">
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
        <Card className="md:col-span-2 bg-white/70 dark:bg-card/70 backdrop-blur-sm rounded-2xl shadow-lg border-0 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Performance</span>
              <Activity className="h-4 w-4 text-muted-foreground/60" />
            </div>
            <div className="grid grid-cols-2 gap-6">
              {/* Automations */}
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/15 to-green-400/10">
                  <Zap className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground">3</div>
                  <p className="text-xs text-muted-foreground">Active automations</p>
                </div>
              </div>
              {/* Messages */}
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-accent/15 to-purple-400/10">
                  <MessageCircle className="h-5 w-5 text-accent" />
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
        <Card className="bg-white/70 dark:bg-card/70 backdrop-blur-sm rounded-2xl shadow-lg border-0 overflow-hidden group hover:shadow-xl transition-all duration-300">
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
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">Your Automations</h2>
        <div className="grid gap-5 grid-cols-1 md:grid-cols-3 auto-rows-fr">
          {/* Hero Card - Court Availability */}
          <Card 
            className="md:col-span-2 md:row-span-2 bg-white/70 dark:bg-card/70 backdrop-blur-sm rounded-3xl shadow-xl border-0 overflow-hidden group cursor-pointer hover:shadow-2xl transition-all duration-300 relative"
            onClick={() => navigate('/client/court-availability')}
          >
            {/* Decorative background pattern */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500 to-green-400 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-primary to-blue-400 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
            </div>
            
            <CardContent className="p-8 h-full flex flex-col relative">
              <div className="flex items-start justify-between mb-6">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-green-400/10 shadow-inner group-hover:scale-105 transition-transform duration-300">
                  <Calendar className="h-8 w-8 text-emerald-600" />
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
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 group-hover:shadow-xl group-hover:shadow-emerald-600/30 transition-all"
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
                "bg-white/70 dark:bg-card/70 backdrop-blur-sm rounded-2xl shadow-lg border-0 border-l-4 overflow-hidden group cursor-pointer hover:shadow-xl transition-all duration-300",
                card.accentColor
              )}
              onClick={() => navigate(card.href)}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-5 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className={cn("p-3 rounded-xl", card.iconBg)}>
                    <card.icon className={cn("h-5 w-5", card.iconColor)} />
                  </div>
                  <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 bg-emerald-500/10 text-[10px]">
                    {card.status}
                  </Badge>
                </div>
                
                <div className="flex-1">
                  <CardTitle className="text-base font-semibold text-foreground mb-1">{card.title}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground line-clamp-2">{card.description}</CardDescription>
                </div>

                <div className="flex items-center justify-end mt-4">
                  <ArrowRight className={cn("h-4 w-4 transition-transform duration-300 group-hover:translate-x-1", card.iconColor)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Coming Soon - Slim Accent Strip */}
      <div className="p-[1px] rounded-xl bg-gradient-to-r from-primary/20 via-accent/30 to-primary/20">
        <Card className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-xl border-0">
          <CardContent className="py-5 px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 animate-float">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    More Magic Coming Soon
                  </h3>
                  <p className="text-xs text-muted-foreground">Advanced analytics & custom automation rules</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary hover:bg-primary/10 rounded-lg text-xs">
                Learn more
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
