import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Flag, 
  Settings,
  Menu,
  X,
  LogOut,
  Image
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationAuth } from '@/hooks/useOrganizationAuth';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import cortekLogoMark from '@/assets/cortek-logo-mark.svg';

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
    icon: Flag
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

// Get time-based greeting
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

// Get first name from email
const getFirstName = (email: string) => {
  const localPart = email.split('@')[0];
  // Try to extract a name (before any numbers or special chars)
  const name = localPart.replace(/[0-9._-]/g, ' ').split(' ')[0];
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

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
  const firstName = user?.email ? getFirstName(user.email) : '';
  const greeting = getGreeting();

  // Trial progress (12 days remaining out of 14)
  const trialDaysRemaining = 12;
  const trialTotalDays = 14;
  const trialProgress = ((trialTotalDays - trialDaysRemaining) / trialTotalDays) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F7F5FF] via-purple-50/30 to-white dark:from-background dark:via-purple-950/20 dark:to-background">
      {/* Floating gradient orbs */}
      <div className="fixed top-0 left-0 w-96 h-96 bg-primary/10 dark:bg-primary/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-96 h-96 bg-accent/10 dark:bg-accent/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 w-[500px] h-[500px] bg-gradient-to-br from-primary/5 to-accent/5 dark:from-primary/10 dark:to-accent/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      
      {/* Subtle vignette overlay */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.02)_100%)]" />
      
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40 lg:hidden backdrop-blur-sm" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-screen w-64 bg-white/80 dark:bg-card/80 backdrop-blur-xl border-r border-border/30 shadow-sm transition-transform duration-200 ease-in-out",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Sidebar header with logo */}
          <div className="flex items-center justify-between p-5 border-b border-border/30">
            <div className="flex items-center gap-3">
              <img src={cortekLogoMark} alt="CORTEK" className="h-7 w-7" />
              <div>
                <h2 className="font-semibold text-foreground tracking-tight">CORTEK</h2>
                <p className="text-xs text-muted-foreground">Automation Platform</p>
              </div>
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
                        "w-full justify-start gap-3 py-2.5 px-3 rounded-lg transition-all duration-150 border-l-2",
                        isActive 
                          ? "bg-muted/60 dark:bg-muted/40 text-foreground font-medium border-l-foreground" 
                          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground border-l-transparent"
                      )}
                      onClick={() => {
                        navigate(item.href);
                        setSidebarOpen(false);
                      }}
                    >
                      <item.icon 
                        className={cn(
                          "h-4 w-4",
                          isActive ? "text-foreground" : "text-muted-foreground"
                        )} 
                        strokeWidth={1.5} 
                      />
                      {item.title}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Sidebar footer */}
          <div className="p-4 border-t border-border/30">
            <div className="px-3 py-3 rounded-lg bg-muted/40 dark:bg-muted/30 border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">Trial Active</p>
                <p className="text-xs font-medium text-foreground">{trialDaysRemaining} days left</p>
              </div>
              <Progress value={trialProgress} className="h-1.5" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64 relative">
        {/* Top header - glassmorphism */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-card/80 backdrop-blur-xl border-b border-border/30 shadow-sm">
          <div className="px-6 py-4">
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
                  <h1 className="font-bold text-xl text-foreground tracking-tight">{orgName}</h1>
                  <p className="text-sm text-muted-foreground/80 mt-0.5">
                    {greeting}, <span className="font-medium text-foreground">{firstName}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <ThemeToggle />
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium text-foreground">{user?.email}</p>
                  <p className="text-xs text-muted-foreground/70">Club Member</p>
                </div>
                <Avatar className="h-10 w-10 border-2 border-primary/20 ring-2 ring-primary/5">
                  <AvatarFallback className="text-sm bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-semibold">
                    {user?.email ? getInitials(user.email) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  className="gap-2 text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
