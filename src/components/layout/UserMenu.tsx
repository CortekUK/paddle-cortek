import { LogOut, User, Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useTheme } from 'next-themes';

export function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { setTheme, theme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <User className="h-4 w-4" />
          <span className="hidden md:inline">{user.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl">
        <DropdownMenuLabel>
          <div>
            <p className="text-sm font-medium">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2 rounded-lg cursor-pointer">
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 ml-0" />
            <span className="ml-4">Theme</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="rounded-xl">
            <DropdownMenuItem 
              onClick={() => setTheme("light")} 
              className="gap-2 rounded-lg cursor-pointer"
            >
              <Sun className="h-4 w-4" />
              Light
              {theme === 'light' && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setTheme("dark")} 
              className="gap-2 rounded-lg cursor-pointer"
            >
              <Moon className="h-4 w-4" />
              Dark
              {theme === 'dark' && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setTheme("system")} 
              className="gap-2 rounded-lg cursor-pointer"
            >
              <Monitor className="h-4 w-4" />
              System
              {theme === 'system' && <span className="ml-auto text-primary">✓</span>}
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-destructive rounded-lg cursor-pointer">
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
