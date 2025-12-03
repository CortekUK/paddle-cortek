import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationAuth } from '@/hooks/useOrganizationAuth';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Pause, Play, Copy, Trash2, Bug, PlayCircle, Info } from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

interface Schedule {
  id: string;
  name: string;
  status: string;
  time_utc: string;
  frequency: string;
  target: string;
  template_id: string;
  whatsapp_group: string;
  last_run_at?: string;
  next_run_at?: string;
  message_templates?: {
    name: string;
  };
  template?: {
    name: string;
  };
}

interface Template {
  id: string;
  name: string;
}

interface ScheduleManagementProps {
  templates: Template[];
  defaultGroup?: string;
}

interface DebugInfo {
  serverNow: string;
  isDue: boolean;
  lastLogs: any[];
}

export default function ScheduleManagement({ templates, defaultGroup }: ScheduleManagementProps) {
  const { organization, profile, canManageOrg } = useOrganizationAuth();
  const { toast } = useToast();
  
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [clubTimezone, setClubTimezone] = useState<string>('Europe/London');
  const [debugInfo, setDebugInfo] = useState<Record<string, DebugInfo>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    time: '09:00',
    target: 'TODAY' as 'TODAY' | 'TOMORROW',
    template_id: '',
    whatsapp_group: defaultGroup || ''
  });

  useEffect(() => {
    loadSchedules();
    fetchClubTimezone();
    checkIsAdmin();
  }, [organization?.id]);

  useEffect(() => {
    if (defaultGroup && !formData.whatsapp_group) {
      setFormData(prev => ({ ...prev, whatsapp_group: defaultGroup }));
    }
  }, [defaultGroup]);

  const checkIsAdmin = async () => {
    if (!profile?.user_id) return;
    
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', profile.user_id)
        .eq('role', 'admin')
        .maybeSingle();
      
      setIsAdmin(!!data);
    } catch (err) {
      console.error('Error checking admin status:', err);
    }
  };

  const fetchClubTimezone = async () => {
    // Use default timezone for now - can be enhanced later to fetch from organization settings
    setClubTimezone('Europe/London');
  };

  const loadSchedules = async () => {
    if (!organization?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('scheduled_sends')
        .select(`
          *,
          message_templates!inner(name)
        `)
        .eq('org_id', organization.id)
        .eq('category', 'AVAILABILITY')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedSchedules = (data || []).map(schedule => ({
        ...schedule,
        template: schedule.message_templates
      }));
      
      setSchedules(formattedSchedules);
      await loadDebugInfo(formattedSchedules);
    } catch (err) {
      console.error('Error loading schedules:', err);
      toast({
        title: "Error",
        description: "Failed to load scheduled sends",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDebugInfo = async (scheduleList: Schedule[]) => {
    try {
      const serverNow = new Date().toISOString();
      
      const debugData: Record<string, DebugInfo> = {};
      
      for (const schedule of scheduleList) {
        const isDue = schedule.next_run_at ? new Date(schedule.next_run_at) <= new Date(serverNow) : false;
        
        // Get last logs for this schedule
        const { data: logs } = await supabase
          .from('send_logs_v2')
          .select('*')
          .eq('schedule_id', schedule.id)
          .order('sent_at', { ascending: false })
          .limit(3);
        
        debugData[schedule.id] = {
          serverNow,
          isDue,
          lastLogs: logs || []
        };
      }
      
      setDebugInfo(debugData);
    } catch (err) {
      console.error('Error loading debug info:', err);
    }
  };

  const handleSave = async () => {
    if (!organization?.id || !formData.name || !formData.template_id || !formData.whatsapp_group) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      // Convert time from club timezone to UTC
      const [hours, minutes] = formData.time.split(':').map(Number);
      
      // Create a date in the club timezone for today
      const todayInClubTz = new Date();
      const targetTimeInClubTz = new Date(todayInClubTz);
      targetTimeInClubTz.setHours(hours, minutes, 0, 0);
      
      // Convert to UTC for storage
      const targetTimeUtc = fromZonedTime(targetTimeInClubTz, clubTimezone);
      const timeUtcString = format(targetTimeUtc, 'HH:mm');
      
      // Calculate next run time
      let nextRun = new Date(targetTimeUtc);
      const now = new Date();
      
      // If the time has passed today, schedule for tomorrow
      if (nextRun <= now) {
        const tomorrowInClubTz = new Date(targetTimeInClubTz);
        tomorrowInClubTz.setDate(tomorrowInClubTz.getDate() + 1);
        nextRun = fromZonedTime(tomorrowInClubTz, clubTimezone);
      }

      const scheduleData = {
        org_id: organization.id,
        category: 'AVAILABILITY',
        name: formData.name,
        time_utc: timeUtcString,
        target: formData.target,
        template_id: formData.template_id,
        whatsapp_group: formData.whatsapp_group,
        next_run_at: nextRun.toISOString()
      };

      if (editingSchedule) {
        const { error } = await supabase
          .from('scheduled_sends')
          .update(scheduleData)
          .eq('id', editingSchedule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('scheduled_sends')
          .insert(scheduleData);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Schedule ${editingSchedule ? 'updated' : 'created'} successfully`
      });

      setModalOpen(false);
      resetForm();
      loadSchedules();
    } catch (err: any) {
      console.error('Error saving schedule:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to save schedule",
        variant: "destructive"
      });
    }
  };

  const handleRunNowTest = async () => {
    if (!isAdmin) return;
    
    try {
      const { error } = await supabase.functions.invoke('run-availability-schedules');
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Schedule runner triggered successfully"
      });
      
      setTimeout(loadSchedules, 2000); // Reload after 2 seconds
    } catch (err: any) {
      console.error('Error running schedule test:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to trigger schedule runner",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    
    // Convert UTC time back to club timezone for display
    const [hours, minutes] = schedule.time_utc.split(':').map(Number);
    const utcTime = new Date();
    utcTime.setUTCHours(hours, minutes, 0, 0);
    const clubTime = toZonedTime(utcTime, clubTimezone);
    const clubTimeString = format(clubTime, 'HH:mm');
    
    setFormData({
      name: schedule.name,
      time: clubTimeString,
      target: (schedule.target as 'TODAY' | 'TOMORROW'),
      template_id: schedule.template_id,
      whatsapp_group: schedule.whatsapp_group
    });
    setModalOpen(true);
  };

  const handleToggleStatus = async (schedule: Schedule) => {
    try {
      const newStatus = schedule.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      const { error } = await supabase
        .from('scheduled_sends')
        .update({ status: newStatus })
        .eq('id', schedule.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Schedule ${newStatus.toLowerCase()}`
      });
      
      loadSchedules();
    } catch (err: any) {
      console.error('Error updating schedule status:', err);
      toast({
        title: "Error",
        description: "Failed to update schedule status",
        variant: "destructive"
      });
    }
  };

  const handleDuplicate = async (schedule: Schedule) => {
    setEditingSchedule(null);
    
    // Convert UTC time back to club timezone for display
    const [hours, minutes] = schedule.time_utc.split(':').map(Number);
    const utcTime = new Date();
    utcTime.setUTCHours(hours, minutes, 0, 0);
    const clubTime = toZonedTime(utcTime, clubTimezone);
    const clubTimeString = format(clubTime, 'HH:mm');
    
    setFormData({
      name: `${schedule.name} (Copy)`,
      time: clubTimeString,
      target: (schedule.target as 'TODAY' | 'TOMORROW'),
      template_id: schedule.template_id,
      whatsapp_group: schedule.whatsapp_group
    });
    setModalOpen(true);
  };

  const handleDelete = async (schedule: Schedule) => {
    if (!confirm('Are you sure you want to delete this scheduled send?')) return;

    try {
      const { error } = await supabase
        .from('scheduled_sends')
        .delete()
        .eq('id', schedule.id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Schedule deleted successfully"
      });
      
      loadSchedules();
    } catch (err: any) {
      console.error('Error deleting schedule:', err);
      toast({
        title: "Error",
        description: "Failed to delete schedule",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setEditingSchedule(null);
    setFormData({
      name: '',
      time: '09:00',
      target: 'TODAY',
      template_id: '',
      whatsapp_group: defaultGroup || ''
    });
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === 'ACTIVE' ? 'default' : 'secondary'}>
        {status}
      </Badge>
    );
  };

  const formatTimeInClubTz = (utcTimeString: string) => {
    try {
      const [hours, minutes] = utcTimeString.split(':').map(Number);
      const utcTime = new Date();
      utcTime.setUTCHours(hours, minutes, 0, 0);
      const clubTime = toZonedTime(utcTime, clubTimezone);
      return format(clubTime, 'HH:mm');
    } catch {
      return utcTimeString;
    }
  };

  const formatNextRunInClubTz = (nextRunUtc?: string) => {
    if (!nextRunUtc) return '-';
    try {
      return formatInTimeZone(new Date(nextRunUtc), clubTimezone, 'MMM d, HH:mm');
    } catch {
      return format(new Date(nextRunUtc), 'MMM d, HH:mm');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Scheduled Sends</CardTitle>
          <div className="flex gap-2">
            {isAdmin && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRunNowTest}
                className="gap-2"
              >
                <PlayCircle className="h-4 w-4" />
                Run Now (Test)
              </Button>
            )}
            <Dialog open={modalOpen} onOpenChange={(open) => {
              setModalOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Schedule
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingSchedule ? 'Edit Schedule' : 'New Schedule'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Daily availability update"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">Send at (Club Timezone: {clubTimezone})</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Target Date</Label>
                    <Select 
                      value={formData.target}
                      onValueChange={(value: 'TODAY' | 'TOMORROW') => 
                        setFormData(prev => ({ ...prev, target: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODAY">Today</SelectItem>
                        <SelectItem value="TOMORROW">Tomorrow</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>WhatsApp Group</Label>
                    <Input
                      value={formData.whatsapp_group}
                      onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_group: e.target.value }))}
                      placeholder="Group name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Template</Label>
                    <Select
                      value={formData.template_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, template_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSave} className="flex-1">
                      {editingSchedule ? 'Update' : 'Create'}
                    </Button>
                    <Button variant="outline" onClick={() => setModalOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Loading schedules...</div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No scheduled sends yet. Create your first automated schedule.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Time (Club TZ)</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Next Run (Club TZ)</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell className="font-medium">{schedule.name}</TableCell>
                  <TableCell>{formatTimeInClubTz(schedule.time_utc)}</TableCell>
                  <TableCell>{schedule.target}</TableCell>
                  <TableCell>{schedule.whatsapp_group}</TableCell>
                  <TableCell>{schedule.template?.name || 'Unknown'}</TableCell>
                  <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                  <TableCell>{formatNextRunInClubTz(schedule.next_run_at)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleEdit(schedule)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleToggleStatus(schedule)}
                      >
                        {schedule.status === 'ACTIVE' ? (
                          <Pause className="h-3 w-3" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleDuplicate(schedule)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleDelete(schedule)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      {/* Debug Panel */}
                      {isAdmin && debugInfo[schedule.id] && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <Bug className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80" side="left">
                            <div className="space-y-2">
                              <h4 className="font-semibold flex items-center gap-1">
                                <Info className="h-4 w-4" />
                                Debug Info
                              </h4>
                              <div className="space-y-1 text-sm">
                                <div><strong>time_utc:</strong> {schedule.time_utc}</div>
                                <div><strong>next_run_at:</strong> {schedule.next_run_at}</div>
                                <div><strong>Server now:</strong> {debugInfo[schedule.id].serverNow}</div>
                                <div className="flex items-center gap-1">
                                  <strong>Due now:</strong> 
                                  <Badge variant={debugInfo[schedule.id].isDue ? 'destructive' : 'secondary'}>
                                    {debugInfo[schedule.id].isDue ? 'YES' : 'NO'}
                                  </Badge>
                                </div>
                                {debugInfo[schedule.id].lastLogs.length > 0 && (
                                  <div>
                                    <strong>Last logs:</strong>
                                    <div className="mt-1 space-y-1 text-xs">
                                      {debugInfo[schedule.id].lastLogs.slice(0, 2).map((log, i) => (
                                        <div key={i} className="p-1 bg-muted rounded">
                                          <div className="flex justify-between">
                                            <span className="font-mono">{log.status}</span>
                                            <span className="text-muted-foreground">
                                              {format(new Date(log.sent_at), 'MMM d, HH:mm')}
                                            </span>
                                          </div>
                                          {log.response_text && (
                                            <div className="text-muted-foreground">
                                              {log.response_text.substring(0, 50)}...
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}