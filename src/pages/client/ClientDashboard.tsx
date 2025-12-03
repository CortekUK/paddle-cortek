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
      color: 'text-green-600'
    },
    {
      title: 'Partial Matches',
      description: 'Find players for incomplete bookings',
      status: 'Active', 
      icon: Users,
      href: '/client/partial-matches',
      color: 'text-blue-600'
    },
    {
      title: 'Competitions & Academies',
      description: 'Tournament and training updates',
      status: 'Active',
      icon: Trophy, 
      href: '/client/competitions-academies',
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome to your CORTEK club automation hub
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Trial Days Remaining */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trial Days Remaining</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              of 14 day trial
            </p>
          </CardContent>
        </Card>

        {/* Automation Categories */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Automation Categories</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              WhatsApp groups configured
            </p>
          </CardContent>
        </Card>

        {/* Messages Sent */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">247</div>
            <p className="text-xs text-muted-foreground">
              this month
            </p>
          </CardContent>
        </Card>

        {/* Club Info */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Club Status</CardTitle>
            <Badge variant="secondary">Active</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium truncate">
              {organization?.name || 'Your Club'}
            </div>
            <p className="text-xs text-muted-foreground">
              Automation enabled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Automation Services */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {automationCards.map((card) => (
          <Card key={card.title} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg bg-muted", card.color)}>
                    <card.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{card.title}</CardTitle>
                    <Badge variant="outline" className="mt-1">
                      {card.status}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(card.href)}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>{card.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Coming Soon */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-dashed">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">More Features Coming Soon</h3>
            <p className="text-muted-foreground">
              Advanced analytics, custom automation rules, and detailed reporting are on the way.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes: (string | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}