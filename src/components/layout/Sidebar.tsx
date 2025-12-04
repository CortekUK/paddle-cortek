
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';
import cortekLogo from '@/assets/cortek-logo-mark.svg';
import {
  LayoutDashboard,
  Send,
  Settings,
  FileText,
  Users,
  CreditCard,
  TestTube,
  ArrowLeft
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
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

export function Sidebar() {
  const location = useLocation();
  const { hasRole, canManageLocation, loading } = useUserRole();

  if (loading) {
    return (
      <div className="w-64 bg-card border-r border-border shadow-sm p-4">
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  const visibleItems = navItems.filter(item => {
    if (!item.requiresRole) return true;
    if (item.requiresRole === 'admin') return hasRole('admin');
    if (item.requiresRole === 'location_admin') return canManageLocation();
    return false;
  });

  return (
    <div className="w-64 bg-card border-r border-border shadow-sm flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <img src={cortekLogo} alt="CORTEK" className="h-7 w-7" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">CORTEK</h2>
            <p className="text-xs text-muted-foreground">Admin Console</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm transition-colors border-l-2',
                    isActive
                      ? 'bg-muted/60 dark:bg-muted/40 text-foreground font-medium border-l-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border-l-transparent'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 py-2 px-3 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Client Portal
        </Link>
      </div>
    </div>
  );
}
