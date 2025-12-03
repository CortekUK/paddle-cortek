import { useState, useEffect, useRef } from 'react';
import { useOrganizationAuth } from '@/hooks/useOrganizationAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { Search, Calendar as CalendarIcon, AlertCircle, Loader2, MessageSquare, Send, Plus, Save, Star, Eye, FileText, Clock, ChevronRight, ChevronDown, Info } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format, addDays, startOfDay, endOfDay, endOfWeek, startOfWeek } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { useToast } from '@/hooks/use-toast';
import { ScheduledSendsV2 } from '@/components/client/ScheduledSendsV2';
import EmojiPicker from '@/components/client/EmojiPicker';
import { generateAvailabilitySummary } from '@/utils/playtomicAdminUtils';
import { SocialPostBuilder } from '@/components/social/SocialPostBuilder';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
export default function CourtAvailability() {
  const {
    organization
  } = useOrganizationAuth();
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Search results state
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [summaryText, setSummaryText] = useState('');
  const [dateDisplayShort, setDateDisplayShort] = useState('');
  const [countSlots, setCountSlots] = useState(0);

  // Template state
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templateName, setTemplateName] = useState('');
  const [templateContent, setTemplateContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Send state  
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendResult, setSendResult] = useState<{
    status: string;
    message: string;
  } | null>(null);
  const [whatsappGroup, setWhatsappGroup] = useState('');
  const [orgSettings, setOrgSettings] = useState<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Default to current date and time + 2 hours
  const now = new Date();
  const defaultFromDate = format(now, "yyyy-MM-dd'T'HH:mm:ss");
  const defaultToDate = format(new Date(now.getTime() + 2 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm:ss");
  const [dateFrom, setDateFrom] = useState(defaultFromDate);
  const [dateTo, setDateTo] = useState(defaultToDate);

  // Playtomic offset configuration - default to London offset
  const playtomicOffsetMinutes = 60;

  // Helper functions for wall-time math and formatting
  const hhmmToMinutes = (timeStr: string): number => {
    const parts = timeStr.split(':').map(n => parseInt(n));
    return parts[0] * 60 + (parts[1] || 0);
  };
  const minutesToHHMM = (minutes: number): string => {
    const totalMins = minutes % 1440;
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };
  const addMinutesLocal = (timeStr: string, offsetMins: number): string => {
    const baseMins = hhmmToMinutes(timeStr);
    const adjustedMins = (baseMins + offsetMins + 1440) % 1440;
    return minutesToHHMM(adjustedMins);
  };
  const formatCompactAmPm = (minutes: number): string => {
    const totalMins = (minutes % 1440 + 1440) % 1440;
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hours === 0) {
      return mins === 0 ? "12am" : `12:${mins.toString().padStart(2, '0')}am`;
    } else if (hours < 12) {
      return mins === 0 ? `${hours}am` : `${hours}:${mins.toString().padStart(2, '0')}am`;
    } else if (hours === 12) {
      return mins === 0 ? "12pm" : `12:${mins.toString().padStart(2, '0')}pm`;
    } else {
      const displayHour = hours - 12;
      return mins === 0 ? `${displayHour}pm` : `${displayHour}:${mins.toString().padStart(2, '0')}pm`;
    }
  };
  const DAY_PART_BOUNDARIES = {
    morning: {
      start: 360,
      end: 720
    },
    afternoon: {
      start: 720,
      end: 1020
    },
    evening: {
      start: 1020,
      end: 1380
    }
  };
  const extractRawSlots = (data: any[]) => {
    if (!Array.isArray(data) || data.length === 0) return [];
    const slots = [];
    for (const item of data) {
      if (item.slots && Array.isArray(item.slots)) {
        slots.push(...item.slots);
      } else if (item.start_time || item.startTime) {
        slots.push(item);
      }
    }
    return slots;
  };
  const parseSlotTime = (slot: any) => {
    let startTime = null;
    if (slot.start_date && slot.start_time) {
      startTime = slot.start_time;
    } else if (slot.start_time) {
      startTime = slot.start_time;
    } else if (slot.startTime) {
      startTime = slot.startTime;
    }
    if (!startTime) return null;
    const baseTime = startTime.split(':').slice(0, 2).join(':');
    const duration = slot.duration || slot.duration_minutes || slot.length || 90;
    const adjustedStartHHMM = addMinutesLocal(baseTime, playtomicOffsetMinutes);
    const adjustedStartMin = hhmmToMinutes(adjustedStartHHMM);
    const adjustedEndMin = (adjustedStartMin + duration) % 1440;
    return {
      startTimeHHMM: baseTime,
      adjustedStartHHMM,
      adjustedStartMin,
      adjustedEndMin,
      hour: Math.floor(adjustedStartMin / 60),
      duration
    };
  };
  const generateSummary = (data: any[]) => {
    return generateAvailabilitySummary(data, playtomicOffsetMinutes);
  };
  const toShortDate = (from: Date, to: Date, tz = 'Europe/London') => {
    const f = formatInTimeZone(from, tz, 'EEE d LLL');
    const t = formatInTimeZone(to, tz, 'EEE d LLL');
    return f === t ? f : `${f} – ${t}`;
  };
  const [activePreset, setActivePreset] = useState<'today' | 'tomorrow' | 'week' | null>(null);
  const setPreset = (preset: 'today' | 'tomorrow' | 'week') => {
    const now = new Date();
    const timezone = 'Europe/London';
    let targetStart: Date;
    let targetEnd: Date;
    if (preset === 'today') {
      targetStart = startOfDay(now);
      targetEnd = endOfDay(now);
    } else if (preset === 'tomorrow') {
      targetStart = startOfDay(addDays(now, 1));
      targetEnd = endOfDay(addDays(now, 1));
    } else {
      targetStart = startOfDay(now);
      targetEnd = endOfWeek(now, {
        weekStartsOn: 1
      });
    }
    const startLocal = formatInTimeZone(targetStart, timezone, 'yyyy-MM-dd\'T\'HH:mm:ss');
    const endLocal = formatInTimeZone(targetEnd, timezone, 'yyyy-MM-dd\'T\'HH:mm:ss');
    setDateFrom(startLocal);
    setDateTo(endLocal);
    setActivePreset(preset);
  };

  // Parse dates for calendar display
  const fromDate = dateFrom ? new Date(dateFrom) : undefined;
  const toDate = dateTo ? new Date(dateTo) : undefined;
  const handleFromDateSelect = (date: Date | undefined) => {
    if (date) {
      const timezone = 'Europe/London';
      const startLocal = formatInTimeZone(startOfDay(date), timezone, 'yyyy-MM-dd\'T\'HH:mm:ss');
      setDateFrom(startLocal);
      setActivePreset(null);
    }
  };
  const handleToDateSelect = (date: Date | undefined) => {
    if (date) {
      const timezone = 'Europe/London';
      const endLocal = formatInTimeZone(endOfDay(date), timezone, 'yyyy-MM-dd\'T\'HH:mm:ss');
      setDateTo(endLocal);
      setActivePreset(null);
    }
  };
  useEffect(() => {
    if (organization?.id) {
      loadTemplatesAndSettings();
    }
  }, [organization?.id]);
  const loadTemplatesAndSettings = async () => {
    try {
      const {
        data: templatesData,
        error: templatesError
      } = await supabase.from('message_templates').select('*').eq('category', 'AVAILABILITY').eq('org_id', organization!.id).order('created_at', {
        ascending: false
      });
      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);
      const defaultTemplate = templatesData?.find(t => t.is_default);
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id);
        setTemplateName(defaultTemplate.name);
        setTemplateContent(defaultTemplate.content);
      } else if (templatesData?.length === 0) {
        setTemplateName('');
        setTemplateContent(`*COURT AVAILABILITY @ {{club_name}}*
📅 {{date_display_short}}

{{summary}}

Book now — don't miss out!`);
      }
      const {
        data: settingsData,
        error: settingsError
      } = await supabase.from('org_automation_settings').select('*').eq('org_id', organization!.id).single();
      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error loading settings:', settingsError);
      } else {
        setOrgSettings(settingsData);
        setWhatsappGroup(settingsData?.wa_group_availability || '');
      }
    } catch (err) {
      console.error('Error loading templates and settings:', err);
      toast({
        title: "Error",
        description: "Failed to load templates and settings",
        variant: "destructive"
      });
    }
  };
  const handleSearch = async () => {
    if (!organization?.tenant_id) {
      setError('Club tenant information not found. Please contact support.');
      return;
    }
    setLoading(true);
    setError('');
    setSendResult(null);
    try {
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      if (fromDate >= toDate) {
        setError('End date must be after start date');
        setLoading(false);
        return;
      }
      const {
        data,
        error: fetchError
      } = await supabase.functions.invoke('playtomic-fetch', {
        body: {
          endpoint: 'availability',
          tenant_id: organization.tenant_id,
          sport_id: 'PADEL',
          start_min: fromDate.toISOString(),
          start_max: toDate.toISOString()
        }
      });
      if (fetchError) {
        throw new Error(fetchError.message || 'Failed to fetch availability data');
      }
      if (data?.error) {
        throw new Error(data.error);
      }
      if (data?.raw && Array.isArray(data.raw)) {
        setSearchResults(data.raw);
        if (data.raw.length === 0) {
          setSummaryText('0 slots available for this day');
          setCountSlots(0);
        } else {
          const totalSlots = data.raw.reduce((count, resource) => {
            return count + (resource.slots?.length || 0);
          }, 0);
          setCountSlots(totalSlots);
          if (totalSlots === 0) {
            setSummaryText('0 slots available for this day');
          } else {
            const enhanced = generateSummary(data.raw);
            setSummaryText(enhanced);
          }
        }
      } else {
        setSummaryText('No availability data found');
        setCountSlots(0);
        setSearchResults([]);
      }
      setDateDisplayShort(toShortDate(fromDate, toDate));
    } catch (err: any) {
      console.error('Availability search error:', err);
      setError(err.message || 'An error occurred while searching for availability');
    } finally {
      setLoading(false);
    }
  };
  const renderTemplate = (template: string): string => {
    const context = {
      summary: summaryText || 'No summary available',
      date_display_short: dateDisplayShort || 'No date selected',
      club_name: (organization as any)?.club_name || organization?.name || 'Club',
      sport: 'PADEL',
      count_slots: countSlots.toString()
    };
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
      return (context as any)[key] || '';
    });
  };
  const insertToken = (token: string) => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = templateContent.substring(0, start);
    const after = templateContent.substring(end);
    setTemplateContent(before + token + after);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };
  const insertEmoji = (emoji: string) => {
    insertToken(emoji);
  };
  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplateId(templateId);
      setTemplateName(template.name);
      setTemplateContent(template.content);
    }
  };
  const handleNewTemplate = () => {
    setSelectedTemplateId('');
    setTemplateName('');
    setTemplateContent('');
  };
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a template name",
        variant: "destructive"
      });
      return;
    }
    try {
      const templateData = {
        org_id: organization!.id,
        category: 'AVAILABILITY',
        name: templateName,
        content: templateContent
      };
      if (selectedTemplateId) {
        const {
          error
        } = await supabase.from('message_templates').update(templateData).eq('id', selectedTemplateId);
        if (error) throw error;
      } else {
        const {
          data,
          error
        } = await supabase.from('message_templates').insert(templateData).select().single();
        if (error) throw error;
        setSelectedTemplateId(data.id);
      }
      toast({
        title: "Success",
        description: `Template ${selectedTemplateId ? 'updated' : 'saved'} successfully`
      });
      loadTemplatesAndSettings();
    } catch (err: any) {
      console.error('Error saving template:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to save template",
        variant: "destructive"
      });
    }
  };
  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a template name",
        variant: "destructive"
      });
      return;
    }
    try {
      const {
        data,
        error
      } = await supabase.from('message_templates').insert({
        org_id: organization!.id,
        category: 'AVAILABILITY',
        name: templateName,
        content: templateContent
      }).select().single();
      if (error) throw error;
      setSelectedTemplateId(data.id);
      toast({
        title: "Success",
        description: "New template created successfully"
      });
      loadTemplatesAndSettings();
    } catch (err: any) {
      console.error('Error creating template:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to create template",
        variant: "destructive"
      });
    }
  };
  const handleSetDefault = async () => {
    if (!selectedTemplateId) {
      toast({
        title: "Error",
        description: "Please save the template first",
        variant: "destructive"
      });
      return;
    }
    try {
      await supabase.from('message_templates').update({
        is_default: false
      }).eq('org_id', organization!.id).eq('category', 'AVAILABILITY');
      const {
        error
      } = await supabase.from('message_templates').update({
        is_default: true
      }).eq('id', selectedTemplateId);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Template set as default"
      });
      loadTemplatesAndSettings();
    } catch (err: any) {
      console.error('Error setting default template:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to set default template",
        variant: "destructive"
      });
    }
  };
  const handleSendMessage = async () => {
    if (!whatsappGroup.trim()) {
      toast({
        title: "Error",
        description: "Please select a WhatsApp group",
        variant: "destructive"
      });
      return;
    }
    if (!templateContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message template",
        variant: "destructive"
      });
      return;
    }
    setSendingMessage(true);
    setSendResult(null);
    try {
      const renderedMessage = renderTemplate(templateContent);
      const {
        data,
        error
      } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          tenant_id: organization!.tenant_id,
          category: 'AVAILABILITY',
          whatsapp_group: whatsappGroup,
          message: renderedMessage,
          template_id: selectedTemplateId || null
        }
      });
      if (error) throw error;
      if (data.status === 'OK') {
        setSendResult({
          status: 'success',
          message: `Message sent to "${whatsappGroup}"` + (data.log_id ? ` (Log #${data.log_id})` : '')
        });
        toast({
          title: "Success",
          description: "Message sent to WhatsApp group"
        });
      } else {
        const resultStr = JSON.stringify(data.result || {});
        const isTimeout = resultStr.includes('timeout') || resultStr.includes('aborted');
        if (isTimeout) {
          setSendResult({
            status: 'success',
            message: `Message may have been sent (timeout occurred, please verify in WhatsApp)`
          });
          toast({
            title: "Warning",
            description: "Request timed out, but message may have been sent. Please check your WhatsApp group.",
            variant: "default"
          });
        } else {
          setSendResult({
            status: 'error',
            message: `Send failed: ${resultStr.substring(0, 120)}`
          });
          toast({
            title: "Error",
            description: "Failed to send message",
            variant: "destructive"
          });
        }
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setSendResult({
        status: 'error',
        message: err.message || 'Failed to send message'
      });
    } finally {
      setSendingMessage(false);
    }
  };

  // Premium card styling
  const cardClass = "bg-white/70 dark:bg-card/70 backdrop-blur-sm rounded-2xl shadow-lg border border-border/60 dark:border-white/[0.12] overflow-hidden";
  return <div className="relative space-y-8">
      {/* Page Header Banner */}
      <div className="relative -mx-8 -mt-8 px-8 py-10 mb-4 bg-gradient-to-r from-primary/20 via-purple-500/15 to-primary/10 dark:from-primary/15 dark:via-purple-500/10 dark:to-primary/8 border-b border-primary/15">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/50" />
        <div className="relative text-left">
          <h1 className="text-3xl font-bold text-foreground tracking-tight text-left">Court Availability</h1>
          <p className="text-muted-foreground mt-1.5 text-left">
            Find open courts and notify your members instantly.
          </p>
        </div>
      </div>

      {/* Section 1 – Search & Results */}
      <Card className={cardClass}>
        {/* Inline Search Bar */}
        <div className="p-4 border-b border-border/50 bg-muted/5 dark:bg-muted/10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10 dark:bg-accent/20">
                <Search className="h-4 w-4 text-accent" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-foreground whitespace-nowrap">Find Availability</h3>
            </div>
            
            <div className="flex items-center gap-2 flex-1">
              {(['today', 'tomorrow'] as const).map(preset => <Button key={preset} variant="outline" size="sm" onClick={() => setPreset(preset)} className={cn("rounded-full px-4 h-8 text-sm font-medium transition-all", activePreset === preset ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-700 shadow-sm" : "bg-background text-foreground hover:bg-muted hover:text-foreground border-border/50 hover:border-border")}>
                  {preset === 'today' ? 'Today' : 'Tomorrow'}
                </Button>)}
            </div>

            {error && <Alert variant="destructive" className="rounded-lg py-2 px-3 flex-shrink-0">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>}

            <Button onClick={handleSearch} disabled={loading} size="sm" className="h-8 gap-2 bg-primary/10 border border-primary text-primary hover:bg-primary/20 px-4 sm:ml-auto">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search Courts
            </Button>
          </div>
        </div>

        {/* Results Section - Full Width */}
        <div className="p-5">
          {/* Results header with badge inline */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              {summaryText ? dateDisplayShort || 'Results' : 'Results'}
            </h3>
            {countSlots > 0 && <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 font-semibold text-xs">
                {countSlots} Slots Available
              </Badge>}
          </div>

          {loading ? <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div> : summaryText ? <div className="bg-purple-50/40 dark:bg-purple-900/10 rounded-xl p-4 border border-purple-200/30 dark:border-purple-800/20">
              <pre className="font-mono text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed">
                {summaryText}
              </pre>
            </div> : <div className="flex items-center justify-center py-12 border-2 border-dashed border-muted-foreground/15 rounded-xl">
              <p className="text-sm text-muted-foreground/60">
                Court availability will appear here
              </p>
            </div>}
        </div>
      </Card>

      {/* Section 3 – Message Builder */}
      <Card className={cardClass}>
        <CardHeader className="pb-0">
          <div className="flex items-center gap-3 pb-4 border-b border-border/50">
            <div className="p-2 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
              <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
            </div>
            <CardTitle className="text-lg font-semibold">Message Template</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          {/* Template controls row - streamlined */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
            {/* Left: Template selector */}
            <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
              <SelectTrigger className="w-52 h-9 rounded-lg border-border/50 bg-background text-sm transition-colors hover:border-border">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map(template => <SelectItem key={template.id} value={template.id}>
                    <span className="flex items-center gap-2">
                      {template.name}
                      {template.is_default && <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />}
                    </span>
                  </SelectItem>)}
              </SelectContent>
            </Select>
            
            {/* Right: Name + Actions grouped */}
            <div className="flex items-center gap-1.5">
              <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Template name" className="w-40 h-9 rounded-lg border-border/50 bg-background text-sm transition-colors hover:border-border focus:border-primary" />
              
              <div className="h-6 w-px bg-border/50 mx-1.5" />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 px-3 text-xs font-medium rounded-lg transition-all hover:bg-muted/60 active:scale-[0.98]">
                    <Save className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
                    Save
                    <ChevronDown className="h-3.5 w-3.5 ml-1.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover min-w-[160px]">
                  <DropdownMenuItem onClick={handleSaveTemplate} disabled={!selectedTemplateId} className="text-sm">
                    <Save className="h-4 w-4 mr-2" strokeWidth={1.5} />
                    Update current
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSaveAsTemplate} className="text-sm">
                    <Plus className="h-4 w-4 mr-2" strokeWidth={1.5} />
                    Save as new...
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSetDefault} disabled={!selectedTemplateId} className="text-sm">
                    <Star className={`h-4 w-4 mr-2 ${templates.find(t => t.id === selectedTemplateId)?.is_default ? 'text-amber-500 fill-amber-500' : ''}`} strokeWidth={1.5} />
                    Set as default
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button variant="ghost" size="sm" onClick={handleNewTemplate} className="h-9 px-3 text-xs font-medium rounded-lg transition-all hover:bg-muted/60 active:scale-[0.98]">
                <Plus className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
                New
              </Button>
            </div>
          </div>

          {/* Subtle divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

          {/* Two-column layout: Editor + Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left side - Template editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="templateContent" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Content</Label>
                
              </div>
              <Textarea ref={textareaRef} id="templateContent" value={templateContent} onChange={e => setTemplateContent(e.target.value)} rows={8} placeholder="Enter your message template..." className="rounded-lg border-border/40 bg-background min-h-[180px] resize-none text-sm leading-relaxed" />
              {/* Token chips */}
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Insert</Label>
                <div className="flex flex-wrap gap-1.5">
                  {[{
                  token: '{{club_name}}',
                  label: 'club_name'
                }, {
                  token: '{{date_display_short}}',
                  label: 'date'
                }, {
                  token: '{{summary}}',
                  label: 'summary'
                }, {
                  token: '{{count_slots}}',
                  label: 'count'
                }, {
                  token: '{{sport}}',
                  label: 'sport'
                }].map(({
                  token,
                  label
                }) => <button key={token} onClick={() => insertToken(token)} className="text-xs rounded-full px-2.5 py-1 bg-muted/40 hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors">
                      {label}
                    </button>)}
                  <EmojiPicker onEmojiSelect={insertEmoji} />
                </div>
              </div>
            </div>

            {/* Right side - Live Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preview</Label>
                <span className="text-xs text-muted-foreground invisible">placeholder</span>
              </div>
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-lg min-h-[180px]">
                <div className="text-sm whitespace-pre-wrap text-foreground/85 leading-relaxed">
                  {summaryText ? renderTemplate(templateContent) : <span className="text-muted-foreground/50 italic">Run a search to preview with real data</span>}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 4 – Manual Send */}
      <Card className={cardClass}>
        <CardHeader className="pb-0">
          <div className="flex items-center gap-3 pb-4 border-b border-border/50">
            <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20">
              <Send className="h-4 w-4 text-primary" strokeWidth={1.5} />
            </div>
            <CardTitle className="text-lg font-semibold">Send Message</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 max-w-md space-y-2">
              <Label htmlFor="whatsappGroup" className="text-sm font-medium">WhatsApp Group</Label>
              <Input id="whatsappGroup" value={whatsappGroup} onChange={e => setWhatsappGroup(e.target.value)} placeholder="Group name" className="h-10 rounded-lg border-border/50 bg-white dark:bg-background" />
            </div>
            <Button onClick={handleSendMessage} disabled={sendingMessage || !whatsappGroup.trim() || !templateContent.trim()} className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground whitespace-nowrap">
              {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Message
            </Button>
          </div>

          {!orgSettings?.wa_group_availability && <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
              <Info className="h-3.5 w-3.5 flex-shrink-0" />
              Set up WhatsApp groups in Settings to enable sending
            </div>}

          {sendResult && <Alert variant={sendResult.status === 'success' ? 'default' : 'destructive'} className={`rounded-xl ${sendResult.status === 'success' ? 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30' : ''}`}>
              <AlertDescription className="flex items-center gap-2">
                {sendResult.status === 'success' ? '✅' : '❌'} {sendResult.message}
              </AlertDescription>
            </Alert>}
        </CardContent>
      </Card>

      {/* Scheduled Sends V2 */}
      <ScheduledSendsV2 templates={templates} defaultWhatsappGroup={orgSettings?.wa_group_availability} category="AVAILABILITY" />

      {/* Social Post Builder */}
      <SocialPostBuilder source="COURT_AVAILABILITY" pageData={{
      category: 'COURT_AVAILABILITY' as const,
      data: searchResults || [],
      variant: 'basic',
      target: 'TODAY' as const,
      tz: 'Europe/London',
      playtomicOffset: playtomicOffsetMinutes,
      clubName: (organization as any)?.club_name || organization?.name || 'Club',
      dateDisplayShort: dateDisplayShort || 'No date selected',
      sport: 'Padel',
      countSlots: countSlots
    }} summaryVariants={['basic']} onVariantChange={() => {}} />
    </div>;
}