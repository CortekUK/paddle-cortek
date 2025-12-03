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
import { formatMatchWhatsAppBlock, generateCompetitiveOpenMatchesSummary } from '@/utils/playtomicAdminUtils';
import { SocialPostBuilder } from '@/components/social/SocialPostBuilder';

export default function PartialMatches() {
  const { organization } = useOrganizationAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Search results state
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [summaryText, setSummaryText] = useState('');
  const [dateDisplayShort, setDateDisplayShort] = useState('');
  const [countSlots, setCountSlots] = useState(0);
  
  // Summary variant state
  const [selectedSummaryVariant, setSelectedSummaryVariant] = useState<string>('competitive-open');
  const [enhancedSummary, setEnhancedSummary] = useState<string>('');
  
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

  // Helper function to get competitive open matches with enriched data (same as admin)
  const getCompetitiveOpenMatches = (matches: any[]) => {
    return matches.filter(match => {
      // Check if cancelled
      const isCancelled = match.status?.toLowerCase() === 'cancelled';
      if (isCancelled) return false;
      
      // Check join requests status is OPEN (case-insensitive)
      const joinStatus = match.join_requests_info?.status?.toLowerCase();
      if (joinStatus !== 'open') return false;
      
      // Check competition_mode is COMPETITIVE (case-insensitive)
      const compMode = match.competition_mode?.toLowerCase();
      if (compMode !== 'competitive') return false;
      
      // Check match_type is COMPETITIVE (case-insensitive)
      const matchType = match.match_type?.toLowerCase();
      if (matchType !== 'competitive') return false;
      
      // Count registered players with names
      const registeredPlayers = match.teams?.reduce((count: number, team: any) => {
        const playersWithNames = team.players?.filter((player: any) => player.name) || [];
        return count + playersWithNames.length;
      }, 0) || 0;
      
      // Check if between 1-3 players
      return registeredPlayers >= 1 && registeredPlayers <= 3;
    }).map(match => {
      // Enrich matches with player data for display
      const registeredPlayers = match.teams?.reduce((count: number, team: any) => {
        const playersWithNames = team.players?.filter((player: any) => player.name) || [];
        return count + playersWithNames.length;
      }, 0) || 0;

      // Calculate max players (usually 4 for doubles)
      const maxPlayersPerTeam = match.max_players_per_team || 2;
      const numberOfTeams = 2; // Standard doubles
      const maxPlayers = maxPlayersPerTeam * numberOfTeams;

      // Get all player info for detailed display with consistent level_value property
      const allPlayers = match.teams?.flatMap((team: any) => 
        team.players?.map((player: any) => ({
          name: player.name || '??',
          level_value: player.level_value || player.level || null
        })) || []
      ) || [];

      return {
        ...match,
        registeredPlayers,
        maxPlayers,
        allPlayers,
        spacesLeft: Math.max(0, maxPlayers - registeredPlayers)
      };
    }).sort((a, b) => {
      if (a.start_date && b.start_date) {
        return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      }
      return 0;
    });
  };

  // Use admin formatting logic for consistent output
  const formatMatchWithAdmin = (match: any) => {
    // Get club name from organization settings, fallback to organization name
    const clubName = (organization as any)?.club_name || organization?.name || 'Club';
    
    // Create a modified match object with club name for location
    const matchWithClub = {
      ...match,
      location: clubName,
      tenant: {
        ...match.tenant,
        tenant_name: clubName
      }
    };
    
    return formatMatchWhatsAppBlock(matchWithClub, 'Europe/London', playtomicOffsetMinutes);
  };

  // Generate matches summary for selected variant (same as admin)
  const generateMatchesSummary = (variant: string, matches: any[]) => {
    let selectedMatches: any[] = [];
    let headerText = '';
    
    switch (variant) {
      case 'competitive-open':
        selectedMatches = getCompetitiveOpenMatches(matches);
        headerText = `— COMPETITIVE — OPEN (1–3 PLAYERS) (${selectedMatches.length}) —`;
        break;
      case 'competitive-open-1':
        const compMatches1 = getCompetitiveOpenMatches(matches);
        selectedMatches = compMatches1.filter(match => match.registeredPlayers === 1);
        headerText = `— COMPETITIVE — OPEN (1 PLAYER) (${selectedMatches.length}) —`;
        break;
      case 'competitive-open-2':
        const compMatches2 = getCompetitiveOpenMatches(matches);
        selectedMatches = compMatches2.filter(match => match.registeredPlayers === 2);
        headerText = `— COMPETITIVE — OPEN (2 PLAYERS) (${selectedMatches.length}) —`;
        break;
      case 'competitive-open-3':
        const compMatches3 = getCompetitiveOpenMatches(matches);
        selectedMatches = compMatches3.filter(match => match.registeredPlayers === 3);
        headerText = `— COMPETITIVE — OPEN (3 PLAYERS) (${selectedMatches.length}) —`;
        break;
      default:
        selectedMatches = getCompetitiveOpenMatches(matches);
        headerText = `— COMPETITIVE — OPEN (1–3 PLAYERS) (${selectedMatches.length}) —`;
        break;
    }

    if (selectedMatches.length === 0) {
      return `${headerText}\n\nNo matches found for this criteria.`;
    }

    const matchBlocks = selectedMatches.map(match => formatMatchWithAdmin(match));
    return `${headerText}\n\n${matchBlocks.join('\n\n')}`;
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
        .eq('category', 'PARTIAL_MATCHES')
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
        setTemplateContent(`*PLAYERS NEEDED @ {{club_name}}*
📅 {{date_display_short}}

{{summary}}

Join these matches - let's play!`);
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
        setWhatsappGroup(settingsData?.wa_group_matches || '');
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

      // Call the existing playtomic-fetch edge function for matches with has_players=TRUE
      const { data, error: fetchError } = await supabase.functions.invoke('playtomic-fetch', {
        body: {
          endpoint: 'matches',
          tenant_id: organization.tenant_id,
          sport_id: 'PADEL',
          has_players: 'TRUE',
          start_min: fromDate.toISOString(),
          start_max: toDate.toISOString()
        }
      });

      if (fetchError) {
        throw new Error(fetchError.message || 'Failed to fetch partial matches data');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Store raw results and generate summary
      if (data?.raw && Array.isArray(data.raw)) {
        setSearchResults(data.raw);
        setCountSlots(data.raw.length);
        const summary = generateMatchesSummary(selectedSummaryVariant, data.raw);
        setSummaryText(summary);
        setEnhancedSummary(summary);
        
        // Prefill message template with enhanced summary
        if (templateContent.includes('{{summary}}')) {
          // Keep existing template with token
        } else {
          // Auto-prefill if no summary token exists
          const context = {
            summary: summary,
            date_display_short: toShortDate(new Date(dateFrom), new Date(dateTo)),
            club_name: (organization as any)?.club_name || organization?.name || 'Club',
            sport: 'PADEL',
            count_slots: data.raw.length.toString()
          };
          
              // Don't auto-prefill, just use the existing template with tokens
        }
      } else {
        setSummaryText('No partial matches found');
        setEnhancedSummary('No partial matches found');
        setCountSlots(0);
        setSearchResults([]);
      }

      // Generate friendly date display
      setDateDisplayShort(toShortDate(fromDate, toDate));

    } catch (err: any) {
      console.error('Partial matches search error:', err);
      setError(err.message || 'An error occurred while searching for partial matches');
    } finally {
      setLoading(false);
    }
  };

  // Template rendering helper
  const renderTemplate = (template: string): string => {
    const context = {
      summary: enhancedSummary || summaryText || 'No summary available',
      date_display_short: dateDisplayShort || toShortDate(new Date(dateFrom), new Date(dateTo)),
      club_name: (organization as any)?.club_name || organization?.name || 'Club',
      sport: 'PADEL',
      count_slots: countSlots.toString()
    };
    
    let rendered = template;
    
    // Replace all tokens
    Object.entries(context).forEach(([key, value]) => {
      const token = `{{${key}}}`;
      rendered = rendered.replace(new RegExp(token.replace(/[{}]/g, '\\$&'), 'g'), value);
    });
    
    return rendered;
  };

  // Update summary when variant changes
  useEffect(() => {
    if (searchResults.length > 0) {
      const summary = generateMatchesSummary(selectedSummaryVariant, searchResults);
      setSummaryText(summary);
      setEnhancedSummary(summary);
    }
  }, [selectedSummaryVariant, searchResults]);

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
      if (template.summary_variant) setSelectedSummaryVariant(template.summary_variant);
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
        category: 'PARTIAL_MATCHES',
        name: templateName,
        content: templateContent,
        module: 'PARTIAL_MATCHES',
        summary_variant: selectedSummaryVariant,
        linked_event_id: null,
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
        .eq('category', 'PARTIAL_MATCHES')
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
        description: "Please search for partial matches first",
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
          category: 'PARTIAL_MATCHES',
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
        <h1 className="text-3xl font-bold text-foreground">Partial Matches</h1>
        <p className="text-muted-foreground mt-1">
          Find and notify about incomplete matches that need more players
        </p>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Partial Matches
          </CardTitle>
          <CardDescription>
            Find matches that need additional players
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
            {loading ? 'Searching...' : 'Search Partial Matches'}
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
              Summary ({countSlots} matches)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Summary Variant</Label>
              <Select value={selectedSummaryVariant} onValueChange={setSelectedSummaryVariant}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="competitive-open">Competitive — Open (1–3 players)</SelectItem>
                  <SelectItem value="competitive-open-1">Competitive — Open (1 player)</SelectItem>
                  <SelectItem value="competitive-open-2">Competitive — Open (2 players)</SelectItem>
                  <SelectItem value="competitive-open-3">Competitive — Open (3 players)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Message Preview</Label>
              <div className="p-4 bg-muted rounded-md border">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {enhancedSummary || 'No summary available'}
                </pre>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (enhancedSummary) {
                    navigator.clipboard.writeText(enhancedSummary);
                    toast({
                      title: "Copied to clipboard",
                      description: "Summary copied successfully",
                    });
                  }
                }}
                disabled={!enhancedSummary}
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
            Create and customize your partial matches message
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
            disabled={sendingMessage || !enhancedSummary}
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
          category="PARTIAL_MATCHES"
        />
      )}

      {/* Social Post Builder */}
      <SocialPostBuilder
        source="PARTIAL_MATCHES"
        pageData={{
          category: 'PARTIAL_MATCHES',
          data: searchResults || [],
          variant: selectedSummaryVariant,
          target: 'TODAY',
          tz: 'Europe/London',
          playtomicOffset: 60,
          clubName: (organization as any)?.club_name || organization?.name || 'Club',
          dateDisplayShort: dateDisplayShort || '',
          sport: 'Padel',
          countSlots: countSlots,
          eventId: null, // Partial matches don't have specific events
          selectedVariant: selectedSummaryVariant
        }}
        summaryVariants={[
          'competitive-open',
          'competitive-open-1',
          'competitive-open-2',
          'competitive-open-3'
        ]}
        onVariantChange={setSelectedSummaryVariant}
      />
    </div>
  );
}