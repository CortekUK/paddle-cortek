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
import { generateTournamentSummary, formatTournamentDateTime, getPlayerCapacity } from '@/utils/playtomicAdminUtils';
import { SocialPostBuilder } from '@/components/social/SocialPostBuilder';

export default function CompetitionsAcademies() {
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
  const defaultToDate = format(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm:ss"); // 7 days

  const [dateFrom, setDateFrom] = useState(defaultFromDate);
  const [dateTo, setDateTo] = useState(defaultToDate);

  // Selected tournament/event state
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventsList, setEventsList] = useState<any[]>([]);

  // Use admin tournament summary with Playtomic offset
  const generateTournamentSummaryWithAdmin = (tournament: any) => {
    return generateTournamentSummary(tournament, 60); // Use 60min offset like admin
  };

  // Use admin logic for competitions & academies summary
  const generateCompetitionsSummary = (
    tournamentsData: any[],
    lessonsData: any[],
    classesData: any[],
    eventOverride: any = selectedEvent
  ) => {
    // Combine all events
    const allEvents = [
      ...tournamentsData.map(event => ({ ...event, type: 'tournament' })),
      ...lessonsData.map(event => ({ ...event, type: 'lesson' })),
      ...classesData.map(event => ({ ...event, type: 'class' }))
    ];

    if (allEvents.length === 0) {
      return 'No competitions or academies available';
    }

    // If specific event is selected, show only that one
    if (eventOverride) {
      return generateTournamentSummaryWithAdmin(eventOverride);
    }

    // Otherwise show all events with headers
    const eventSummaries = allEvents.map(event => generateTournamentSummaryWithAdmin(event));
    return eventSummaries.join('\n\n---\n\n');
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
      // Load templates from message_templates table
      const { data: templatesData, error: templatesError } = await supabase
        .from('message_templates')
        .select('*')
        .eq('category', 'COMPETITIONS_ACADEMIES')
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
        setTemplateContent(`*COMPETITIONS & ACADEMIES @ {{club_name}}*
📅 {{date_display_short}}

{{summary}}

Register now - spaces are limited!`);
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
        setWhatsappGroup(settingsData?.wa_group_competitions || '');
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

      // Fetch tournaments, lessons, and classes in parallel
      const [tournamentsResponse, lessonsResponse, classesResponse] = await Promise.all([
        supabase.functions.invoke('playtomic-fetch', {
          body: {
            endpoint: 'tournaments',
            tenant_id: organization.tenant_id,
            sport_id: 'PADEL',
            start_min: fromDate.toISOString(),
            start_max: toDate.toISOString()
          }
        }),
        supabase.functions.invoke('playtomic-fetch', {
          body: {
            endpoint: 'lessons',
            tenant_id: organization.tenant_id,
            sport_id: 'PADEL',
            start_min: fromDate.toISOString(),
            start_max: toDate.toISOString()
          }
        }),
        supabase.functions.invoke('playtomic-fetch', {
          body: {
            endpoint: 'classes',
            tenant_id: organization.tenant_id,
            sport_id: 'PADEL',
            start_min: fromDate.toISOString(),
            start_max: toDate.toISOString()
          }
        })
      ]);

      // Check for errors
      if (tournamentsResponse.error) throw new Error(tournamentsResponse.error.message);
      if (lessonsResponse.error) throw new Error(lessonsResponse.error.message);
      if (classesResponse.error) throw new Error(classesResponse.error.message);

      const tournamentsData = tournamentsResponse.data?.raw || [];
      const lessonsData = lessonsResponse.data?.raw || [];
      const classesData = classesResponse.data?.raw || [];

      // Combine all results
      const allResults = [
        ...tournamentsData.map((item: any) => ({ ...item, type: 'tournament' })),
        ...lessonsData.map((item: any) => ({ ...item, type: 'lesson' })),
        ...classesData.map((item: any) => ({ ...item, type: 'class' }))
      ];

      setSearchResults(allResults);
      setEventsList(allResults);
      setCountSlots(allResults.length);
      setSummaryText(generateCompetitionsSummary(tournamentsData, lessonsData, classesData, selectedEvent));

      // Generate friendly date display
      setDateDisplayShort(toShortDate(fromDate, toDate));

    } catch (err: any) {
      console.error('Competitions & academies search error:', err);
      setError(err.message || 'An error occurred while searching for competitions and academies');
    } finally {
      setLoading(false);
    }
  };

  // Template rendering helper
  const renderTemplate = (template: string): string => {
    if (!template) return '';
    
    // Replace template tokens with actual values
    let rendered = template
      .replace(/\{\{summary\}\}/g, summaryText || 'No competitions or academies available')
      .replace(/\{\{date_display_short\}\}/g, dateDisplayShort || '')
      .replace(/\{\{club_name\}\}/g, organization?.club_name || organization?.name || 'Club')
      .replace(/\{\{sport\}\}/g, 'Padel')
      .replace(/\{\{count_slots\}\}/g, countSlots.toString());
    
    return rendered;
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
      // Auto-load saved configuration
      if (template.linked_event_id) {
        const found = eventsList.find(e => (e.tournament_id || e.id) === template.linked_event_id);
        if (found) setSelectedEvent(found);
      }
      if (template.whatsapp_group) setWhatsappGroup(template.whatsapp_group);
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
        category: 'COMPETITIONS_ACADEMIES',
        name: templateName,
        content: templateContent,
        module: 'COMPETITIONS_ACADEMIES',
        summary_variant: null,
        linked_event_id: selectedEvent ? (selectedEvent.tournament_id || selectedEvent.id || null) : null,
        whatsapp_group: whatsappGroup
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

      // Reload templates
      await loadTemplatesAndSettings();

      toast({
        title: "Success",
        description: selectedTemplateId ? "Template updated" : "Template created",
      });

    } catch (err: any) {
      console.error('Error saving template:', err);
      toast({
        title: "Error", 
        description: "Failed to save template",
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
      // Unset all defaults for this category and org
      await supabase
        .from('message_templates')
        .update({ is_default: false })
        .eq('category', 'COMPETITIONS_ACADEMIES')
        .eq('org_id', organization!.id);

      // Set this template as default
      const { error } = await supabase
        .from('message_templates')
        .update({ is_default: true })
        .eq('id', selectedTemplateId);

      if (error) throw error;

      // Reload templates
      await loadTemplatesAndSettings();

      toast({
        title: "Success",
        description: "Template set as default",
      });

    } catch (err: any) {
      console.error('Error setting default template:', err);
      toast({
        title: "Error",
        description: "Failed to set default template",
        variant: "destructive"
      });
    }
  };

  const handleSendMessage = async () => {
    if (!whatsappGroup.trim()) {
      toast({
        title: "Error",
        description: "Please enter a WhatsApp group name",
        variant: "destructive"
      });
      return;
    }

    if (!summaryText) {
      toast({
        title: "Error", 
        description: "Please search for competitions and academies first",
        variant: "destructive"
      });
      return;
    }

    setSendingMessage(true);
    setSendResult(null);

    try {
      const message = renderTemplate(templateContent);

      const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
        body: {
          tenant_id: organization?.tenant_id,
          category: 'COMPETITIONS_ACADEMIES',
          whatsapp_group: whatsappGroup,
          message: message,
          template_id: selectedTemplateId || null
        }
      });

      if (error) throw error;

      // Check if message was sent (status OK) even if there was a timeout
      if (data?.status === 'OK') {
        setSendResult({ status: 'success', message: 'Message sent successfully to WhatsApp!' });
        toast({
          title: "Success",
          description: "Message sent to WhatsApp group",
        });
      } else {
        // If timeout but message might have been sent, show warning instead of error
        const isTimeout = data?.result?.error?.includes('timeout') || data?.result?.error?.includes('aborted');
        if (isTimeout) {
          setSendResult({ status: 'success', message: 'Message may have been sent (timeout occurred, please verify in WhatsApp)' });
          toast({
            title: "Warning",
            description: "Request timed out, but message may have been sent. Please check your WhatsApp group.",
            variant: "default"
          });
        } else {
          setSendResult({ status: 'error', message: data?.result?.error || data?.message || 'Failed to send message' });
          toast({
            title: "Error",
            description: data?.result?.error || data?.message || "Failed to send message",
            variant: "destructive"
          });
        }
      }

    } catch (err: any) {
      console.error('Error sending message:', err);
      const errorMessage = err.message || 'An error occurred while sending the message';
      setSendResult({ status: 'error', message: errorMessage });
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Competitions & Academies</h1>
        <p className="text-muted-foreground mt-1">
          Find and share tournaments, lessons, and training programs
        </p>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Competitions & Academies
          </CardTitle>
          <CardDescription>
            Find tournaments, lessons, and classes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Picks */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreset('today')}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreset('tomorrow')}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              Tomorrow
            </Button>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">From Date & Time</Label>
              <Input
                id="dateFrom"
                type="datetime-local"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">To Date & Time</Label>
              <Input
                id="dateTo"
                type="datetime-local"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={handleSearch} disabled={loading} className="w-full gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? 'Searching...' : 'Search Competitions & Academies'}
          </Button>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results Summary */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5" />
              Summary ({countSlots} events)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Events List</Label>
              <div className="max-h-32 overflow-y-auto border rounded-md">
                <div className="p-2">
                  {eventsList.map((event, index) => {
                    const name = event.tournament_name || event.name || event.title || 'Untitled';
                    const dateTime = formatTournamentDateTime(event, 60); // Use 60min offset
                    const capacity = getPlayerCapacity(event);
                    const isSelected = selectedEvent === event;
                    
                    return (
                      <div
                        key={index}
                        className={`p-2 cursor-pointer rounded hover:bg-muted/50 ${isSelected ? 'bg-muted' : ''}`}
                        onClick={() => {
                          const willBeSelected = selectedEvent !== event;
                          const newSelectedEvent = willBeSelected ? event : null;
                          setSelectedEvent(newSelectedEvent);
                          
                          // Update summary and count based on selection
                          if (newSelectedEvent) {
                            // Event selected - show only that event
                            const newSummary = generateTournamentSummaryWithAdmin(newSelectedEvent);
                            setSummaryText(newSummary);
                            setCountSlots(1); // Only one event selected
                          } else {
                            // Event deselected - show all events
                            const newSummary = generateCompetitionsSummary(
                              eventsList.filter(e => e.type === 'tournament'),
                              eventsList.filter(e => e.type === 'lesson'),
                              eventsList.filter(e => e.type === 'class'),
                              null
                            );
                            setSummaryText(newSummary);
                            setCountSlots(eventsList.length); // All events
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-sm font-medium">{name}</div>
                            <div className="text-xs text-muted-foreground">{dateTime.date} at {dateTime.time}</div>
                          </div>
                          {capacity.display && (
                            <Badge 
                              variant={capacity.full ? "default" : "secondary"}
                              className={`ml-2 ${capacity.full ? "bg-green-600 hover:bg-green-700" : ""}`}
                            >
                              {capacity.display}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Message Preview</Label>
              <div className="p-4 bg-muted rounded-md border">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {summaryText || 'No summary available'}
                </pre>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (summaryText) {
                    navigator.clipboard.writeText(summaryText);
                    toast({
                      title: "Copied to clipboard",
                      description: "Summary copied successfully",
                    });
                  }
                }}
                disabled={!summaryText}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Summary
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                <Eye className="h-4 w-4 mr-2" />
                {showPreview ? 'Hide' : 'Show'} Preview
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message Builder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Message Builder
          </CardTitle>
          <CardDescription>
            Create and customize your competitions & academies message
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Template Selection */}
          <div className="flex gap-2">
            <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      {template.name}
                      {template.is_default && <Star className="h-3 w-3 text-yellow-500" />}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleNewTemplate}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Template Name */}
          <div className="space-y-2">
            <Label htmlFor="templateName">Template Name</Label>
            <Input
              id="templateName"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Enter template name"
            />
          </div>

          {/* Template Content */}
          <div className="space-y-2">
            <Label htmlFor="templateContent">Message Content</Label>
            <Textarea
              ref={textareaRef}
              id="templateContent"
              value={templateContent}
              onChange={(e) => setTemplateContent(e.target.value)}
              placeholder="Enter your message template..."
              rows={8}
            />
          </div>

          {/* Token Insertion */}
          <div className="space-y-2">
            <Label>Insert Tokens</Label>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => insertToken('{{summary}}')}>
                <Hash className="h-3 w-3 mr-1" />summary
              </Button>
              <Button variant="outline" size="sm" onClick={() => insertToken('{{date_display_short}}')}>
                <Hash className="h-3 w-3 mr-1" />date
              </Button>
              <Button variant="outline" size="sm" onClick={() => insertToken('{{club_name}}')}>
                <Hash className="h-3 w-3 mr-1" />club
              </Button>
              <Button variant="outline" size="sm" onClick={() => insertToken('{{sport}}')}>
                <Hash className="h-3 w-3 mr-1" />sport
              </Button>
              <Button variant="outline" size="sm" onClick={() => insertToken('{{count_slots}}')}>
                <Hash className="h-3 w-3 mr-1" />count
              </Button>
            </div>
          </div>

          {/* Emoji Picker */}
          <EmojiPicker onEmojiSelect={insertEmoji} />

          {/* Template Actions */}
          <div className="flex gap-2">
            <Button onClick={handleSaveTemplate} variant="outline" className="gap-2">
              <Save className="h-4 w-4" />
              Save Template
            </Button>
            {selectedTemplateId && (
              <Button onClick={handleSetDefault} variant="outline" className="gap-2">
                <Star className="h-4 w-4" />
                Set Default
              </Button>
            )}
            <Button
              onClick={() => setShowPreview(!showPreview)}
              variant="outline"
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              {showPreview ? 'Hide' : 'Show'} Preview
            </Button>
          </div>

          {/* Live Preview */}
          {showPreview && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="bg-muted p-4 rounded-md whitespace-pre-wrap font-mono text-sm">
                {renderTemplate(templateContent)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instant Send */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Message
          </CardTitle>
          <CardDescription>
            Send your message instantly to WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="whatsappGroup">WhatsApp Group</Label>
            <Input
              id="whatsappGroup"
              value={whatsappGroup}
              onChange={(e) => setWhatsappGroup(e.target.value)}
              placeholder="Enter WhatsApp group name"
            />
            {!whatsappGroup && (
              <p className="text-xs text-muted-foreground">
                Configure the default group in{' '}
                <Button variant="link" className="p-0 h-auto text-xs" onClick={() => window.location.href = '/client/settings'}>
                  Settings
                </Button>
              </p>
            )}
          </div>

          <Button 
            onClick={handleSendMessage} 
            disabled={sendingMessage || !summaryText}
            className="w-full gap-2"
          >
            {sendingMessage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {sendingMessage ? 'Sending...' : 'Send Message'}
          </Button>

          {sendResult && (
            <Alert variant={sendResult.status === 'success' ? 'default' : 'destructive'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{sendResult.message}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Scheduled Sends */}
      {organization && (
        <ScheduledSendsV2 
          templates={templates}
          defaultWhatsappGroup={whatsappGroup}
          category="COMPETITIONS_ACADEMIES"
        />
      )}

      {/* Social Post Builder */}
      <SocialPostBuilder
        source="COMPETITIONS"
        pageData={{
          category: 'COMPETITIONS',
          data: selectedEvent
            ? (searchResults || []).filter(event => {
                const eventId = event.tournament_id || event.id || event.tournamentId;
                const selectedId = selectedEvent.tournament_id || selectedEvent.id || selectedEvent.tournamentId;
                return eventId === selectedId || String(eventId) === String(selectedId);
              })
            : (searchResults || []),
          variant: 'basic',
          target: 'TODAY',
          tz: 'Europe/London',
          playtomicOffset: 60,
          clubName: (organization as any)?.club_name || organization?.name || 'Club',
          dateDisplayShort: dateDisplayShort || '',
          sport: 'Padel',
          countSlots: selectedEvent ? 1 : countSlots, // Use 1 if event is selected, otherwise total count
          eventId: selectedEvent ? (selectedEvent.tournament_id || selectedEvent.id || null) : null,
          selectedVariant: 'basic'
        }}
        summaryVariants={['basic']}
        onVariantChange={() => {}}
      />
    </div>
  );
}