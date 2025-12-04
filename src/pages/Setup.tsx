
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
import { Settings } from 'lucide-react';

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

const cardClass = "bg-white/70 dark:bg-card/70 backdrop-blur-sm rounded-2xl shadow-lg border border-border/60 dark:border-white/[0.12] overflow-hidden";

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
    <div className="space-y-6">
      {/* Gradient Header Banner */}
      <div className="relative -mx-8 -mt-8 px-8 py-10 bg-gradient-to-r from-primary/20 via-purple-500/15 to-primary/10 dark:from-primary/15 dark:via-purple-500/10 dark:to-primary/8 border-b border-primary/15">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/50" />
        <div className="relative text-left">
          <h1 className="text-3xl font-bold">Location Setup</h1>
          <p className="text-muted-foreground mt-1">
            Configure your paddle club location details.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="max-w-2xl">
        <Card className={cardClass}>
          <CardHeader className="text-left">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
                <Settings className="h-5 w-5 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                <CardTitle>{location ? 'Update Location' : 'Create Location'}</CardTitle>
                <CardDescription>
                  Set up your paddle club details. Advanced settings like emulator URL are configured automatically.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6 text-left">
              <div className="space-y-2">
                <Label htmlFor="name">Club Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Pure Padel Manchester"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  disabled={loading}
                  className="h-11 rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select 
                  value={formData.timezone} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}
                  disabled={loading}
                >
                  <SelectTrigger className="h-11 rounded-lg">
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
                className="w-full rounded-xl"
              >
                {loading ? 'Saving...' : (location ? 'Update Location' : 'Create Location')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
