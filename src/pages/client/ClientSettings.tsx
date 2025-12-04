import { useState, useEffect } from 'react';
import { useOrganizationAuth } from '@/hooks/useOrganizationAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Copy, Save, AlertTriangle, Info, MessageSquare, Building2 } from 'lucide-react';

const cardClass = "bg-white/70 dark:bg-card/70 backdrop-blur-sm rounded-2xl shadow-lg border border-border/60 dark:border-white/[0.12] overflow-hidden";

export default function ClientSettings() {
  const { organization, membership, updateClubName, canManageOrg } = useOrganizationAuth();
  const { toast } = useToast();
  
  const [loading, setSaving] = useState(false);
  const [clubNameLoading, setClubNameLoading] = useState(false);
  const [editableClubName, setEditableClubName] = useState('');
  const [waGroups, setWaGroups] = useState({
    availability: '',
    matches: '',
    competitions: ''
  });
  const [initialGroups, setInitialGroups] = useState({
    availability: '',
    matches: '',
    competitions: ''
  });

  useEffect(() => {
    loadSettings();
    setEditableClubName(organization?.club_name || organization?.name || '');
  }, [organization]);

  const loadSettings = async () => {
    if (!organization?.id) return;

    try {
      const { data: settings } = await supabase
        .from('org_automation_settings')
        .select('wa_group_availability, wa_group_matches, wa_group_competitions')
        .eq('org_id', organization.id)
        .maybeSingle();

      if (settings) {
        const groups = {
          availability: settings.wa_group_availability || '',
          matches: settings.wa_group_matches || '',
          competitions: settings.wa_group_competitions || ''
        };
        setWaGroups(groups);
        setInitialGroups(groups);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSave = async () => {
    if (!organization?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('org_automation_settings')
        .upsert({
          org_id: organization.id,
          wa_group_availability: waGroups.availability,
          wa_group_matches: waGroups.matches,
          wa_group_competitions: waGroups.competitions,
          wa_confirmed: true,
          updated_by: membership?.user_id
        }, {
          onConflict: 'org_id'
        });

      if (error) throw error;

      setInitialGroups({ ...waGroups });
      toast({
        title: 'Settings saved',
        description: 'WhatsApp group names have been updated successfully.'
      });
    } catch (error: any) {
      toast({
        title: 'Failed to save settings',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyToAll = (sourceValue: string) => {
    setWaGroups({
      availability: sourceValue,
      matches: sourceValue,
      competitions: sourceValue
    });
  };

  const hasChanges = JSON.stringify(waGroups) !== JSON.stringify(initialGroups);
  const hasClubNameChanges = editableClubName !== (organization?.club_name || organization?.name || '');

  const handleClubNameSave = async () => {
    if (!editableClubName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Club name cannot be empty',
        variant: 'destructive'
      });
      return;
    }

    setClubNameLoading(true);
    try {
      await updateClubName(editableClubName.trim());
    } catch (error) {
      // Error handled in updateClubName
    } finally {
      setClubNameLoading(false);
    }
  };

  const handleCancelTrial = async () => {
    if (!organization?.id) return;
    
    if (!confirm('Are you sure you want to cancel your trial? This action cannot be undone.')) {
      return;
    }

    try {
      // Update billing status to cancelled
      const { error } = await supabase
        .from('billing_stub')
        .update({ status: 'canceled' })
        .eq('organization_id', organization.id);

      if (error) throw error;

      toast({
        title: 'Trial cancelled',
        description: 'Your trial has been cancelled. You will retain access until the trial period ends.'
      });
    } catch (error: any) {
      toast({
        title: 'Failed to cancel trial',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="relative space-y-8">
      {/* Page Header Banner */}
      <div className="relative -mx-8 -mt-8 px-8 py-10 mb-4 bg-gradient-to-r from-primary/20 via-purple-500/15 to-primary/10 dark:from-primary/15 dark:via-purple-500/10 dark:to-primary/8 border-b border-primary/15">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/50" />
        <div className="relative text-left">
          <h1 className="text-3xl font-bold text-foreground tracking-tight text-left">Settings</h1>
          <p className="text-muted-foreground mt-1.5 text-left">
            Configure your automation settings and preferences
          </p>
        </div>
      </div>

      {/* WhatsApp Group Names */}
      <Card className={cardClass}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
              <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
            </div>
            <CardTitle>WhatsApp Group Names</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="bg-muted/50 border-border/60">
            <Info className="h-4 w-4 text-muted-foreground" />
            <AlertDescription className="text-muted-foreground">
              Please add <strong className="text-foreground">07757 658667</strong> to each WhatsApp group. Messages can't be sent until the bot is added to each group.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="availability">Court Availability Group</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyToAll(waGroups.availability)}
                  disabled={!waGroups.availability}
                  className="gap-2"
                >
                  <Copy className="h-3 w-3" />
                  Copy to all
                </Button>
              </div>
              <Input
                id="availability"
                value={waGroups.availability}
                onChange={(e) => setWaGroups(prev => ({ ...prev, availability: e.target.value }))}
                placeholder="e.g., Court Availability Updates"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="matches">Partial Matches Group</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyToAll(waGroups.matches)}
                  disabled={!waGroups.matches}
                  className="gap-2"
                >
                  <Copy className="h-3 w-3" />
                  Copy to all
                </Button>
              </div>
              <Input
                id="matches"
                value={waGroups.matches}
                onChange={(e) => setWaGroups(prev => ({ ...prev, matches: e.target.value }))}
                placeholder="e.g., Find Players"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="competitions">Competitions & Academies Group</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyToAll(waGroups.competitions)}
                  disabled={!waGroups.competitions}
                  className="gap-2"
                >
                  <Copy className="h-3 w-3" />
                  Copy to all
                </Button>
              </div>
              <Input
                id="competitions"
                value={waGroups.competitions}
                onChange={(e) => setWaGroups(prev => ({ ...prev, competitions: e.target.value }))}
                placeholder="e.g., Tournaments & Training"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSave} 
              disabled={loading || !hasChanges}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
            {hasChanges && (
              <Button 
                variant="outline" 
                onClick={() => setWaGroups({ ...initialGroups })}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Club Information */}
      <Card className={cardClass}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
              <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
            </div>
            <CardTitle>Club Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clubName">Club Name</Label>
            <div className="flex gap-2">
              <Input
                id="clubName"
                value={editableClubName}
                onChange={(e) => setEditableClubName(e.target.value)}
                placeholder="Enter your club name"
                disabled={!canManageOrg()}
              />
              <Button
                onClick={handleClubNameSave}
                disabled={clubNameLoading || !hasClubNameChanges || !canManageOrg()}
                className="gap-2 shrink-0"
              >
                <Save className="h-4 w-4" />
                {clubNameLoading ? 'Saving...' : 'Save'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Used in message templates as {`{{club_name}}`}
              {!canManageOrg() && ' • Only owners and managers can edit'}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Playtomic Club URL</Label>
            <Input 
              value={organization?.playtomic_club_url || ''} 
              readOnly 
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Contact support to change your club URL
            </p>
          </div>
          
          <div className="space-y-2">
            <Label>Tenant ID</Label>
            <Input 
              value={organization?.tenant_id || ''} 
              readOnly 
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Internal identifier for your club on Playtomic
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Trial Management */}
      <Card className={`${cardClass} border-destructive/20`}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" strokeWidth={1.5} />
            </div>
            <CardTitle>Trial Management</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Cancelling your trial will stop all automation services immediately. This action cannot be undone.
            </AlertDescription>
          </Alert>
          
          <Button 
            variant="destructive" 
            onClick={handleCancelTrial}
            className="gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            Cancel Trial
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
