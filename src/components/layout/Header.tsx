
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Menu, Settings } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMenuClick?: () => void;
}

// Get first name from email
const getFirstName = (email: string) => {
  const localPart = email.split('@')[0];
  const name = localPart.replace(/[0-9._-]/g, ' ').split(' ')[0];
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
};

export function Header({ onMenuClick }: HeaderProps) {
  const { profile, signOut } = useAuth();
  const { highestRole, loading } = useUserRole();
  const navigate = useNavigate();

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const firstName = profile?.email ? getFirstName(profile.email) : '';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-card/80 backdrop-blur-xl border-b border-border/30">
      <div className="px-8 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Mobile menu */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onMenuClick}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="hidden lg:block" />
          </div>

          {/* Right: Theme toggle + Avatar dropdown */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 h-9 rounded-full px-2 hover:bg-muted/50">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary font-medium">
                      {profile?.email ? getInitials(profile.email) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm text-foreground">{profile?.email}</span>
                  {!loading && (
                    <Badge variant="secondary" className="text-[10px] font-medium uppercase tracking-wide px-1.5 py-0">
                      {highestRole()}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-purple-500/20 text-primary font-medium">
                        {profile?.email ? getInitials(profile.email) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{firstName || profile?.full_name || 'User'}</p>
                      <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => navigate('/admin/setup')} 
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
  );
}
