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
import { Search, Calendar as CalendarIcon, AlertCircle, Loader2, MessageSquare, Send, Plus, Save, Star, Eye, Hash, FileText, Clock, ChevronRight } from 'lucide-react';
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
  const { organization } = useOrganizationAuth();
  const { toast } = useToast();
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
  const [sendResult, setSendResult] = useState<{ status: string; message: string } | null>(null);
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
    const totalMins = ((minutes % 1440) + 1440) % 1440;
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
    morning: { start: 360, end: 720 },
    afternoon: { start: 720, end: 1020 },
    evening: { start: 1020, end: 1380 }
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
      targetEnd = endOfWeek(now, { weekStartsOn: 1 });
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
      const { data: templatesData, error: templatesError } = await supabase
        .from('message_templates')
        .select('*')
        .eq('category', 'AVAILABILITY')
        .eq('org_id', organization!.id)
        .order('created_at', { ascending: false });

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

      const { data: settingsData, error: settingsError } = await supabase
        .from('org_automation_settings')
        .select('*')
        .eq('org_id', organization!.id)
        .single();

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

      const { data, error: fetchError } = await supabase.functions.invoke('playtomic-fetch', {
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
        const { error } = await supabase
          .from('message_templates')
          .update(templateData)
          .eq('id', selectedTemplateId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('message_templates')
          .insert(templateData)
          .select()
          .single();
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
      const { data, error } = await supabase
        .from('message_templates')
        .insert({
          org_id: organization!.id,
          category: 'AVAILABILITY',
          name: templateName,
          content: templateContent
        })
        .select()
        .single();

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
      await supabase
        .from('message_templates')
        .update({ is_default: false })
        .eq('org_id', organization!.id)
        .eq('category', 'AVAILABILITY');

      const { error } = await supabase
        .from('message_templates')
        .update({ is_default: true })
        .eq('id', selectedTemplateId);

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

      const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
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
          description: "Message sent to WhatsApp group",
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
  const cardClass = "bg-white/70 dark:bg-card/70 backdrop-blur-sm rounded-2xl shadow-lg border border-border/40 dark:border-white/[0.08] overflow-hidden";

  return (
    <div className="relative space-y-8">
      {/* Page Header Banner */}
      <div className="relative -mx-4 -mt-4 px-8 py-10 mb-4 bg-gradient-to-r from-primary/20 via-purple-500/15 to-primary/10 dark:from-primary/15 dark:via-purple-500/10 dark:to-primary/8 border-b border-primary/15">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/50" />
        <div className="relative text-left">
          <h1 className="text-3xl font-bold text-foreground tracking-tight text-left">Court Availability</h1>
          <p className="text-muted-foreground mt-1.5 text-left">
            Find open courts and notify your members instantly.
          </p>
        </div>
      </div>

      {/* Section 1 – Search & Results Side-by-Side */}
      <Card className={cardClass}>
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr]">
          {/* Left Panel - Search Controls */}
          <div className="p-5 lg:border-r-2 border-border bg-muted/5 dark:bg-muted/10 flex flex-col min-h-[280px]">
            <h3 className="text-sm font-semibold text-foreground mb-4">Find Availability</h3>
            
            {/* Preset pills */}
            <div className="flex gap-2 mb-4">
              {(['today', 'tomorrow'] as const).map((preset) => (
                <Button
                  key={preset}
                  variant="outline"
                  size="sm"
                  onClick={() => setPreset(preset)}
                  className={cn(
                    "rounded-full px-4 h-9 text-sm font-medium transition-all flex-1",
                    activePreset === preset
                      ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-sm"
                      : "bg-background hover:bg-muted/60 border-border/50"
                  )}
                >
                  {preset === 'today' ? 'Today' : 'Tomorrow'}
                </Button>
              ))}
            </div>

            {/* Date range selector */}
            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-9 flex-1 px-3 justify-start text-left font-normal border-border/50 bg-background hover:bg-muted/40",
                        !fromDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      {fromDate ? format(fromDate, "MMM d, yyyy") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fromDate}
                      onSelect={handleFromDateSelect}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-9 flex-1 px-3 justify-start text-left font-normal border-border/50 bg-background hover:bg-muted/40",
                        !toDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                      {toDate ? format(toDate, "MMM d, yyyy") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={toDate}
                      onSelect={handleToDateSelect}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="rounded-xl mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Spacer to push button to bottom */}
            <div className="flex-1" />

            {/* Search button */}
            <Button
              onClick={handleSearch}
              disabled={loading}
              className="w-full h-10 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search Courts
            </Button>
          </div>

          {/* Right Panel - Results Display */}
          <div className="p-5 min-h-[280px]">
            {/* Results header with badge - centered */}
            <div className="flex flex-col items-center justify-center mb-4">
              <h3 className="text-sm font-semibold text-foreground">
                {summaryText ? (dateDisplayShort || 'Results') : 'Results'}
              </h3>
              {countSlots > 0 && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-0 font-semibold text-xs mt-1">
                  {countSlots} slots available
                </Badge>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : summaryText ? (
              <div className="bg-muted/20 dark:bg-muted/10 rounded-xl p-4 border border-border/30">
                <pre className="font-mono text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed">
                  {summaryText}
                </pre>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12 border-2 border-dashed border-muted-foreground/15 rounded-xl mx-2">
                <p className="text-sm text-muted-foreground/60">
                  Court availability will appear here
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Section 3 – Message Builder */}
      <Card className={cardClass}>
        <CardHeader className="pb-0">
          <div className="flex items-center gap-3 pb-4 border-b border-border/30">
            <div className="p-2 rounded-lg bg-muted/50 dark:bg-muted/30">
              <MessageSquare className="h-4 w-4 text-primary" strokeWidth={1.5} />
            </div>
            <CardTitle className="text-lg font-semibold">Message Template</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          {/* Template controls row */}
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
              <SelectTrigger className="w-48 h-10 rounded-lg border-border/50 bg-white dark:bg-background">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} {template.is_default && <Star className="h-3 w-3 inline ml-1 text-amber-500" />}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" onClick={handleSaveTemplate} className="rounded-lg border-border/50 hover:bg-primary/10">
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={handleSaveAsTemplate} className="rounded-lg border-border/50 hover:bg-primary/10">
                Save as...
              </Button>
              <Button variant="outline" size="sm" onClick={handleSetDefault} disabled={!selectedTemplateId} className="rounded-lg border-border/50 hover:bg-primary/10">
                <Star className="h-4 w-4 mr-1" />
                Set Default
              </Button>
              <Button variant="outline" size="sm" onClick={handleNewTemplate} className="rounded-lg border-border/50 hover:bg-primary/10">
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </div>
          </div>

          {/* Two-column layout: Editor + Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left side - Template editor */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="templateName" className="text-sm font-medium">Name</Label>
                <Input
                  id="templateName"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name"
                  className="h-10 rounded-lg border-border/50 bg-white dark:bg-background"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="templateContent" className="text-sm font-medium">Content</Label>
                <Textarea
                  ref={textareaRef}
                  id="templateContent"
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                  rows={8}
                  placeholder="Enter your message template..."
                  className="rounded-lg border-border/50 bg-white dark:bg-background min-h-[160px] resize-none"
                />
                <div className="text-xs text-muted-foreground">
                  {templateContent.length} characters
                </div>
              </div>

              {/* Token chips and emoji picker */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Insert tokens:</Label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '{{club_name}}',
                    '{{date_display_short}}', 
                    '{{summary}}',
                    '{{count_slots}}',
                    '{{sport}}'
                  ].map((token) => (
                    <Button
                      key={token}
                      variant="outline"
                      size="sm"
                      onClick={() => insertToken(token)}
                      className="text-xs rounded-full px-3 py-1 h-7 bg-muted/30 hover:bg-primary/10 hover:text-primary border-border/50"
                    >
                      <Hash className="h-3 w-3 mr-1" />
                      {token}
                    </Button>
                  ))}
                  <EmojiPicker onEmojiSelect={insertEmoji} />
                </div>
              </div>
            </div>

            {/* Right side - Live Preview */}
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground">Live Preview</Label>
              <div className="bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30 p-5 rounded-xl min-h-[200px]">
                <div className="font-mono text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed">
                  {summaryText ? renderTemplate(templateContent) : (
                    <span className="text-muted-foreground/60 italic">Run a search to preview with real data</span>
                  )}
                </div>
              </div>
              {!summaryText && templateContent && (
                <div className="text-xs text-muted-foreground">
                  💡 Add {`{{summary}}`} to include the breakdown
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 4 – Manual Send */}
      <Card className={cardClass}>
        <CardHeader className="pb-0">
          <div className="flex items-center gap-3 pb-4 border-b border-border/30">
            <div className="p-2 rounded-lg bg-muted/50 dark:bg-muted/30">
              <Send className="h-4 w-4 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Send Message</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Send a one-time availability update.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="whatsappGroup" className="text-sm font-medium">WhatsApp Group</Label>
              <Input
                id="whatsappGroup"
                value={whatsappGroup}
                onChange={(e) => setWhatsappGroup(e.target.value)}
                placeholder="Group name"
                className="h-10 rounded-lg border-border/50 bg-white dark:bg-background"
              />
            </div>
            <Button 
              onClick={handleSendMessage}
              disabled={sendingMessage || !whatsappGroup.trim() || !templateContent.trim()}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground whitespace-nowrap"
            >
              {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Message
            </Button>
          </div>

          {!orgSettings?.wa_group_availability && (
            <div className="text-xs text-muted-foreground">
              Set up WhatsApp groups in Settings to enable sending
            </div>
          )}

          {sendResult && (
            <Alert 
              variant={sendResult.status === 'success' ? 'default' : 'destructive'} 
              className={`rounded-xl ${sendResult.status === 'success' ? 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30' : ''}`}
            >
              <AlertDescription className="flex items-center gap-2">
                {sendResult.status === 'success' ? '✅' : '❌'} {sendResult.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Scheduled Sends V2 */}
      <ScheduledSendsV2 
        templates={templates} 
        defaultWhatsappGroup={orgSettings?.wa_group_availability}
        category="AVAILABILITY"
      />

      {/* Social Post Builder */}
      <SocialPostBuilder
        source="COURT_AVAILABILITY"
        pageData={{
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
        }}
        summaryVariants={['basic']}
        onVariantChange={() => {}}
      />
    </div>
  );
}
