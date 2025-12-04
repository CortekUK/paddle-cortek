
import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { 
  Send, 
  FileText, 
  MapPin, 
  Clock,
  CheckCircle, 
  XCircle,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardStats {
  todaysSends: number;
  lastSendStatus?: number;
  locationName?: string;
  locationTimezone?: string;
}

const quickAccessItems = [
  {
    title: 'Send Message',
    description: 'Compose and send messages',
    href: '/admin/send-message',
    icon: Send,
  },
  {
    title: 'View Logs',
    description: 'Check sending history',
    href: '/admin/logs',
    icon: FileText,
  },
];

export default function Dashboard() {
  const { profile } = useAuth();
  const { canManageLocation, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    todaysSends: 0
  });
  const [loading, setLoading] = useState(true);

  // Check if user needs to be redirected to setup
  const needsSetup = !profile?.location_id && canManageLocation();
  if (!roleLoading && needsSetup) {
    return <Navigate to="/admin/setup" replace />;
  }

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get today's sends count
        const today = new Date().toISOString().split('T')[0];
        const { data: sendLogs, error: sendError } = await supabase
          .from('send_logs')
          .select('status_code, created_at')
          .gte('created_at', `${today}T00:00:00`)
          .order('created_at', { ascending: false });

        if (sendError) throw sendError;

        // Get location info
        let locationData = null;
        if (profile?.location_id) {
          const { data: location, error: locationError } = await supabase
            .from('locations')
            .select('name, timezone')
            .eq('id', profile.location_id)
            .single();

          if (!locationError) {
            locationData = location;
          }
        }

        setStats({
          todaysSends: sendLogs?.length || 0,
          lastSendStatus: sendLogs?.[0]?.status_code,
          locationName: locationData?.name,
          locationTimezone: locationData?.timezone
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!roleLoading) {
      fetchStats();
    }
  }, [profile?.location_id, roleLoading]);

  const getStatusColor = (statusCode?: number) => {
    if (!statusCode) return 'text-yellow-500';
    if (statusCode >= 200 && statusCode < 300) return 'text-emerald-500';
    return 'text-red-500';
  };

  const getStatusText = (statusCode?: number) => {
    if (!statusCode) return 'Pending';
    if (statusCode >= 200 && statusCode < 300) return 'Success';
    return 'Failed';
  };

  const cardClass = "bg-white/70 dark:bg-card/70 backdrop-blur-sm rounded-2xl shadow-lg border border-border/60 dark:border-white/[0.12] overflow-hidden";

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show setup required message for viewers/editors without location
  if (!profile?.location_id && !canManageLocation()) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-4">Setup Required</h1>
        <p className="text-muted-foreground mb-6">
          Your account needs to be associated with a paddle club location. 
          Please contact your administrator to complete the setup.
        </p>
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm">
            <strong>Need help?</strong> Ask an admin to assign you to a location in the Users section.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-[#F7F5FF] via-purple-50/30 to-background dark:from-background dark:via-background dark:to-background">
      {/* Premium Gradient Header Banner */}
      <div className="relative -mx-6 -mt-6 px-6 py-8 bg-gradient-to-r from-primary/20 via-purple-500/15 to-primary/10 dark:from-primary/15 dark:via-purple-500/10 dark:to-primary/8 border-b border-primary/15">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/50" />
        <div className="relative text-left">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome Back — your padel club automation hub.
          </p>
        </div>
      </div>

      <div className="px-8 py-8 space-y-8">
        {/* Stats Cards - Ultra Minimal */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Today's Sends */}
          <Card className={cardClass}>
            <CardContent className="p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Today's Sends</p>
              <p className="text-4xl font-bold tracking-tight mt-2">{stats.todaysSends}</p>
              <p className="text-sm text-muted-foreground mt-1">messages sent</p>
            </CardContent>
          </Card>

          {/* Last Send Status */}
          <Card className={cardClass}>
            <CardContent className="p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Last Send</p>
              <p className={cn("text-4xl font-bold tracking-tight mt-2", getStatusColor(stats.lastSendStatus))}>
                {getStatusText(stats.lastSendStatus)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {stats.lastSendStatus ? `HTTP ${stats.lastSendStatus}` : 'No sends yet'}
              </p>
            </CardContent>
          </Card>

          {/* Current Location */}
          <Card className={cardClass}>
            <CardContent className="p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Location</p>
              <p className="text-2xl font-bold tracking-tight mt-2 truncate">
                {stats.locationName?.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ') || 'Not Set'}
              </p>
              <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {stats.locationTimezone || 'Unknown'}
              </p>
            </CardContent>
          </Card>

          {/* Status */}
          <Card className={cardClass}>
            <CardContent className="p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xl font-bold tracking-tight">Active</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">System operational</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access Section */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickAccessItems.map((item) => (
              <Card
                key={item.href}
                className={cn(
                  cardClass,
                  "group cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
                )}
                onClick={() => navigate(item.href)}
              >
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-purple-100/50 dark:bg-purple-900/20 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
                    <item.icon className="h-5 w-5 text-purple-600 dark:text-purple-400 transition-colors" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
