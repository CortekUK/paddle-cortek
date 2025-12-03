
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUserRole } from '@/hooks/useUserRole';
import {
  LayoutDashboard,
  Send,
  Settings,
  FileText,
  Users,
  CreditCard,
  TestTube
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
      <div className="w-64 bg-card border-r border-border p-4">
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
    <div className="w-64 bg-card border-r border-border">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">CORTEK Admin</h2>
            <p className="text-sm text-muted-foreground">Admin Console</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t">
          <Link
            to="/dashboard"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            ← Back to Site
          </Link>
        </div>
      </div>
      
      <nav className="px-4 pb-4">
        <ul className="space-y-2">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <li key={item.href}>
                <Link
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
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
    </div>
  );
}
