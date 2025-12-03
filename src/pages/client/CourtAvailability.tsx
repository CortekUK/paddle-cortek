import { useState, useEffect, useRef } from 'react';
import { useOrganizationAuth } from '@/hooks/useOrganizationAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Search, Calendar, AlertCircle, Clock, Loader2, Copy, MessageSquare, Send, Settings, Plus, Save, Star, Eye, Hash } from 'lucide-react';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { useToast } from '@/hooks/use-toast';
import { ScheduledSendsV2 } from '@/components/client/ScheduledSendsV2';
import EmojiPicker from '@/components/client/EmojiPicker';
import { generateAvailabilitySummary } from '@/utils/playtomicAdminUtils';
import { SocialPostBuilder } from '@/components/social/SocialPostBuilder';

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
  const playtomicOffsetMinutes = 60; // Could be made configurable based on organization

  // Helper functions for wall-time math and formatting (copied from admin)
  const hhmmToMinutes = (timeStr: string): number => {
    const parts = timeStr.split(':').map(n => parseInt(n));
    return parts[0] * 60 + (parts[1] || 0);
  };

  const minutesToHHMM = (minutes: number): string => {
    const totalMins = minutes % 1440; // Wrap to 0-1439
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const addMinutesLocal = (timeStr: string, offsetMins: number): string => {
    const baseMins = hhmmToMinutes(timeStr);
    const adjustedMins = (baseMins + offsetMins + 1440) % 1440; // Handle negatives
    return minutesToHHMM(adjustedMins);
  };

  const formatCompactAmPm = (minutes: number): string => {
    const totalMins = ((minutes % 1440) + 1440) % 1440; // Wrap to 0–1439
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

  // Non-overlapping day-part boundaries (in minutes) - copied from admin
  const DAY_PART_BOUNDARIES = {
    morning: { start: 360, end: 720 }, // 06:00 - 12:00
    afternoon: { start: 720, end: 1020 }, // 12:00 - 17:00  
    evening: { start: 1020, end: 1380 } // 17:00 - 23:00
  };

  // Extract slots directly from raw JSON (copied from admin)
  const extractRawSlots = (data: any[]) => {
    if (!Array.isArray(data) || data.length === 0) return [];
    
    const slots = [];
    
    for (const item of data) {
      if (item.slots && Array.isArray(item.slots)) {
        // This is a resource with nested slots
        slots.push(...item.slots);
      } else if (item.start_time || item.startTime) {
        // This is a direct slot
        slots.push(item);
      }
    }
    
    return slots;
  };

  // Parse time from raw slot data with Playtomic offset (copied from admin)
  const parseSlotTime = (slot: any) => {
    let startTime = null;
    
    // Try different field combinations
    if (slot.start_date && slot.start_time) {
      startTime = slot.start_time; // Use just the time part (HH:MM format)
    } else if (slot.start_time) {
      startTime = slot.start_time;
    } else if (slot.startTime) {
      startTime = slot.startTime;
    }
    
    if (!startTime) return null;
    
    // Extract base time and apply Playtomic offset
    const baseTime = startTime.split(':').slice(0, 2).join(':'); // Get HH:MM
    const duration = slot.duration || slot.duration_minutes || slot.length || 90;
    
    // Apply offset to get adjusted times
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

  // Use admin logic for generating summary
  const generateSummary = (data: any[]) => {
    return generateAvailabilitySummary(data, playtomicOffsetMinutes);
  };

  // Generate friendly date display 
  const toShortDate = (from: Date, to: Date, tz = 'Europe/London') => {
    const f = formatInTimeZone(from, tz, 'EEE d LLL'); // Thu 4 Sep
    const t = formatInTimeZone(to, tz, 'EEE d LLL');
    return f === t ? f : `${f} – ${t}`;
  };

  // Preset functions for Today/Tomorrow buttons
  const setPreset = (preset: 'today' | 'tomorrow') => {
    const now = new Date();
    const targetDate = preset === 'today' ? now : addDays(now, 1);
    const timezone = 'Europe/London'; // Default timezone, could be made configurable
    
    const startOfDayLocal = formatInTimeZone(startOfDay(targetDate), timezone, 'yyyy-MM-dd\'T\'HH:mm:ss');
    const endOfDayLocal = formatInTimeZone(endOfDay(targetDate), timezone, 'yyyy-MM-dd\'T\'HH:mm:ss');
    
    setDateFrom(startOfDayLocal);
    setDateTo(endOfDayLocal);
  };

  // Load templates and settings on component mount
  useEffect(() => {
    if (organization?.id) {
      loadTemplatesAndSettings();
    }
  }, [organization?.id]);

  const loadTemplatesAndSettings = async () => {
    try {
      // Load templates from new message_templates table
      const { data: templatesData, error: templatesError } = await supabase
        .from('message_templates')
        .select('*')
        .eq('category', 'AVAILABILITY')
        .eq('org_id', organization!.id)
        .order('created_at', { ascending: false });

      if (templatesError) throw templatesError;
      
      setTemplates(templatesData || []);

      // Auto-select default template or show starter template
      const defaultTemplate = templatesData?.find(t => t.is_default);
      if (defaultTemplate) {
        setSelectedTemplateId(defaultTemplate.id);
        setTemplateName(defaultTemplate.name);
        setTemplateContent(defaultTemplate.content);
      } else if (templatesData?.length === 0) {
        // Show default starter template if no templates exist
        setTemplateName('');
        setTemplateContent(`*COURT AVAILABILITY @ {{club_name}}*
📅 {{date_display_short}}

{{summary}}

Book now — don't miss out!`);
      }

      // Load organization settings
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
      // Convert dates to ISO format with seconds precision
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);

      if (fromDate >= toDate) {
        setError('End date must be after start date');
        setLoading(false);
        return;
      }

      // Call the existing playtomic-fetch edge function
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

      // Store raw results and generate summary
      if (data?.raw && Array.isArray(data.raw)) {
        setSearchResults(data.raw);
        
        if (data.raw.length === 0) {
          setSummaryText('0 slots available for this day');
          setCountSlots(0);
        } else {
          // Count total slots across all resources
          const totalSlots = data.raw.reduce((count, resource) => {
            return count + (resource.slots?.length || 0);
          }, 0);
          
          setCountSlots(totalSlots);
          
          if (totalSlots === 0) {
            setSummaryText('0 slots available for this day');
          } else {
            // Generate enhanced summary using admin logic - pass the raw array directly
            const enhanced = generateSummary(data.raw);
            setSummaryText(enhanced);
          }
        }
      } else {
        setSummaryText('No availability data found');
        setCountSlots(0);
        setSearchResults([]);
      }

      // Generate friendly date display
      setDateDisplayShort(toShortDate(fromDate, toDate));

    } catch (err: any) {
      console.error('Availability search error:', err);
      setError(err.message || 'An error occurred while searching for availability');
    } finally {
      setLoading(false);
    }
  };

  // Template rendering helper
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

  // Token insertion
  const insertToken = (token: string) => {
    if (!textareaRef.current) return;
    
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = templateContent.substring(0, start);
    const after = templateContent.substring(end);
    
    setTemplateContent(before + token + after);
    
    // Move cursor after inserted token
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };

  // Emoji insertion
  const insertEmoji = (emoji: string) => {
    insertToken(emoji);
  };

  // Template management functions
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
        // Update existing template
        const { error } = await supabase
          .from('message_templates')
          .update(templateData)
          .eq('id', selectedTemplateId);
        if (error) throw error;
      } else {
        // Create new template
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

      // Reload templates
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

      // Reload templates
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
      // Clear all defaults for this org/category first
      await supabase
        .from('message_templates')
        .update({ is_default: false })
        .eq('org_id', organization!.id)
        .eq('category', 'AVAILABILITY');

      // Set this template as default
      const { error } = await supabase
        .from('message_templates')
        .update({ is_default: true })
        .eq('id', selectedTemplateId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Template set as default"
      });

      // Reload templates
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

  // Send message function
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
        // If timeout but message might have been sent, show warning instead of error
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Court Availability</h1>
        <p className="text-muted-foreground mt-1">
          Search for available courts and send WhatsApp notifications
        </p>
      </div>

      {/* 1. Find Availability (Compact) */}
      <Card className="bg-card shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Find Availability</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Today/Tomorrow buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreset('today')}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreset('tomorrow')}
              >
                Tomorrow
              </Button>
            </div>

            {/* Date range inputs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">From</Label>
                <Input
                  id="dateFrom"
                  type="datetime-local"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">To</Label>
                <Input
                  id="dateTo"
                  type="datetime-local"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            <Button 
              onClick={handleSearch} 
              disabled={loading}
              className="gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search Availability
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 2. Summary Preview (Read-only) */}
      <Card className="bg-card shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Summary Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-4 font-mono text-sm whitespace-pre-wrap">
            {summaryText ? (
              <>
                📅 {dateDisplayShort}
                {'\n'}
                {summaryText}
              </>
            ) : (
              <span className="text-muted-foreground">Run a search to preview availability</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Message Template */}
      <Card className="bg-card shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Message Template</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Template controls */}
            <div className="flex flex-wrap gap-2">
              <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} {template.is_default && <Star className="h-3 w-3 inline ml-1" />}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" onClick={handleSaveTemplate}>
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={handleSaveAsTemplate}>
                Save as...
              </Button>
              <Button variant="outline" size="sm" onClick={handleSetDefault} disabled={!selectedTemplateId}>
                <Star className="h-4 w-4 mr-1" />
                Set Default
              </Button>
              <Button variant="outline" size="sm" onClick={handleNewTemplate}>
                <Plus className="h-4 w-4 mr-1" />
                New
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left side - Template editor */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="templateName">Name</Label>
                  <Input
                    id="templateName"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Template name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="templateContent">Content</Label>
                  <Textarea
                    ref={textareaRef}
                    id="templateContent"
                    value={templateContent}
                    onChange={(e) => setTemplateContent(e.target.value)}
                    rows={8}
                    placeholder="Enter your message template..."
                  />
                  <div className="text-xs text-muted-foreground">
                    {templateContent.length} characters
                  </div>
                </div>

                {/* Token chips and emoji picker */}
                <div className="space-y-2">
                  <Label className="text-sm">Insert tokens:</Label>
                  <div className="flex flex-wrap gap-2">
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
                        className="text-xs"
                      >
                        <Hash className="h-3 w-3 mr-1" />
                        {token}
                      </Button>
                    ))}
                    <EmojiPicker onEmojiSelect={insertEmoji} />
                  </div>
                </div>
              </div>

              {/* Right side - Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Live Preview</Label>
                  <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
                <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg max-w-sm">
                  <div className="font-mono text-sm whitespace-pre-wrap">
                    {summaryText ? renderTemplate(templateContent) : (
                      <span className="text-muted-foreground">Run a search to preview with real data</span>
                    )}
                  </div>
                </div>
                {!summaryText && templateContent && (
                  <div className="text-xs text-muted-foreground mt-2">
                    💡 Add {`{{summary}}`} to include the breakdown
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Send (Manual) */}
      <Card className="bg-card shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Send</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsappGroup">WhatsApp Group</Label>
              <Input
                id="whatsappGroup"
                value={whatsappGroup}
                onChange={(e) => setWhatsappGroup(e.target.value)}
                placeholder="Group name"
              />
              {!orgSettings?.wa_group_availability && (
                <div className="text-xs text-muted-foreground">
                  Set up WhatsApp groups in Settings to enable sending
                </div>
              )}
            </div>

            <Button 
              onClick={handleSendMessage}
              disabled={sendingMessage || !whatsappGroup.trim() || !templateContent.trim()}
              className="gap-2"
            >
              {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Message
            </Button>

            {sendResult && (
              <Alert variant={sendResult.status === 'success' ? 'default' : 'destructive'}>
                <AlertDescription>
                  {sendResult.status === 'success' ? '✅' : '❌'} {sendResult.message}
                </AlertDescription>
              </Alert>
            )}
          </div>
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
          tz: 'Europe/London', // Default timezone - could be made configurable
          playtomicOffset: playtomicOffsetMinutes,
          clubName: (organization as any)?.club_name || organization?.name || 'Club',
          dateDisplayShort: dateDisplayShort || 'No date selected',
          sport: 'Padel',
          countSlots: countSlots
        }}
        summaryVariants={['basic']}
        onVariantChange={() => {}} // No variant change needed for court availability
      />
    </div>
  );
}