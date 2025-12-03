
import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

interface DashboardStats {
  todaysSends: number;
  lastSendStatus?: number;
  locationName?: string;
  locationTimezone?: string;
}

export default function Dashboard() {
  const { profile } = useAuth();
  const { canManageLocation, loading: roleLoading } = useUserRole();
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

  const getStatusIcon = (statusCode?: number) => {
    if (!statusCode) return <Clock className="h-6 w-6 text-yellow-500" />;
    if (statusCode >= 200 && statusCode < 300) return <CheckCircle className="h-6 w-6 text-green-500" />;
    return <XCircle className="h-6 w-6 text-red-500" />;
  };

  const getStatusText = (statusCode?: number) => {
    if (!statusCode) return 'Pending';
    if (statusCode >= 200 && statusCode < 300) return 'Success';
    return 'Failed';
  };

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
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to CORTEK - your paddle club automation hub.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Today's Sends */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sends</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todaysSends}</div>
            <p className="text-xs text-muted-foreground">
              Messages sent today
            </p>
          </CardContent>
        </Card>

        {/* Last Send Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Send Status</CardTitle>
            {getStatusIcon(stats.lastSendStatus)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getStatusText(stats.lastSendStatus)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.lastSendStatus ? `HTTP ${stats.lastSendStatus}` : 'No sends yet'}
            </p>
          </CardContent>
        </Card>

        {/* Current Location */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Location</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.locationName || 'No Location'}
            </div>
            <p className="text-xs text-muted-foreground">
              <Clock className="inline h-3 w-3 mr-1" />
              {stats.locationTimezone || 'Unknown timezone'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Send Message</CardTitle>
            <CardDescription>
              Compose and send a new message to your paddle groups.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/admin/send-message">
                <Send className="h-4 w-4 mr-2" />
                Compose Message
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>View Logs</CardTitle>
            <CardDescription>
              Check your message sending history and debug any issues.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/admin/logs">
                <FileText className="h-4 w-4 mr-2" />
                View Send Logs
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Location Status */}
      {stats.locationName && (
        <Card>
          <CardHeader>
            <CardTitle>Location Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{stats.locationName}</h3>
                <p className="text-sm text-muted-foreground">
                  Timezone: {stats.locationTimezone}
                </p>
              </div>
              <Badge variant="secondary">
                Active
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
