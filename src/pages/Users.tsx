
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { UserPlus, Mail } from 'lucide-react';
import type { AppRole } from '@/hooks/useUserRole';

interface UserWithRole {
  id: string;
  user_id: string; // Add this property
  email: string;
  full_name?: string;
  location_id?: string;
  created_at: string;
  roles: AppRole[];
}

export default function Users() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const usersWithRoles = profiles.map(profile => ({
        ...profile,
        roles: userRoles
          .filter(ur => ur.user_id === profile.user_id)
          .map(ur => ur.role as AppRole)
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error loading users",
        description: "Failed to load user data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    try {
      // Use Supabase auth to invite user
      const { error } = await supabase.auth.admin.inviteUserByEmail(inviteEmail, {
        redirectTo: `${window.location.origin}/dashboard`
      });

      if (error) throw error;

      // Log the admin action
      await supabase.from('admin_action_logs').insert({
        actor_user_id: user!.id,
        action: 'invite_user',
        details: { email: inviteEmail }
      });

      toast({
        title: "User invited",
        description: `Invitation sent to ${inviteEmail}`,
      });

      setInviteEmail('');
      // Refresh users list after a short delay
      setTimeout(fetchUsers, 1000);
    } catch (error: any) {
      toast({
        title: "Invitation failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: AppRole, currentRoles: AppRole[]) => {
    try {
      if (currentRoles.includes(newRole)) return;

      // Add the new role
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: newRole });

      if (error) throw error;

      // Log the admin action
      await supabase.from('admin_action_logs').insert({
        actor_user_id: user!.id,
        action: 'promote_user',
        target_user_id: userId,
        details: { to_role: newRole }
      });

      toast({
        title: "Role updated",
        description: `User promoted to ${newRole}`,
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Role update failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleRemoveRole = async (userId: string, role: AppRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      // Log the admin action
      await supabase.from('admin_action_logs').insert({
        actor_user_id: user!.id,
        action: 'demote_user',
        target_user_id: userId,
        details: { from_role: role }
      });

      toast({
        title: "Role removed",
        description: `${role} role removed from user`,
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Role removal failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          Manage user roles and permissions.
        </p>
      </div>

      {/* Invite User Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite New User
          </CardTitle>
          <CardDescription>
            Send a magic link invitation to a new user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInviteUser} className="flex gap-4">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={inviting}
              />
            </div>
            <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
              <Mail className="h-4 w-4 mr-2" />
              {inviting ? 'Sending...' : 'Send Invitation'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({users.length})</CardTitle>
          <CardDescription>
            Manage existing users and their roles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Current Roles</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((userData) => (
                <TableRow key={userData.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{userData.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{userData.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {userData.roles.length > 0 ? userData.roles.map(role => (
                        <Badge 
                          key={role} 
                          variant={role === 'admin' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {role}
                          {role !== 'viewer' && (
                            <button
                              onClick={() => handleRemoveRole(userData.user_id, role)}
                              className="ml-1 text-xs opacity-70 hover:opacity-100"
                            >
                              ×
                            </button>
                          )}
                        </Badge>
                      )) : (
                        <Badge variant="outline">No roles</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select 
                      onValueChange={(role: AppRole) => 
                        handleRoleChange(userData.user_id, role, userData.roles)
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Add role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="location_admin">Location Admin</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(userData.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
