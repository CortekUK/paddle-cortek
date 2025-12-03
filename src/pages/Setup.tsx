
import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const timezones = [
  'Europe/London',
  'Europe/Paris', 
  'Europe/Madrid',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Tokyo'
];

interface Location {
  id: string;
  name: string;
  timezone: string;
}

export default function Setup() {
  const { profile, updateProfile } = useAuth();
  const { canManageLocation, loading: roleLoading } = useUserRole();
  const [location, setLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    timezone: 'Europe/London'
  });
  const [loading, setLoading] = useState(false);
  const [fetchingLocation, setFetchingLocation] = useState(true);

  // Redirect if user can't manage locations
  if (!roleLoading && !canManageLocation()) {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    const fetchLocation = async () => {
      if (!profile?.location_id) {
        setFetchingLocation(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('locations')
          .select('id, name, timezone')
          .eq('id', profile.location_id)
          .single();
        
        if (error) throw error;
        
        setLocation(data);
        setFormData({
          name: data.name,
          timezone: data.timezone
        });
      } catch (error) {
        console.error('Error fetching location:', error);
      } finally {
        setFetchingLocation(false);
      }
    };

    if (!roleLoading) {
      fetchLocation();
    }
  }, [profile?.location_id, roleLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);

    try {
      if (location) {
        // Update existing location
        const { error } = await supabase
          .from('locations')
          .update({
            name: formData.name.trim(),
            timezone: formData.timezone
          })
          .eq('id', location.id);

        if (error) throw error;
      } else {
        // Create new location - only emulator_url and default_group_ids will use DB defaults
        const { data, error } = await supabase
          .from('locations')
          .insert({
            name: formData.name.trim(),
            timezone: formData.timezone
          })
          .select()
          .single();

        if (error) throw error;

        // Update user profile with location_id
        await updateProfile({ location_id: data.id });
        setLocation(data);
      }

      toast({
        title: "Location saved",
        description: "Your location settings have been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (roleLoading || fetchingLocation) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Location Setup</h1>
        <p className="text-muted-foreground">
          Configure your paddle club location details.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{location ? 'Update Location' : 'Create Location'}</CardTitle>
          <CardDescription>
            Set up your paddle club details. Advanced settings like emulator URL are configured automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Club Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Pure Padel Manchester"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select 
                value={formData.timezone} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="submit" 
              disabled={loading || !formData.name.trim()}
              variant="hero"
              className="w-full"
            >
              {loading ? 'Saving...' : (location ? 'Update Location' : 'Create Location')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
