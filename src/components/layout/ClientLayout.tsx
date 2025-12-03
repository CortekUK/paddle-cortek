import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Trophy, 
  Settings,
  Menu,
  X,
  LogOut,
  Image
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationAuth } from '@/hooks/useOrganizationAuth';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/utils';

const sidebarItems = [
  {
    title: 'Dashboard',
    href: '/client/dashboard',
    icon: LayoutDashboard
  },
  {
    title: 'Court Availability',
    href: '/client/court-availability',
    icon: Calendar
  },
  {
    title: 'Partial Matches',
    href: '/client/partial-matches',
    icon: Users
  },
  {
    title: 'Competitions & Academies',
    href: '/client/competitions-academies',
    icon: Trophy
  },
  {
    title: 'Social Media Library',
    href: '/client/social-media-library',
    icon: Image
  },
  {
    title: 'Settings',
    href: '/client/settings',
    icon: Settings
  }
];

export function ClientLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { organization } = useOrganizationAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const orgName = organization?.name || 'Your Organization';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-purple-50/40 to-blue-50/30 dark:from-background dark:via-purple-950/20 dark:to-blue-950/10">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-card border-r border-border/50 shadow-sm transition-transform duration-200 ease-in-out",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Sidebar header */}
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <div>
              <h2 className="font-semibold text-foreground">CORTEK Client</h2>
              <p className="text-sm text-muted-foreground">Club Portal</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              {sidebarItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.href}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3 transition-colors",
                        isActive 
                          ? "bg-primary/10 text-primary font-medium hover:bg-primary/15" 
                          : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                      )}
                      onClick={() => {
                        navigate(item.href);
                        setSidebarOpen(false);
                      }}
                    >
                      <item.icon className={cn("h-4 w-4", isActive && "text-primary")} />
                      {item.title}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top header */}
        <header className="bg-white/80 dark:bg-card/80 backdrop-blur-sm border-b border-border/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="font-semibold text-lg text-foreground">{orgName}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
                    Trial Active
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground">Club Member</p>
              </div>
              <Avatar className="h-8 w-8 border border-border/50">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {user?.email ? getInitials(user.email) : 'U'}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
