import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import cortekLogo from '@/assets/cortek-logo-mark.svg';
import {
  LayoutDashboard,
  Send,
  Settings,
  FileText,
  Users,
  CreditCard,
  TestTube,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import type { LucideIcon } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  requiresRole?: 'admin' | 'location_admin';
}

const navItems: NavItem[] = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: LayoutDashboard
  },
  {
    href: '/admin/send-message',
    label: 'Send Message',
    icon: Send
  },
  {
    href: '/admin/playtomic-api',
    label: 'Playtomic API',
    icon: TestTube,
    requiresRole: 'admin'
  },
  {
    href: '/admin/logs',
    label: 'Logs',
    icon: FileText
  },
  {
    href: '/admin/setup',
    label: 'Setup',
    icon: Settings,
    requiresRole: 'location_admin'
  },
  {
    href: '/admin/users',
    label: 'Users',
    icon: Users,
    requiresRole: 'admin'
  },
  {
    href: '/admin/emulator-test',
    label: 'Emulator Test',
    icon: TestTube,
    requiresRole: 'admin'
  },
  {
    href: '/admin/billing',
    label: 'Billing',
    icon: CreditCard,
    requiresRole: 'admin'
  }
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed, sidebarOpen, setSidebarOpen }: SidebarProps) {
  const location = useLocation();
  const { hasRole, canManageLocation, loading } = useUserRole();

  if (loading) {
    return (
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-screen bg-card border-r border-border shadow-sm transition-all duration-200",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        collapsed ? "w-16" : "w-64"
      )}>
        <div className="p-4 space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />
          ))}
        </div>
      </aside>
    );
  }

  const visibleItems = navItems.filter(item => {
    if (!item.requiresRole) return true;
    if (item.requiresRole === 'admin') return hasRole('admin');
    if (item.requiresRole === 'location_admin') return canManageLocation();
    return false;
  });

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-screen bg-card border-r border-border shadow-sm flex flex-col transition-all duration-200",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        collapsed ? "w-16" : "w-64"
      )}>
        {/* Header */}
        <div className={cn(
          "flex items-center border-b border-border p-4",
          collapsed ? "justify-center" : "justify-between"
        )}>
          <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
            <img src={cortekLogo} alt="CORTEK" className="h-7 w-7 flex-shrink-0" />
            {!collapsed && (
              <div className="animate-fade-in">
                <h2 className="font-semibold text-foreground tracking-tight">CORTEK</h2>
                <p className="text-xs text-muted-foreground">Admin Console</p>
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
        <nav className="flex-1 px-2 py-4">
          <ul className="space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              const navLink = (
                <Link
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 py-2.5 rounded-lg text-sm transition-colors border-l-2',
                    collapsed ? "px-0 justify-center" : "px-3",
                    isActive
                      ? 'bg-muted/60 dark:bg-muted/40 text-foreground font-medium border-l-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border-l-transparent'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );

              return (
                <li key={item.href}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {navLink}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="font-medium">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    navLink
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Collapse toggle - desktop only */}
        <div className="hidden lg:block px-2 py-2 border-t border-border">
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

      </aside>
    </TooltipProvider>
  );
}
