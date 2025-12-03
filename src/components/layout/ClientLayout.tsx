import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Flag, 
  Settings,
  Menu,
  X,
  LogOut,
  Image,
  ChevronLeft,
  ChevronRight
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
  const name = localPart.replace(/[0-9._-]/g, ' ').split(' ')[0];
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

export function ClientLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
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

  const trialDaysRemaining = 12;
  const trialTotalDays = 14;
  const trialProgress = ((trialTotalDays - trialDaysRemaining) / trialTotalDays) * 100;

  return (
    <TooltipProvider delayDuration={0}>
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
          "fixed top-0 left-0 z-50 h-screen bg-white/80 dark:bg-card/80 backdrop-blur-xl border-r border-border/30 shadow-sm transition-all duration-200 ease-in-out",
          "lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "w-16" : "w-64"
        )}>
          <div className="flex flex-col h-full">
            {/* Sidebar header with logo */}
            <div className={cn(
              "flex items-center border-b border-border/30 p-4",
              collapsed ? "justify-center" : "justify-between"
            )}>
              <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
                <img src={cortekLogoMark} alt="CORTEK" className="h-7 w-7 flex-shrink-0" />
                {!collapsed && (
                  <div className="animate-fade-in">
                    <h2 className="font-semibold text-foreground tracking-tight">CORTEK</h2>
                    <p className="text-xs text-muted-foreground">Automation Platform</p>
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden flex-shrink-0"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-2">
              <ul className="space-y-1">
                {sidebarItems.map((item) => {
                  const isActive = location.pathname === item.href;
                  const navButton = (
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3 py-2.5 rounded-lg transition-all duration-150 border-l-2",
                        collapsed ? "px-0 justify-center" : "px-3",
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
                          "h-4 w-4 flex-shrink-0",
                          isActive ? "text-foreground" : "text-muted-foreground"
                        )} 
                        strokeWidth={1.5} 
                      />
                      {!collapsed && <span className="truncate">{item.title}</span>}
                    </Button>
                  );

                  return (
                    <li key={item.href}>
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {navButton}
                          </TooltipTrigger>
                          <TooltipContent side="right" className="font-medium">
                            {item.title}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        navButton
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Collapse toggle - desktop only */}
            <div className="hidden lg:block px-2 py-2 border-t border-border/30">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "w-full justify-center text-muted-foreground hover:text-foreground",
                  collapsed ? "px-0" : "px-3"
                )}
                onClick={() => setCollapsed(!collapsed)}
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                ) : (
                  <>
                    <ChevronLeft className="h-4 w-4 mr-2" strokeWidth={1.5} />
                    <span className="text-xs">Collapse</span>
                  </>
                )}
              </Button>
            </div>

            {/* Sidebar footer */}
            <div className={cn("p-2 border-t border-border/30", collapsed && "px-1")}>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center py-2">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="font-medium">Trial Active</p>
                    <p className="text-xs text-muted-foreground">{trialDaysRemaining} days remaining</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div className="px-3 py-3 rounded-lg bg-muted/40 dark:bg-muted/30 border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">Trial Active</p>
                    <p className="text-xs font-medium text-foreground">{trialDaysRemaining} days left</p>
                  </div>
                  <Progress value={trialProgress} className="h-1.5" />
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className={cn(
          "relative transition-all duration-200",
          collapsed ? "lg:ml-16" : "lg:ml-64"
        )}>
          {/* Top header - glassmorphism */}
          <header className="sticky top-0 z-30 bg-white/80 dark:bg-card/80 backdrop-blur-xl border-b border-border/30 shadow-sm">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                {/* Left: Mobile menu + Org info with left border accent */}
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setSidebarOpen(true)}
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                  <div className="border-l-2 border-primary/30 pl-4">
                    <h1 className="font-bold text-xl text-foreground tracking-tight">{orgName}</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {greeting}, <span className="font-medium text-foreground">{firstName}</span>
                    </p>
                  </div>
                </div>

                {/* Right: Theme toggle + separator + User dropdown */}
                <div className="flex items-center gap-4">
                  <ThemeToggle />
                  
                  {/* Subtle separator */}
                  <div className="h-6 w-px bg-border/50 hidden md:block" />
                  
                  {/* User dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        className="flex items-center gap-3 px-2 py-1.5 h-auto hover:bg-muted/50 rounded-xl"
                      >
                        <div className="hidden md:block text-right">
                          <p className="text-sm font-medium text-foreground">{user?.email}</p>
                          <p className="text-xs text-muted-foreground">Club Member</p>
                        </div>
                        <Avatar className="h-9 w-9 border-2 border-primary/20">
                          <AvatarFallback className="text-sm bg-gradient-to-br from-primary/30 to-purple-500/30 text-primary font-semibold">
                            {user?.email ? getInitials(user.email) : 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-xl">
                      <DropdownMenuLabel>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-gradient-to-br from-primary/30 to-purple-500/30 text-primary font-semibold">
                              {user?.email ? getInitials(user.email) : 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">{firstName}</p>
                            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                          </div>
                        </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => navigate('/client/settings')} 
                        className="cursor-pointer rounded-lg"
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={handleSignOut} 
                        className="cursor-pointer rounded-lg text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
    </TooltipProvider>
  );
}
