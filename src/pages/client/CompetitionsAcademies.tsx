import { useState, useEffect, useRef } from 'react';
import { useOrganizationAuth } from '@/hooks/useOrganizationAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { Search, AlertCircle, Loader2, Copy, MessageSquare, Send, Plus, Star, Hash, ChevronDown, Trophy, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format, addDays, startOfDay, endOfDay } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { useToast } from '@/hooks/use-toast';
import { ScheduledSendsV2 } from '@/components/client/ScheduledSendsV2';
import EmojiPicker from '@/components/client/EmojiPicker';
import { generateTournamentSummary, formatTournamentDateTime, getPlayerCapacity } from '@/utils/playtomicAdminUtils';
import { SocialPostBuilder } from '@/components/social/SocialPostBuilder';
import { cn } from '@/lib/utils';

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

  // Selected events state (multiple selection)
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [eventsList, setEventsList] = useState<any[]>([]);

  // Helper to get event ID
  const getEventId = (event: any) => event.tournament_id || event.id || event.tournamentId || '';

  // Use admin tournament summary with Playtomic offset
  const generateTournamentSummaryWithAdmin = (tournament: any) => {
    return generateTournamentSummary(tournament, 60); // Use 60min offset like admin
  };

  // Use admin logic for competitions & academies summary
  const generateCompetitionsSummary = (
    allEvents: any[],
    selectedIds?: Set<string>
  ) => {
    if (allEvents.length === 0) {
      return 'No competitions or academies available';
    }

    // If specific events are selected, filter to only those
    const eventsToSummarize = selectedIds && selectedIds.size > 0
      ? allEvents.filter(event => selectedIds.has(getEventId(event)))
      : allEvents;

    if (eventsToSummarize.length === 0) {
      return 'No events selected';
    }

    const eventSummaries = eventsToSummarize.map(event => generateTournamentSummaryWithAdmin(event));
    return eventSummaries.join('\n\n---\n\n');
  };

  // Update summary when selection changes
  const updateSummaryFromSelection = (newSelectedIds: Set<string>) => {
    const newSummary = generateCompetitionsSummary(eventsList, newSelectedIds);
    setSummaryText(newSummary);
    setCountSlots(newSelectedIds.size > 0 ? newSelectedIds.size : eventsList.length);
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
      setSelectedEventIds(new Set()); // Reset selection on new search
      setCountSlots(allResults.length);
      setSummaryText(generateCompetitionsSummary(allResults));

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
        if (found) {
          const newIds = new Set([getEventId(found)]);
          setSelectedEventIds(newIds);
          updateSummaryFromSelection(newIds);
        }
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
        linked_event_id: selectedEventIds.size === 1 ? Array.from(selectedEventIds)[0] : null,
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

  const cardClass = "bg-white/70 dark:bg-card/70 backdrop-blur-sm rounded-2xl shadow-lg border border-border/60 dark:border-white/[0.12] overflow-hidden";

  // Determine active preset
  const getActivePreset = () => {
    const now = new Date();
    const todayStart = format(startOfDay(now), "yyyy-MM-dd'T'HH:mm:ss");
    const todayEnd = format(endOfDay(now), "yyyy-MM-dd'T'HH:mm:ss");
    const tomorrowStart = format(startOfDay(addDays(now, 1)), "yyyy-MM-dd'T'HH:mm:ss");
    const tomorrowEnd = format(endOfDay(addDays(now, 1)), "yyyy-MM-dd'T'HH:mm:ss");
    
    if (dateFrom === todayStart && dateTo === todayEnd) return 'today';
    if (dateFrom === tomorrowStart && dateTo === tomorrowEnd) return 'tomorrow';
    return null;
  };

  const activePreset = getActivePreset();

  const handleSaveAsTemplate = async () => {
    if (!templateContent.trim()) {
      toast({
        title: "Error",
        description: "Template content cannot be empty",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('message_templates')
        .insert({
          org_id: organization!.id,
          category: 'COMPETITIONS_ACADEMIES',
          name: templateName || `Template ${new Date().toLocaleDateString()}`,
          content: templateContent,
          module: 'COMPETITIONS_ACADEMIES',
          summary_variant: null,
          linked_event_id: selectedEventIds.size === 1 ? Array.from(selectedEventIds)[0] : null,
          whatsapp_group: whatsappGroup
        })
        .select()
        .single();

      if (error) throw error;
      setSelectedTemplateId(data.id);
      await loadTemplatesAndSettings();

      toast({
        title: "Success",
        description: "Template saved as new",
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

  return (
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="relative -mx-8 -mt-8 px-8 py-10 mb-4 bg-gradient-to-r from-primary/20 via-purple-500/15 to-primary/10 dark:from-primary/15 dark:via-purple-500/10 dark:to-primary/8 border-b border-primary/15">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/50" />
        <div className="relative text-left">
          <h1 className="text-3xl font-bold text-foreground tracking-tight text-left">Competitions & Academies</h1>
          <p className="text-muted-foreground mt-1.5 text-left">
            Find and share tournaments, lessons, and training programs
          </p>
        </div>
      </div>

      {/* Find Events & Results */}
      <Card className={cardClass}>
        <CardHeader className="pb-4 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
                <Trophy className="h-4 w-4 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
              </div>
              <CardTitle className="text-lg font-semibold">
                Find Events
                {searchResults.length > 0 && (
                  <span className="ml-2 text-muted-foreground font-normal">({countSlots} results)</span>
                )}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreset('today')}
                className={cn(
                  "rounded-full px-4 h-8 text-sm font-medium transition-all",
                  activePreset === 'today'
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-700 shadow-sm"
                    : "bg-background text-foreground hover:bg-muted hover:text-foreground border-border/50 hover:border-border"
                )}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreset('tomorrow')}
                className={cn(
                  "rounded-full px-4 h-8 text-sm font-medium transition-all",
                  activePreset === 'tomorrow'
                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-700 shadow-sm"
                    : "bg-background text-foreground hover:bg-muted hover:text-foreground border-border/50 hover:border-border"
                )}
              >
                Tomorrow
              </Button>
              <Button 
                onClick={handleSearch} 
                disabled={loading}
                size="sm"
                className="h-8 gap-2 bg-primary/10 border border-primary text-primary hover:bg-primary/20 px-4"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {loading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Date Range Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="dateFrom" className="text-xs font-medium text-muted-foreground tracking-wide">From Date & Time</Label>
              <Input
                id="dateFrom"
                type="datetime-local"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 rounded-lg text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateTo" className="text-xs font-medium text-muted-foreground tracking-wide">To Date & Time</Label>
              <Input
                id="dateTo"
                type="datetime-local"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 rounded-lg text-sm"
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Results Section */}
          {searchResults.length > 0 && (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground tracking-wide">Events List</Label>
                <div className="max-h-32 overflow-y-auto border border-border/40 rounded-lg bg-muted/20">
                  <div className="p-2">
                    {eventsList.map((event, index) => {
                      const name = event.tournament_name || event.name || event.title || 'Untitled';
                      const dateTime = formatTournamentDateTime(event, 60);
                      const capacity = getPlayerCapacity(event);
                      const eventId = getEventId(event);
                      const isSelected = selectedEventIds.has(eventId);
                      
                      return (
                        <div
                          key={index}
                          className={`p-2 cursor-pointer rounded-lg transition-colors hover:bg-muted/50 ${isSelected ? 'bg-primary/10 border border-primary/30' : ''}`}
                          onClick={() => {
                            const newSelectedIds = new Set(selectedEventIds);
                            if (isSelected) {
                              newSelectedIds.delete(eventId);
                            } else {
                              newSelectedIds.add(eventId);
                            }
                            setSelectedEventIds(newSelectedIds);
                            updateSummaryFromSelection(newSelectedIds);
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
                <Label className="text-xs font-medium text-muted-foreground tracking-wide">Raw Summary</Label>
                <div className="p-4 bg-muted/30 rounded-lg border border-border/40">
                  <pre className="whitespace-pre-wrap text-sm font-mono text-foreground/80">
                    {summaryText || 'No summary available'}
                  </pre>
                </div>
              </div>

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
                className="h-8 rounded-lg"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Summary
              </Button>
            </>
          )}

          {/* Empty State */}
          {searchResults.length === 0 && !loading && !error && (
            <div className="text-center py-8 text-muted-foreground border border-dashed border-border/60 rounded-lg">
              <p className="text-sm">Search for events to see results</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Builder */}
      <Card className={cardClass}>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
                <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
              </div>
              <CardTitle className="text-lg font-semibold">Message Builder</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                <SelectTrigger className="w-52 h-9 rounded-lg text-sm">
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
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name"
                className="w-40 h-9 rounded-lg text-sm"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 px-3 rounded-lg">
                    Save <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleSaveTemplate}>
                    Save
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSaveAsTemplate}>
                    Save as new
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSetDefault} disabled={!selectedTemplateId}>
                    Set as default
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" onClick={handleNewTemplate} className="h-9 px-3 rounded-lg">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Two-column layout for editor and preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Editor Column */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground tracking-wide">Template Editor</Label>
              <Textarea
                ref={textareaRef}
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                placeholder="Enter your message template..."
                rows={10}
                className="rounded-lg resize-none font-mono text-sm"
              />
              
              {/* Token Chips */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => insertToken('{{summary}}')}
                  className="text-xs rounded-full px-2.5 py-1 bg-muted/40 hover:bg-primary/10 transition-colors"
                >
                  summary
                </button>
                <button
                  onClick={() => insertToken('{{date_display_short}}')}
                  className="text-xs rounded-full px-2.5 py-1 bg-muted/40 hover:bg-primary/10 transition-colors"
                >
                  date
                </button>
                <button
                  onClick={() => insertToken('{{club_name}}')}
                  className="text-xs rounded-full px-2.5 py-1 bg-muted/40 hover:bg-primary/10 transition-colors"
                >
                  club
                </button>
                <button
                  onClick={() => insertToken('{{sport}}')}
                  className="text-xs rounded-full px-2.5 py-1 bg-muted/40 hover:bg-primary/10 transition-colors"
                >
                  sport
                </button>
                <button
                  onClick={() => insertToken('{{count_slots}}')}
                  className="text-xs rounded-full px-2.5 py-1 bg-muted/40 hover:bg-primary/10 transition-colors"
                >
                  count
                </button>
                <EmojiPicker onEmojiSelect={insertEmoji} />
              </div>
            </div>

            {/* Preview Column */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground tracking-wide">Live Preview</Label>
              <div className="bg-muted/30 p-4 rounded-lg border border-border/40 min-h-[260px]">
                <pre className="whitespace-pre-wrap font-mono text-sm text-foreground/80">
                  {renderTemplate(templateContent) || 'Preview will appear here...'}
                </pre>
              </div>
            </div>
          </div>
        </CardContent>

        {/* Send Message Footer */}
        <div className="px-6 py-4 bg-muted/30 dark:bg-muted/20 border-t border-border/40">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Label htmlFor="whatsappGroupFooter" className="text-sm font-medium whitespace-nowrap">WhatsApp Group</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p className="text-xs">Enter the exact name of your WhatsApp group. Make sure CORTEK has been added to the group.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Input
                id="whatsappGroupFooter"
                value={whatsappGroup}
                onChange={(e) => setWhatsappGroup(e.target.value)}
                placeholder="Enter group name"
                className="flex-1 h-9 rounded-lg text-sm"
              />
            </div>
            <Button 
              onClick={handleSendMessage} 
              disabled={sendingMessage || !summaryText}
              size="sm"
              className="h-9 px-4 rounded-lg bg-primary/10 border border-primary text-primary hover:bg-primary/20"
            >
              {sendingMessage ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Send className="h-4 w-4 mr-1.5" />
              )}
              {sendingMessage ? 'Sending...' : 'Send Now'}
            </Button>
          </div>
          {sendResult && (
            <Alert variant={sendResult.status === 'success' ? 'default' : 'destructive'} className="mt-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{sendResult.message}</AlertDescription>
            </Alert>
          )}
        </div>
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
          data: selectedEventIds.size > 0
            ? (searchResults || []).filter(event => selectedEventIds.has(getEventId(event)))
            : (searchResults || []),
          variant: 'basic',
          target: 'TODAY',
          tz: 'Europe/London',
          playtomicOffset: 60,
          clubName: (organization as any)?.club_name || organization?.name || 'Club',
          dateDisplayShort: dateDisplayShort || '',
          sport: 'Padel',
          countSlots: selectedEventIds.size > 0 ? selectedEventIds.size : countSlots,
          eventId: selectedEventIds.size === 1 ? Array.from(selectedEventIds)[0] : null,
          selectedVariant: 'basic'
        }}
        summaryVariants={['basic']}
        onVariantChange={() => {}}
      />
    </div>
  );
}