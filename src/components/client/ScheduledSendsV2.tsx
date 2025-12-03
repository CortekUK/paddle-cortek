import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit2, Pause, Play, Copy, Trash2, CheckCircle, AlertCircle, Send, Loader2, Eye, Clock, MoreHorizontal, Link2, ChevronDown, Info } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';

// Supabase URL and key for direct fetch calls
const SUPABASE_URL = "https://dygljrvbxvbrqrihrxyn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Z2xqcnZieHZicnFyaWhyeHluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxMjg1NjgsImV4cCI6MjA3MTcwNDU2OH0.yXxoz0eCIg5TS-RJfEYuspR9ApPjER4Ru2Ieeckxek0";
import { useOrganizationAuth } from '@/hooks/useOrganizationAuth';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DateTime } from 'luxon';
interface Schedule {
  id: string;
  name: string;
  time_local: string;
  tz: string;
  target: 'TODAY' | 'TOMORROW';
  whatsapp_group: string;
  template_id: string;
  status: 'ACTIVE' | 'PAUSED';
  next_run_at_utc: string;
  last_run_at_utc?: string;
  last_status?: string;
  last_error?: string;
  date_start_utc?: string;
  date_end_utc?: string;
  is_one_off?: boolean;
  run_at_utc?: string;
  summary_variant?: string;
  event_id?: string;
  message_templates?: {
    id: string;
    name: string;
  };
}
interface Template {
  id: string;
  name: string;
  content: string;
  module?: string;
  summary_variant?: string | null;
  linked_event_id?: string | null;
  whatsapp_group?: string | null;
}
interface ScheduledSendsV2Props {
  templates: Template[];
  defaultWhatsappGroup?: string;
  category: 'AVAILABILITY' | 'PARTIAL_MATCHES' | 'COMPETITIONS_ACADEMIES';
}
export const ScheduledSendsV2: React.FC<ScheduledSendsV2Props> = ({
  templates,
  defaultWhatsappGroup,
  category = 'AVAILABILITY'
}) => {
  const {
    organization,
    profile
  } = useOrganizationAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null);
  const [clubTimezone, setClubTimezone] = useState('Europe/London');

  // Fetch club timezone from organization
  useEffect(() => {
    const fetchClubTimezone = async () => {
      if (organization?.tenant_id) {
        try {
          const {
            data: location
          } = await supabase.from('locations').select('timezone').eq('tenant_id', organization.tenant_id).single();
          if (location?.timezone) {
            setClubTimezone(location.timezone);
          }
        } catch (error) {
          console.warn('Could not fetch club timezone, using default:', error);
          setClubTimezone('Europe/London');
        }
      }
    };
    fetchClubTimezone();
  }, [organization?.tenant_id]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    time_local: '09:00',
    // Default time, will be updated when timezone loads
    target: 'TODAY' as 'TODAY' | 'TOMORROW',
    whatsapp_group: defaultWhatsappGroup || '',
    template_id: '',
    enabled: true,
    // New optional fields
    summary_variant: '' as string | undefined,
    event_id: '' as string | undefined,
    is_one_off: false,
    run_at_date_local: '' as string | undefined,
    // Store raw datetime-local value
    date_start_utc: '' as string | undefined,
    date_end_utc: '' as string | undefined
  });

  // Test functionality state
  const [testGroupName, setTestGroupName] = useState('');
  const [testingMessage, setTestingMessage] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<{
    status: string;
    message: string;
  } | null>(null);

  // Run logs state
  const [runLogs, setRunLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Log details modal state
  const [logDetailsModalOpen, setLogDetailsModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  // Test section collapsible state
  const [testSectionOpen, setTestSectionOpen] = useState(true);
  useEffect(() => {
    if (organization?.id) {
      loadSchedules();
      loadRunLogs();
    }
  }, [organization?.id, category]); // Reload when category changes

  // Auto-refresh logs disabled per user request
  // useEffect(() => {
  //   if (!organization?.id) return;

  //   const interval = setInterval(() => {
  //     loadRunLogs();
  //     loadSchedules(); // Also refresh schedules to update next_run_at_utc
  //   }, 30000); // Every 30 seconds

  //   return () => clearInterval(interval);
  // }, [organization?.id, category]);

  // Auto-collapse test section after successful test
  useEffect(() => {
    if (lastTestResult?.status === 'success') {
      const timer = setTimeout(() => setTestSectionOpen(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastTestResult]);

  // Update form time when timezone is loaded and when creating new schedule
  useEffect(() => {
    if (clubTimezone && !editingSchedule) {
      const now = DateTime.now().setZone(clubTimezone);
      const currentTime = now.toFormat('HH:mm');
      setFormData(prev => ({
        ...prev,
        time_local: currentTime
      }));
    }
  }, [clubTimezone, editingSchedule]);
  const loadSchedules = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('scheduled_sends_v2').select(`
          *,
          message_templates (id, name)
        `).eq('org_id', organization!.id).eq('category', category) // Filter by category to show only relevant schedules
      .order('created_at', {
        ascending: false
      });
      if (error) throw error;

      // Ensure all fields are properly loaded
      const schedules = (data || []).map((schedule: any) => {
        const mappedSchedule = {
          ...schedule,
          date_start_utc: schedule.date_start_utc || undefined,
          date_end_utc: schedule.date_end_utc || undefined,
          is_one_off: schedule.is_one_off || false,
          run_at_utc: schedule.run_at_utc || undefined,
          summary_variant: schedule.summary_variant || undefined,
          event_id: schedule.event_id || undefined
        };

        // Debug: Log dates for schedules that should have them
        if (schedule.category === 'COMPETITIONS_ACADEMIES' && !schedule.is_one_off) {
          console.log(`Loaded schedule ${schedule.name}:`, {
            date_start_utc: mappedSchedule.date_start_utc,
            date_end_utc: mappedSchedule.date_end_utc,
            raw_date_start_utc: schedule.date_start_utc,
            raw_date_end_utc: schedule.date_end_utc
          });
        }
        return mappedSchedule;
      });
      setSchedules(schedules as Schedule[]);
    } catch (error) {
      console.error('Error loading schedules:', error);
      toast.error('Failed to load scheduled sends');
    } finally {
      setLoading(false);
    }
  };
  const loadRunLogs = async () => {
    if (!organization?.id) return;
    setLoadingLogs(true);
    try {
      console.log('Loading run logs with:', {
        org_id: organization.id,
        category,
        tenant_id: organization.tenant_id
      });
      const {
        data,
        error
      } = await supabase.from('send_logs_v2').select(`
          *,
          scheduled_sends_v2 (name)
        `).eq('org_id', organization.id).eq('category', category).not('schedule_id', 'is', null).order('sent_at', {
        ascending: false
      }).limit(10);
      if (error) throw error;
      console.log('Found run logs:', data?.length || 0, 'logs');
      setRunLogs(data || []);
    } catch (error) {
      console.error('Error loading run logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };
  const handleViewLogDetails = (log: any) => {
    setSelectedLog(log);
    setLogDetailsModalOpen(true);
  };
  const resetForm = () => {
    // Get current time in club timezone
    const now = DateTime.now().setZone(clubTimezone);
    const currentTime = now.toFormat('HH:mm');
    setFormData({
      name: '',
      time_local: currentTime,
      target: 'TODAY',
      whatsapp_group: defaultWhatsappGroup || '',
      template_id: '',
      enabled: true,
      summary_variant: undefined,
      event_id: undefined,
      is_one_off: false,
      run_at_date_local: undefined,
      date_start_utc: undefined,
      date_end_utc: undefined
    });
  };
  const handleSave = async () => {
    console.log('handleSave called', {
      hasOrg: !!organization?.id,
      hasProfile: !!profile,
      templateId: formData.template_id,
      formData
    });
    if (!organization?.id || !profile) {
      console.error('Missing organization or profile');
      toast.error('Please refresh the page and try again');
      return;
    }

    // Validate required fields
    if (!formData.template_id || formData.template_id.trim() === '') {
      console.error('Template not selected');
      toast.error('Please select a template');
      return;
    }

    // For one-off schedules, validate and compute run_at_utc
    let computedRunAtUtc: string | null = null;
    if (formData.is_one_off) {
      if (!formData.run_at_date_local) {
        toast.error('Please select a date and time for one-off schedule');
        return;
      }
      // datetime-local gives us a string like "2025-11-03T10:45" (no timezone)
      // We need to interpret this in club timezone and convert to UTC
      const localDateTime = DateTime.fromISO(formData.run_at_date_local, {
        zone: clubTimezone
      });
      if (!localDateTime.isValid) {
        toast.error('Invalid date/time selected');
        return;
      }
      computedRunAtUtc = localDateTime.toUTC().toISO();
    }
    try {
      // Only send date_start_utc and date_end_utc if is_one_off is false
      // When is_one_off is true, we use run_at_utc instead
      let dateStartUtc: string | null = null;
      let dateEndUtc: string | null = null;
      if (!formData.is_one_off) {
        // For recurring schedules, use custom date ranges if provided
        dateStartUtc = formData.date_start_utc && formData.date_start_utc.trim() !== '' ? formData.date_start_utc.trim() : null;
        dateEndUtc = formData.date_end_utc && formData.date_end_utc.trim() !== '' ? formData.date_end_utc.trim() : null;
      }
      console.log('Calling schedules-v2-upsert with:', {
        id: editingSchedule?.id || null,
        org_id: organization.id,
        name: formData.name,
        category,
        template_id: formData.template_id?.trim(),
        is_one_off: formData.is_one_off,
        run_at_utc: computedRunAtUtc,
        date_start_utc: dateStartUtc,
        date_end_utc: dateEndUtc,
        formData_date_start_utc: formData.date_start_utc,
        formData_date_end_utc: formData.date_end_utc,
        formData_full: formData
      });

      // For COMPETITIONS_ACADEMIES, default target to 'TODAY' if not set
      // (target field is hidden for this category)
      const finalTarget = category === 'COMPETITIONS_ACADEMIES' ? formData.target || 'TODAY' : formData.target;
      const {
        data,
        error
      } = await supabase.functions.invoke('schedules-v2-upsert', {
        body: {
          id: editingSchedule?.id || null,
          org_id: organization.id,
          name: formData.name,
          time_local: formData.time_local,
          tz: clubTimezone,
          target: finalTarget,
          whatsapp_group: formData.whatsapp_group,
          template_id: formData.template_id?.trim() || null,
          // Convert empty string to null
          status: formData.enabled ? 'ACTIVE' : 'PAUSED',
          category: category,
          // Pass the category from props
          created_by: profile.user_id,
          summary_variant: formData.summary_variant || null,
          // Convert empty to null
          event_id: formData.event_id || null,
          // Convert empty to null
          is_one_off: formData.is_one_off,
          run_at_utc: computedRunAtUtc,
          date_start_utc: dateStartUtc,
          date_end_utc: dateEndUtc
        }
      });
      console.log('Response from schedules-v2-upsert:', {
        data,
        error
      });

      // Log the saved dates to verify they were saved
      if (data) {
        console.log('Saved schedule data:', {
          id: data.id,
          date_start_utc: data.date_start_utc,
          date_end_utc: data.date_end_utc,
          is_one_off: data.is_one_off,
          fullData: data
        });
      }
      if (error) {
        console.error('Error from edge function:', error);
        throw error;
      }
      toast.success(editingSchedule ? 'Schedule updated' : 'Schedule created');
      setModalOpen(false);
      setEditingSchedule(null);
      resetForm();
      loadSchedules();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to save schedule');
    }
  };

  // Helper function to convert ISO string to datetime-local format (YYYY-MM-DDTHH:mm)
  const isoToDatetimeLocal = (isoString: string | undefined): string => {
    if (!isoString) return '';
    try {
      // Parse UTC ISO string and convert to club timezone for display
      const utcDate = DateTime.fromISO(isoString, {
        zone: 'utc'
      });
      const localDate = utcDate.setZone(clubTimezone || 'Europe/London');
      return localDate.toFormat('yyyy-MM-dd\'T\'HH:mm');
    } catch (error) {
      console.error('Error converting ISO to datetime-local:', error, isoString);
      return '';
    }
  };
  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);

    // Debug: Log schedule data to see what we're getting
    console.log('Editing schedule:', {
      id: schedule.id,
      name: schedule.name,
      date_start_utc: (schedule as any).date_start_utc,
      date_end_utc: (schedule as any).date_end_utc,
      is_one_off: (schedule as any).is_one_off,
      run_at_utc: (schedule as any).run_at_utc,
      fullSchedule: schedule
    });

    // Convert run_at_utc (UTC) to local datetime-local format
    let runAtDateLocal: string | undefined = undefined;
    if ((schedule as any).run_at_utc) {
      const utcDateTime = DateTime.fromISO((schedule as any).run_at_utc, {
        zone: 'utc'
      });
      const localDateTime = utcDateTime.setZone(schedule.tz || clubTimezone);
      // Format as datetime-local: YYYY-MM-DDTHH:mm
      runAtDateLocal = localDateTime.toFormat('yyyy-MM-dd\'T\'HH:mm');
    }

    // Keep date_start_utc and date_end_utc as UTC ISO strings
    // The isoToDatetimeLocal function will convert them for display in the UI
    const formDataToSet = {
      name: schedule.name,
      time_local: schedule.time_local,
      target: schedule.target,
      whatsapp_group: schedule.whatsapp_group,
      template_id: schedule.template_id,
      enabled: schedule.status === 'ACTIVE',
      summary_variant: (schedule as any).summary_variant,
      event_id: (schedule as any).event_id,
      is_one_off: (schedule as any).is_one_off || false,
      run_at_date_local: runAtDateLocal,
      date_start_utc: (schedule as any).date_start_utc || undefined,
      date_end_utc: (schedule as any).date_end_utc || undefined
    };
    console.log('Setting form data:', {
      date_start_utc: formDataToSet.date_start_utc,
      date_end_utc: formDataToSet.date_end_utc,
      date_start_display: formDataToSet.date_start_utc ? isoToDatetimeLocal(formDataToSet.date_start_utc) : 'empty',
      date_end_display: formDataToSet.date_end_utc ? isoToDatetimeLocal(formDataToSet.date_end_utc) : 'empty',
      clubTimezone
    });
    setFormData(formDataToSet);
    setModalOpen(true);
  };
  const handleToggleStatus = async (schedule: Schedule) => {
    const newStatus = schedule.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      const {
        error
      } = await supabase.functions.invoke('schedules-v2-upsert', {
        body: {
          id: schedule.id,
          org_id: organization!.id,
          name: schedule.name,
          time_local: schedule.time_local,
          tz: schedule.tz,
          target: schedule.target,
          whatsapp_group: schedule.whatsapp_group,
          template_id: schedule.template_id,
          status: newStatus,
          category: category,
          created_by: profile?.user_id
        }
      });
      if (error) throw error;
      toast.success(`Schedule ${newStatus.toLowerCase()}`);
      loadSchedules();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Failed to update schedule status');
    }
  };
  const handleDuplicate = (schedule: Schedule) => {
    setEditingSchedule(null);
    setFormData({
      name: `${schedule.name} (Copy)`,
      time_local: schedule.time_local,
      target: schedule.target,
      whatsapp_group: schedule.whatsapp_group,
      template_id: schedule.template_id,
      enabled: true,
      summary_variant: schedule.summary_variant || '',
      event_id: schedule.event_id || '',
      is_one_off: schedule.is_one_off || false,
      run_at_date_local: schedule.run_at_utc ? schedule.run_at_utc.split('T')[0] : '',
      date_start_utc: schedule.date_start_utc || '',
      date_end_utc: schedule.date_end_utc || ''
    });
    setModalOpen(true);
  };
  const handleDelete = async () => {
    if (!deleteScheduleId) return;
    try {
      const {
        error
      } = await supabase.from('scheduled_sends_v2').delete().eq('id', deleteScheduleId);
      if (error) throw error;
      toast.success('Schedule deleted');
      setDeleteScheduleId(null);
      loadSchedules();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Failed to delete schedule');
    }
  };

  // Direct manual trigger - calls edge function immediately
  const handleTriggerNow = async (schedule: Schedule) => {
    if (!organization?.id) {
      toast.error('Organization not found');
      return;
    }
    try {
      toast.info('Triggering scheduler manually...');

      // First, set next_run_at_utc to past so it gets picked up
      const now = DateTime.now().toUTC();
      const pastTime = now.minus({
        minutes: 5
      }).toISO(); // Set to 5 minutes ago to be safe

      const {
        data: updateData,
        error: updateError
      } = await supabase.from('scheduled_sends_v2').update({
        next_run_at_utc: pastTime,
        updated_at: now.toISO()
      }).eq('id', schedule.id).select('next_run_at_utc, status').single();
      if (updateError) throw updateError;

      // Normalize the stored time for comparison (handle +00:00 vs Z format)
      const storedTime = updateData?.next_run_at_utc ? new Date(updateData.next_run_at_utc).toISOString() : null;
      console.log('Updated schedule:', {
        next_run_at_utc: updateData?.next_run_at_utc,
        storedTimeNormalized: storedTime,
        status: updateData?.status,
        expectedPastTime: pastTime,
        currentUtc: now.toISO(),
        timeMatches: storedTime === pastTime || storedTime?.startsWith(pastTime.substring(0, 19))
      });

      // Verify the update (compare normalized times)
      if (!storedTime || !storedTime.startsWith(pastTime.substring(0, 19)) && Math.abs(new Date(storedTime).getTime() - new Date(pastTime).getTime()) > 1000) {
        console.warn('Update verification failed - stored value differs from expected', {
          stored: storedTime,
          expected: pastTime,
          diffSeconds: storedTime && pastTime ? Math.abs(new Date(storedTime).getTime() - new Date(pastTime).getTime()) / 1000 : 'N/A'
        });
      } else {
        console.log('Update verified successfully - times match');
      }

      // Wait a bit longer for database to fully commit the update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get session token for authentication
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated - please sign in again');
      }

      // Call edge function directly with fetch for better error handling
      const functionUrl = `${SUPABASE_URL}/functions/v1/run-scheduled-sends-v2`;
      console.log('Calling edge function:', functionUrl);
      const fetchResponse = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({})
      });

      // Parse response
      let data: any;
      const contentType = fetchResponse.headers.get('content-type');
      try {
        if (contentType?.includes('application/json')) {
          data = await fetchResponse.json();
        } else {
          const textBody = await fetchResponse.text();
          data = {
            error: textBody,
            raw: textBody
          };
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        data = {
          error: 'Failed to parse response'
        };
      }
      console.log('Manual trigger response:', {
        httpStatus: fetchResponse.status,
        httpStatusText: fetchResponse.statusText,
        httpOk: fetchResponse.ok,
        responseData: data
      });

      // Check for errors
      if (!fetchResponse.ok) {
        const errorDetails = data?.error || data?.message || JSON.stringify(data);
        throw new Error(`Edge Function returned HTTP ${fetchResponse.status}: ${errorDetails}`);
      }
      if (data?.processed === 0) {
        toast.warning('Scheduler ran but found 0 due schedules. Check if schedule is ACTIVE and next_run_at_utc is in the past.');
      } else {
        toast.success(`Scheduler processed ${data?.processed || 0} schedules! Checking logs...`);
      }

      // Wait a moment then reload logs
      setTimeout(() => {
        loadRunLogs();
        loadSchedules();
      }, 3000);
    } catch (error: any) {
      console.error('Error triggering scheduler:', error);
      toast.error(`Failed to trigger: ${error.message || 'Unknown error'}`);
    }
  };

  // Test functionality - sends message immediately using same logic as manual send
  const handleRunNow = async (schedule: Schedule) => {
    if (!organization?.id) {
      toast.error('Organization not found');
      return;
    }
    try {
      // Set next_run_at_utc to 2 minutes from now
      const now = DateTime.now().toUTC();
      const runAt = now.plus({
        minutes: 2
      });
      const {
        error
      } = await supabase.from('scheduled_sends_v2').update({
        next_run_at_utc: runAt.toISO(),
        updated_at: now.toISO()
      }).eq('id', schedule.id);
      if (error) throw error;
      const runTimeLocal = runAt.setZone(schedule.tz || 'Europe/London');
      toast.success(`Schedule "${schedule.name}" will run at ${runTimeLocal.toFormat('HH:mm')} (${schedule.tz || 'UTC'}). Check logs for results.`);

      // Reload schedules to show updated next_run_at_utc
      loadSchedules();
    } catch (error) {
      console.error('Error triggering schedule:', error);
      toast.error('Failed to trigger schedule');
    }
  };
  const handleTestSend = async () => {
    if (!testGroupName.trim()) {
      toast.error('Please enter a WhatsApp group name for testing');
      return;
    }
    if (!organization?.tenant_id) {
      toast.error('Club tenant information not found');
      return;
    }
    setTestingMessage(true);
    setLastTestResult(null);
    try {
      // Use the same logic as manual send - call send-whatsapp-message function
      const {
        data,
        error
      } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          tenant_id: organization.tenant_id,
          category: 'AVAILABILITY',
          whatsapp_group: testGroupName,
          message: 'Test message from Court Availability scheduler',
          template_id: null
        }
      });
      if (error) throw error;
      if (data.status === 'OK') {
        setLastTestResult({
          status: 'success',
          message: `Test message sent to "${testGroupName}" successfully! Check your WhatsApp group.`
        });
        toast.success('Test message sent successfully!');
        // Reload run logs to show the test result
        loadRunLogs();
      } else {
        setLastTestResult({
          status: 'error',
          message: `Test failed: ${JSON.stringify(data.result).substring(0, 120)}`
        });
        toast.error('Test message failed to send');
      }
    } catch (err: any) {
      console.error('Error sending test message:', err);
      setLastTestResult({
        status: 'error',
        message: err.message || 'Failed to send test message'
      });
      toast.error('Failed to send test message');
    } finally {
      setTestingMessage(false);
    }
  };
  const formatTimeInClubTz = (timeLocal: string) => {
    return timeLocal; // Already in club timezone format HH:mm
  };
  const formatNextRunInClubTz = (nextRunUtc: string, tz: string) => {
    try {
      const dt = DateTime.fromISO(nextRunUtc).setZone(tz);
      return dt.toFormat('MMM d, HH:mm');
    } catch (error) {
      return 'Invalid date';
    }
  };
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">Enabled</Badge>;
      case 'PAUSED':
        return <Badge className="bg-muted text-muted-foreground border-border">Paused</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  const getLastStatusIcon = (lastStatus?: string) => {
    if (!lastStatus) return null;
    if (lastStatus === 'OK') {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
  };
  if (loading) {
    return <div>Loading scheduled sends...</div>;
  }

  return <>
      {/* Test Connection Section */}
      <Collapsible open={testSectionOpen} onOpenChange={setTestSectionOpen}>
        <Card className="bg-blue-50/50 dark:bg-blue-950/20 backdrop-blur-sm rounded-2xl shadow-md border border-blue-200/50 dark:border-blue-800/30 mb-6">
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-3 cursor-pointer hover:bg-blue-100/30 dark:hover:bg-blue-900/20 transition-colors rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100/70 dark:bg-blue-900/30">
                    {lastTestResult?.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />
                    ) : (
                      <Link2 className="h-4 w-4 text-blue-600 dark:text-blue-400" strokeWidth={1.5} />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      Test Your WhatsApp Connection
                      <Popover>
                        <PopoverTrigger asChild>
                          <button 
                            onClick={(e) => e.stopPropagation()} 
                            className="p-1 rounded-full hover:bg-blue-200/50 dark:hover:bg-blue-800/30 transition-colors"
                          >
                            <Info className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 text-sm" align="start">
                          <div className="space-y-3">
                            <h4 className="font-semibold">Setup Instructions</h4>
                            <ol className="list-decimal pl-4 space-y-2 text-muted-foreground">
                              <li><strong className="text-foreground">Add the CORTEK number</strong> to your WhatsApp group as a participant</li>
                              <li><strong className="text-foreground">Group name must match exactly</strong> – Enter the exact same name as your WhatsApp group below (case-sensitive)</li>
                              <li><strong className="text-foreground">Send a test</strong> to verify the connection is working</li>
                            </ol>
                          </div>
                        </PopoverContent>
                      </Popover>
                      {lastTestResult?.status === 'success' && (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 text-xs">
                          Connected
                        </Badge>
                      )}
                    </CardTitle>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${testSectionOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent className="animate-accordion-down data-[state=closed]:animate-accordion-up">
            <CardContent className="pt-0">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input
                  placeholder="WhatsApp group name..."
                  value={testGroupName}
                  onChange={(e) => setTestGroupName(e.target.value)}
                  className="flex-1 h-10 bg-white dark:bg-background"
                />
                <Button
                  onClick={handleTestSend}
                  disabled={testingMessage || !testGroupName.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                >
                  {testingMessage ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" strokeWidth={1.5} />
                      Send Test Message
                    </>
                  )}
                </Button>
              </div>
              
              {lastTestResult && (
                <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 text-sm ${
                  lastTestResult.status === 'success' 
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50' 
                    : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50'
                }`}>
                  {lastTestResult.status === 'success' ? (
                    <CheckCircle className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  {lastTestResult.message}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Scheduled Messages Section */}
      <Card className="bg-white/70 dark:bg-card/70 backdrop-blur-sm rounded-2xl shadow-lg border border-border/40 dark:border-white/[0.08] overflow-hidden">
        <Tabs defaultValue="schedules" className="w-full">
          <CardHeader className="pb-0 border-b border-border/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
                  <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
                </div>
                <CardTitle className="text-lg font-semibold">Scheduled Messages</CardTitle>
              </div>
              <Button onClick={() => {
                resetForm();
                setEditingSchedule(null);
                setModalOpen(true);
              }} size="sm" className="bg-primary/10 border border-primary text-primary hover:bg-primary/20">
                <Plus className="h-4 w-4 mr-1" strokeWidth={1.5} />
                New Schedule
              </Button>
            </div>
            <TabsList className="w-full justify-start bg-transparent p-0 h-auto border-b-0">
              <TabsTrigger value="schedules" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 pb-3">
                Schedules
              </TabsTrigger>
              <TabsTrigger value="recent-runs" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 pb-3 gap-2">
                Recent Runs
                {runLogs.length > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-muted text-muted-foreground">
                    {runLogs.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          
          <TabsContent value="schedules" className="mt-0">
            <CardContent className="pt-5">
              {schedules.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                  No scheduled sends configured. Create your first schedule to get started.
                </div> : <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Name</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Time</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Target</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Group</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Template</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Status</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Next run</TableHead>
                      <TableHead className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map(schedule => <TableRow key={schedule.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {schedule.name}
                            {getLastStatusIcon(schedule.last_status)}
                          </div>
                        </TableCell>
                        <TableCell>{formatTimeInClubTz(schedule.time_local)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {schedule.target}
                          </Badge>
                        </TableCell>
                        <TableCell>{schedule.whatsapp_group}</TableCell>
                        <TableCell>{schedule.message_templates?.name}</TableCell>
                        <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                        <TableCell>{formatNextRunInClubTz(schedule.next_run_at_utc, schedule.tz)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-0.5">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(schedule)} title="Edit schedule" className="text-muted-foreground hover:text-foreground h-8 w-8 p-0">
                              <Edit2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleToggleStatus(schedule)} title={schedule.status === 'ACTIVE' ? 'Pause schedule' : 'Resume schedule'} className="text-muted-foreground hover:text-foreground h-8 w-8 p-0">
                              {schedule.status === 'ACTIVE' ? <Pause className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Play className="h-3.5 w-3.5" strokeWidth={1.5} />}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleTriggerNow(schedule)} title="Trigger immediately" disabled={schedule.status !== 'ACTIVE'} className="text-primary hover:text-primary/80 h-8 w-8 p-0">
                              <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground h-8 w-8 p-0">
                                  <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40 bg-popover border border-border shadow-md">
                                <DropdownMenuItem onClick={() => handleRunNow(schedule)} disabled={schedule.status !== 'ACTIVE'} className="gap-2 text-sm">
                                  <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                                  Schedule +2min
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicate(schedule)} className="gap-2 text-sm">
                                  <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeleteScheduleId(schedule.id)} className="gap-2 text-sm text-destructive focus:text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>)}
                  </TableBody>
                </Table>}
            </CardContent>
          </TabsContent>
          
          <TabsContent value="recent-runs" className="mt-0">
            <CardContent className="pt-5">
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={loadRunLogs} disabled={loadingLogs} className="rounded-lg border-border/50">
                  {loadingLogs ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
                </Button>
              </div>
              {loadingLogs ? <div className="text-center py-4 text-muted-foreground">Loading recent runs...</div> : runLogs.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                  No runs yet. Create a schedule and wait for it to execute.
                </div> : <div className="space-y-2">
                  {runLogs.map(log => <div key={log.id} className="flex items-center justify-between p-4 bg-muted/20 dark:bg-muted/10 border border-border/30 rounded-xl hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                        {log.status === 'OK' ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : log.status === 'SKIPPED' ? <Clock className="h-4 w-4 text-amber-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />}
                        <div>
                          <div className="font-medium text-foreground">
                            {log.scheduled_sends_v2?.name || 'Unknown Schedule'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(log.sent_at).toLocaleString()} • {log.whatsapp_group}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={log.status === 'OK' ? 'default' : log.status === 'SKIPPED' ? 'outline' : 'destructive'} className={log.status === 'OK' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' : log.status === 'SKIPPED' ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800' : ''}>
                          {log.status}
                        </Badge>
                        {log.message_excerpt && <div className="text-xs text-muted-foreground max-w-xs truncate">
                            {log.message_excerpt}
                          </div>}
                        <Button variant="ghost" size="sm" onClick={() => handleViewLogDetails(log)} className="h-8 w-8 p-0 hover:bg-muted/50">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>)}
                </div>}
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="pb-4 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
                <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
              </div>
              <DialogTitle className="text-lg font-semibold">
                {editingSchedule ? 'Edit Schedule' : 'New Schedule'}
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium">Schedule Name</Label>
              <Input id="name" className="h-11 rounded-lg" value={formData.name} onChange={e => setFormData({
              ...formData,
              name: e.target.value
            })} placeholder="Daily evening availability" />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="time" className="text-sm font-medium">Time</Label>
              <Input id="time" type="time" className="h-11 rounded-lg" value={formData.time_local} onChange={e => setFormData({
              ...formData,
              time_local: e.target.value
            })} />
            </div>
            
            {/* Target field - only show for AVAILABILITY and PARTIAL_MATCHES, not for COMPETITIONS_ACADEMIES */}
            {category !== 'COMPETITIONS_ACADEMIES' && <div className="space-y-1.5">
                <Label className="text-sm font-medium">Day To Send</Label>
                <RadioGroup value={formData.target} onValueChange={value => setFormData({
              ...formData,
              target: value as 'TODAY' | 'TOMORROW'
            })} className="flex gap-6 mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="TODAY" id="today" className="border-purple-500 text-purple-600 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600" />
                    <Label htmlFor="today" className="text-sm">Today</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="TOMORROW" id="tomorrow" className="border-purple-500 text-purple-600 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600" />
                    <Label htmlFor="tomorrow" className="text-sm">Tomorrow</Label>
                  </div>
                </RadioGroup>
              </div>}
            
            <div className="space-y-1.5">
              <Label htmlFor="group" className="text-sm font-medium">WhatsApp Group</Label>
              <Input id="group" className="h-11 rounded-lg" value={formData.whatsapp_group} onChange={e => setFormData({
              ...formData,
              whatsapp_group: e.target.value
            })} placeholder="Group name" />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="template" className="text-sm font-medium">Template</Label>
              <Select value={formData.template_id} onValueChange={value => {
              const tpl = templates.find(t => t.id === value);
              if (tpl) {
                // Auto-load template configuration
                setFormData({
                  ...formData,
                  template_id: value,
                  whatsapp_group: tpl?.whatsapp_group || formData.whatsapp_group,
                  summary_variant: tpl?.summary_variant || formData.summary_variant,
                  event_id: tpl?.linked_event_id || formData.event_id
                });
              } else {
                setFormData({
                  ...formData,
                  template_id: value
                });
              }
            }}>
                <SelectTrigger className="h-11 rounded-lg">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {templates.map(template => <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {/* Category-specific fields */}
            {category === 'PARTIAL_MATCHES' && <div className="space-y-1.5">
                <Label className="text-sm font-medium">Summary Variant</Label>
                <Select value={formData.summary_variant || ''} onValueChange={value => setFormData({
              ...formData,
              summary_variant: value || undefined
            })}>
                  <SelectTrigger className="h-11 rounded-lg">
                    <SelectValue placeholder="Select variant" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="1_3_PLAYERS">Competitive — Open (1–3 players)</SelectItem>
                    <SelectItem value="1_PLAYER">Competitive — Open (1 player)</SelectItem>
                    <SelectItem value="2_PLAYERS">Competitive — Open (2 players)</SelectItem>
                    <SelectItem value="3_PLAYERS">Competitive — Open (3 players)</SelectItem>
                  </SelectContent>
                </Select>
              </div>}

            {category === 'COMPETITIONS_ACADEMIES' && <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">One-Off Send</Label>
                  <div className="flex items-center gap-2 mt-2">
                    <Switch id="is_one_off" className="data-[state=checked]:bg-purple-600" checked={!!formData.is_one_off} onCheckedChange={checked => setFormData({
                  ...formData,
                  is_one_off: checked
                })} />
                    <Label htmlFor="is_one_off" className="text-sm">Run at specific date/time</Label>
                  </div>
                </div>
                {formData.is_one_off ? <div className="space-y-1.5">
                    <Label htmlFor="runAt" className="text-sm font-medium">Run At ({clubTimezone})</Label>
                    <Input id="runAt" type="datetime-local" className="h-11 rounded-lg" value={formData.run_at_date_local || ''} onChange={e => setFormData({
                ...formData,
                run_at_date_local: e.target.value || undefined
                })} />
                  </div> : <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="dateStart" className="text-sm font-medium">Custom Range Start (UTC)</Label>
                      <Input id="dateStart" type="datetime-local" className="h-11 rounded-lg w-full" value={isoToDatetimeLocal(formData.date_start_utc)} onInput={e => {
                  // Handle input event as well for better browser compatibility
                  const target = e.target as HTMLInputElement;
                  if (target.value) {
                    try {
                      const localDt = DateTime.fromISO(target.value, {
                        zone: clubTimezone
                      });
                      if (localDt.isValid) {
                        const utcIso = localDt.toUTC().toISO();
                        if (utcIso) {
                          setFormData(prev => {
                            if (prev.date_start_utc !== utcIso) {
                              console.log('dateStart onInput - updating date_start_utc:', utcIso);
                              return {
                                ...prev,
                                date_start_utc: utcIso
                              };
                            }
                            return prev;
                          });
                        }
                      }
                    } catch (error) {
                      console.error('Error in dateStart onInput:', error);
                    }
                  }
                }} onChange={e => {
                  console.log('dateStart onChange triggered:', {
                    value: e.target.value,
                    currentFormData: formData.date_start_utc,
                    clubTimezone
                  });

                  // Convert datetime-local (local time) to UTC ISO string
                  if (e.target.value) {
                    try {
                      const localDt = DateTime.fromISO(e.target.value, {
                        zone: clubTimezone
                      });
                      if (!localDt.isValid) {
                        console.error('Invalid date:', e.target.value);
                        return;
                      }
                      const utcIso = localDt.toUTC().toISO();
                      console.log('Setting date_start_utc:', {
                        input: e.target.value,
                        localDt: localDt.toISO(),
                        utcIso,
                        clubTimezone,
                        isValid: localDt.isValid
                      });
                      if (utcIso) {
                        setFormData(prev => {
                          const updated = {
                            ...prev,
                            date_start_utc: utcIso
                          };
                          console.log('Updated formData.date_start_utc:', updated.date_start_utc);
                          return updated;
                        });
                      }
                    } catch (error) {
                      console.error('Error converting date_start_utc:', error);
                    }
                  } else {
                    console.log('Clearing date_start_utc');
                    setFormData(prev => ({
                      ...prev,
                      date_start_utc: undefined
                    }));
                  }
                }} onBlur={e => {
                  // Also handle blur event to ensure date is saved when user clicks outside
                  if (e.target.value) {
                    try {
                      const localDt = DateTime.fromISO(e.target.value, {
                        zone: clubTimezone
                      });
                      if (localDt.isValid) {
                        const utcIso = localDt.toUTC().toISO();
                        if (utcIso) {
                          setFormData(prev => {
                            if (prev.date_start_utc !== utcIso) {
                              console.log('dateStart onBlur - updating date_start_utc:', utcIso);
                              return {
                                ...prev,
                                date_start_utc: utcIso
                              };
                            }
                            return prev;
                          });
                        }
                      }
                    } catch (error) {
                      console.error('Error in dateStart onBlur:', error);
                    }
                  }
                }} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="dateEnd" className="text-sm font-medium">Custom Range End (UTC)</Label>
                      <Input id="dateEnd" type="datetime-local" className="h-11 rounded-lg w-full" value={isoToDatetimeLocal(formData.date_end_utc)} onInput={e => {
                  // Handle input event as well for better browser compatibility
                  const target = e.target as HTMLInputElement;
                  if (target.value) {
                    try {
                      const localDt = DateTime.fromISO(target.value, {
                        zone: clubTimezone
                      });
                      if (localDt.isValid) {
                        const utcIso = localDt.toUTC().toISO();
                        if (utcIso) {
                          setFormData(prev => {
                            if (prev.date_end_utc !== utcIso) {
                              console.log('dateEnd onInput - updating date_end_utc:', utcIso);
                              return {
                                ...prev,
                                date_end_utc: utcIso
                              };
                            }
                            return prev;
                          });
                        }
                      }
                    } catch (error) {
                      console.error('Error in dateEnd onInput:', error);
                    }
                  }
                }} onChange={e => {
                  console.log('dateEnd onChange triggered:', {
                    value: e.target.value,
                    currentFormData: formData.date_end_utc,
                    clubTimezone
                  });

                  // Convert datetime-local (local time) to UTC ISO string
                  if (e.target.value) {
                    try {
                      const localDt = DateTime.fromISO(e.target.value, {
                        zone: clubTimezone
                      });
                      if (!localDt.isValid) {
                        console.error('Invalid date:', e.target.value);
                        return;
                      }
                      const utcIso = localDt.toUTC().toISO();
                      console.log('Setting date_end_utc:', {
                        input: e.target.value,
                        localDt: localDt.toISO(),
                        utcIso,
                        clubTimezone,
                        isValid: localDt.isValid
                      });
                      if (utcIso) {
                        setFormData(prev => {
                          const updated = {
                            ...prev,
                            date_end_utc: utcIso
                          };
                          console.log('Updated formData.date_end_utc:', updated.date_end_utc);
                          return updated;
                        });
                      }
                    } catch (error) {
                      console.error('Error converting date_end_utc:', error);
                    }
                  } else {
                    console.log('Clearing date_end_utc');
                    setFormData(prev => ({
                      ...prev,
                      date_end_utc: undefined
                    }));
                  }
                }} onBlur={e => {
                  // Also handle blur event to ensure date is saved when user clicks outside
                  if (e.target.value) {
                    try {
                      const localDt = DateTime.fromISO(e.target.value, {
                        zone: clubTimezone
                      });
                      if (localDt.isValid) {
                        const utcIso = localDt.toUTC().toISO();
                        if (utcIso) {
                          setFormData(prev => {
                            if (prev.date_end_utc !== utcIso) {
                              console.log('dateEnd onBlur - updating date_end_utc:', utcIso);
                              return {
                                ...prev,
                                date_end_utc: utcIso
                              };
                            }
                            return prev;
                          });
                        }
                      }
                    } catch (error) {
                      console.error('Error in dateEnd onBlur:', error);
                    }
                  }
                }} />
                    </div>
                  </div>}
              </div>}
            
            <div className="flex items-center space-x-2 pt-2 pb-2 px-3 bg-muted/30 rounded-lg">
              <Switch id="enabled" className="data-[state=checked]:bg-purple-600" checked={formData.enabled} onCheckedChange={checked => setFormData({
              ...formData,
              enabled: checked
            })} />
              <Label htmlFor="enabled" className="text-sm font-medium">Enable Schedule</Label>
            </div>
            
            <div className="flex gap-3 pt-4 border-t border-border/30">
              <Button variant="ghost" onClick={() => setModalOpen(false)} className="flex-1 text-muted-foreground hover:bg-muted/50">
                Cancel
              </Button>
              <Button onClick={handleSave} className="flex-1 bg-primary/10 border border-primary text-primary hover:bg-primary/20">
                {editingSchedule ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteScheduleId} onOpenChange={() => setDeleteScheduleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this schedule? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Log Details Modal */}
      <Dialog open={logDetailsModalOpen} onOpenChange={setLogDetailsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedLog?.status === 'OK' ? <CheckCircle className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5 text-red-600" />}
              Log Details
            </DialogTitle>
          </DialogHeader>
          {selectedLog && <div className="space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Schedule Name</Label>
                  <p className="text-sm">{selectedLog.scheduled_sends_v2?.name || 'Unknown'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedLog.status === 'OK' ? 'default' : 'destructive'} className={selectedLog.status === 'OK' ? 'bg-green-100 text-green-800 border-green-200' : ''}>
                      {selectedLog.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Sent At</Label>
                  <p className="text-sm">{new Date(selectedLog.sent_at).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">WhatsApp Group</Label>
                  <p className="text-sm">{selectedLog.whatsapp_group}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                  <p className="text-sm">{selectedLog.category}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Log ID</Label>
                  <p className="text-sm font-mono">{selectedLog.log_id}</p>
                </div>
              </div>

              {/* Message Content */}
              {(selectedLog.message || selectedLog.message_excerpt) && <div>
                  <Label className="text-sm font-medium text-muted-foreground">Complete Message Content</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md">
                    <pre className="text-sm whitespace-pre-wrap font-sans">
                      {selectedLog.message || selectedLog.message_excerpt}
                    </pre>
                  </div>
                </div>}

              {/* Template ID */}
              {selectedLog.template_id && <div>
                  <Label className="text-sm font-medium text-muted-foreground">Template ID</Label>
                  <p className="text-sm font-mono">{selectedLog.template_id}</p>
                </div>}

              {/* Error Details */}
              {(selectedLog.error_details || selectedLog.status === 'ERROR' && selectedLog.response_text) && <div>
                  <Label className="text-sm font-medium text-muted-foreground">Error Reason</Label>
                  <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-md">
                    <pre className="text-sm whitespace-pre-wrap font-sans text-red-800">
                      {selectedLog.error_details || (selectedLog.response_text ? typeof selectedLog.response_text === 'string' ? selectedLog.response_text : JSON.stringify(selectedLog.response_text) : 'Unknown error')}
                    </pre>
                  </div>
                </div>}

              {/* Raw Response */}
              {selectedLog.raw_response && <div>
                  <Label className="text-sm font-medium text-muted-foreground">Raw Response</Label>
                  <div className="mt-1 p-3 bg-muted rounded-md">
                    <pre className="text-sm whitespace-pre-wrap font-mono">
                      {typeof selectedLog.raw_response === 'string' ? selectedLog.raw_response : JSON.stringify(selectedLog.raw_response, null, 2)}
                    </pre>
                  </div>
                </div>}

              {/* Additional Fields */}
              <div className="grid grid-cols-2 gap-4">
                {selectedLog.tenant_id && <div>
                    <Label className="text-sm font-medium text-muted-foreground">Tenant ID</Label>
                    <p className="text-sm font-mono">{selectedLog.tenant_id}</p>
                  </div>}
                {selectedLog.org_id && <div>
                    <Label className="text-sm font-medium text-muted-foreground">Organization ID</Label>
                    <p className="text-sm font-mono">{selectedLog.org_id}</p>
                  </div>}
                {selectedLog.schedule_id && <div>
                    <Label className="text-sm font-medium text-muted-foreground">Schedule ID</Label>
                    <p className="text-sm font-mono">{selectedLog.schedule_id}</p>
                  </div>}
                {selectedLog.created_at && <div>
                    <Label className="text-sm font-medium text-muted-foreground">Created At</Label>
                    <p className="text-sm">{new Date(selectedLog.created_at).toLocaleString()}</p>
                  </div>}
              </div>

            </div>}
        </DialogContent>
      </Dialog>
    </>;
};