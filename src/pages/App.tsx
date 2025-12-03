import { useOrganizationAuth } from '@/hooks/useOrganizationAuth';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserMenu } from '@/components/layout/UserMenu';
import { 
  MessageSquare, 
  Calendar, 
  Trophy, 
  Settings, 
  Building2,
  Clock,
  CheckCircle,
  ExternalLink
} from 'lucide-react';

export default function App() {
  const { profile, organization, loading } = useOrganizationAuth();
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header with user menu */}
      <div className="flex items-center justify-between p-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome to CORTEK
          </h1>
          <p className="text-muted-foreground mt-1">
            Paddle Club Automation Dashboard
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Trial Active
          </Badge>
          <UserMenu />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 space-y-6">
        {/* Organization Info */}
        {organization && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5" />
                <div>
                  <CardTitle>{organization.name || 'Your Organization'}</CardTitle>
                  <CardDescription>
                    {profile?.role === 'org_admin' ? 'Organization Administrator' : 'Team Member'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            {organization.playtomic_club_url && (
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Playtomic Club</span>
                  <Button variant="outline" size="sm" asChild>
                    <a href={organization.playtomic_club_url} target="_blank" rel="noopener noreferrer">
                      View Club <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Trial Days Remaining
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">14</div>
              <p className="text-xs text-muted-foreground">
                Upgrade anytime for full access
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Automation Categories
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">
                WhatsApp groups configured
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Messages Sent
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
              <p className="text-xs text-muted-foreground">
                Automation just started
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Automation Categories */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-blue-600" />
                <div>
                  <CardTitle className="text-lg">Court Availability</CardTitle>
                  <CardDescription>
                    Automated court booking notifications
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Status</span>
                  <Badge variant="secondary">Active</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Messages Today</span>
                  <span className="font-medium">0</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-green-600" />
                <div>
                  <CardTitle className="text-lg">Partial Matches</CardTitle>
                  <CardDescription>
                    Find players for incomplete bookings
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Status</span>
                  <Badge variant="secondary">Active</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Messages Today</span>
                  <span className="font-medium">0</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-amber-600" />
                <div>
                  <CardTitle className="text-lg">Competitions & Academies</CardTitle>
                  <CardDescription>
                    Tournament and training updates
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Status</span>
                  <Badge variant="secondary">Active</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Messages Today</span>
                  <span className="font-medium">0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coming Soon */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Coming Soon
            </CardTitle>
            <CardDescription>
              Additional features will be available after your trial
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>• Detailed analytics and reporting</div>
              <div>• Custom message templates</div>
              <div>• Advanced scheduling options</div>
              <div>• Team member management</div>
              <div>• Integration settings</div>
              <div>• Billing and subscription management</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}