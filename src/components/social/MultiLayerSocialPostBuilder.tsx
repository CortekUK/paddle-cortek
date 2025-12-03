import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { SummaryFormatControls } from "./SummaryFormatControls";
import { LayersPanel } from "./LayersPanel";
import { SocialCanvas } from "./SocialCanvas";
import { SocialTemplate, TextLayer, AVAILABLE_TOKENS, FONT_FAMILIES, CANVAS_PRESETS, CanvasPreset, SummaryFormat } from "@/types/social";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { buildSummary, getTokenReplacements, compileMessage } from "@/lib/buildSummary";
import { useOrganizationAuth } from "@/hooks/useOrganizationAuth";
import { Calendar, Clock, Image, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MultiLayerSocialPostBuilderProps {
  source: string;
  pageData: any;
  summaryVariants: string[];
  onVariantChange: (variant: string) => void;
}

export function MultiLayerSocialPostBuilder({
  source,
  pageData,
  summaryVariants,
  onVariantChange,
}: MultiLayerSocialPostBuilderProps) {
  const { organization } = useOrganizationAuth();
  const { toast } = useToast();

  const [templates, setTemplates] = useState<SocialTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [currentTemplate, setCurrentTemplate] = useState<SocialTemplate | null>(null);
  const [layers, setLayers] = useState<any[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [scheduleType, setScheduleType] = useState<'DAILY' | 'RANGE' | 'ONE_OFF'>('ONE_OFF');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [selectedVariant, setSelectedVariant] = useState(summaryVariants[0] || 'basic');
  const [zoom, setZoom] = useState(100);
  const [canvasPreset, setCanvasPreset] = useState<CanvasPreset>('instagram-portrait');
  const [customWidth, setCustomWidth] = useState(1080);
  const [customHeight, setCustomHeight] = useState(1080);

  // Sync selectedVariant with pageData.variant when it changes from parent
  useEffect(() => {
    if (pageData?.variant && pageData.variant !== selectedVariant) {
      setSelectedVariant(pageData.variant);
    }
  }, [pageData?.variant]);

  // Load templates on mount
  useEffect(() => {
    if (organization?.id) {
      loadTemplates();
    }
  }, [organization?.id]);

  // Convert FabricLayer format to TextLayer or ImageLayer format
  const convertFabricLayersToLayers = (fabricLayers: any[]): any[] => {
    return fabricLayers.map((layer: any) => {
      // Check if it's already in correct format
      if (layer.x !== undefined && layer.y !== undefined && !layer.style) {
        return layer;
      }

      const style = layer.style || {};

      // Handle image layers
      if (layer.type === 'image' && layer.imageUrl) {
        return {
          id: layer.id || crypto.randomUUID(),
          type: 'image',
          name: layer.name || 'Image Layer',
          imageUrl: layer.imageUrl,
          x: style.left !== undefined ? style.left : (layer.x || 50),
          y: style.top !== undefined ? style.top : (layer.y || 50),
          width: style.width !== undefined ? style.width : (layer.width || 200),
          height: style.height !== undefined ? style.height : (layer.height || 200),
          visible: layer.visible !== false
        };
      }

      // Handle text layers
      if (layer.type === 'text') {
        return {
          id: layer.id || crypto.randomUUID(),
          type: 'text',
          name: layer.name || 'Text Layer',
          content: layer.content || layer.binding ? `{{${layer.binding}}}` : '{{summary}}',
          tokens: layer.tokens || (layer.binding ? [layer.binding] : ['summary']),
          fontFamily: style.fontFamily || layer.fontFamily || 'Roboto',
          fontSize: style.fontSize || layer.fontSize || 32,
          fontWeight: (style.fontWeight === 'bold' || style.fontWeight === 700 || layer.fontWeight === 'bold') ? 'bold' : 'normal',
          fontStyle: (style.fontStyle === 'italic' || layer.fontStyle === 'italic') ? 'italic' : 'normal',
          color: style.fill || layer.color || '#000000',
          textAlign: (style.textAlign || layer.textAlign || 'left') as 'left' | 'center' | 'right',
          lineHeight: layer.lineHeight || 1.2,
          wordWrap: layer.wordWrap !== false,
          x: style.left !== undefined ? style.left : (layer.x || 50),
          y: style.top !== undefined ? style.top : (layer.y || 50),
          width: style.width !== undefined ? style.width : (layer.width || 200),
          rotation: layer.rotation || 0,
          visible: layer.visible !== false,
          summaryFormat: layer.summaryFormat
        };
      }

      // Return as-is for other types
      return layer;
    });
  };

  // Update layers when template changes
  useEffect(() => {
    if (currentTemplate) {
      const convertedLayers = convertFabricLayersToLayers(currentTemplate.layers || []);
      console.log('Template loaded:', {
        templateName: currentTemplate.name,
        originalLayers: currentTemplate.layers,
        convertedLayers: convertedLayers,
        lockedEventId: currentTemplate.event_id,
        lockedVariant: currentTemplate.summary_variant
      });
      setLayers(convertedLayers);
      setSelectedLayerId(null);
      
      // If template has locked event/variant, use those instead of pageData values
      if (currentTemplate.event_id) {
        console.log('Template has locked event_id:', currentTemplate.event_id);
        // Note: event_id will be used when generating posts
      }
      if (currentTemplate.summary_variant) {
        console.log('Template has locked summary_variant:', currentTemplate.summary_variant);
        setSelectedVariant(currentTemplate.summary_variant);
        onVariantChange(currentTemplate.summary_variant);
      }
    }
  }, [currentTemplate]);

  const loadTemplates = async () => {
    if (!organization?.id) return;

    const { data, error } = await supabase
      .from('social_templates')
      .select('*')
      .eq('org_id', organization.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading templates:', error);
      return;
    }

    const formattedTemplates = (data || []).map(template => ({
      ...template,
      layers: Array.isArray(template.layers) 
        ? (template.layers as unknown as TextLayer[]) 
        : [],
      bg_fit: (template.bg_fit as 'cover' | 'contain') || 'cover',
      bg_natural_w: template.bg_natural_w || undefined,
      bg_natural_h: template.bg_natural_h || undefined,
      bg_offset_x: template.bg_offset_x || undefined,
      bg_offset_y: template.bg_offset_y || undefined
    }));
    
    setTemplates(formattedTemplates);
    
    // Auto-select first template if available
    if (formattedTemplates && formattedTemplates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(formattedTemplates[0].id!);
      setCurrentTemplate(formattedTemplates[0]);
    }
  };

  const getCanvasSize = () => {
    if (canvasPreset === 'custom') {
      return { width: customWidth, height: customHeight };
    }
    return CANVAS_PRESETS[canvasPreset];
  };

  const createDefaultLayer = (): TextLayer => {
    const canvas = getCanvasSize();
    return {
      id: crypto.randomUUID(),
      type: 'text',
      name: 'Text Layer',
      content: '{{summary}}',
      tokens: ['summary'],
      fontFamily: 'Roboto',
      fontSize: 32,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#111111',
      textAlign: 'center',
      lineHeight: 1.2,
      wordWrap: true,
      x: Math.round(canvas.width * 0.05), // 5% from left
      y: Math.round(canvas.height * 0.6),  // 60% from top
      width: Math.round(canvas.width * 0.9), // 90% width
      rotation: 0,
      visible: true,
      summaryFormat: {
        layout: 'bulleted',
        includeLabels: true,
        timeStyle: '12h',
        rangeJoiner: '–',
        separator: '·',
        order: ['morning', 'afternoon', 'evening'],
        uppercaseLabels: false
      }
    };
  };

  const handleAddTextLayer = () => {
    const newLayer = createDefaultLayer();
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
  };

  const handleUpdateLayer = (layerId: string, updates: Partial<any>) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, ...updates } : layer
    ));
  };

  const handleDeleteLayer = (layerId: string) => {
    setLayers(prev => prev.filter(layer => layer.id !== layerId));
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
    }
  };

  const handleToggleLayerVisibility = (layerId: string) => {
    handleUpdateLayer(layerId, { 
      visible: !layers.find(l => l.id === layerId)?.visible 
    });
  };

  const handleReorderLayers = (layerIds: string[]) => {
    const reorderedLayers = layerIds.map(id => 
      layers.find(layer => layer.id === id)!
    ).filter(Boolean);
    setLayers(reorderedLayers);
  };

  const getCompiledPreview = () => {
    if (!pageData) return 'Preview will show when data is loaded...';

    const summary = buildSummary({
      category: pageData.category || 'COURT_AVAILABILITY',
      data: pageData.data || [],
      variant: selectedVariant,
      target: pageData.target || 'TODAY',
      tz: pageData.tz || 'Europe/London',
      playtomicOffset: pageData.playtomicOffset || 0,
      clubName: pageData.clubName || 'Club',
      dateDisplayShort: pageData.dateDisplayShort || '',
      sport: pageData.sport || 'Padel',
      countSlots: pageData.countSlots || 0,
      eventId: pageData?.eventId || null // Filter by selected event if available
    });

    const replacements = getTokenReplacements({
      summary,
      clubName: pageData.clubName || 'Club',
      dateDisplayShort: pageData.dateDisplayShort || '',
      sport: pageData.sport || 'Padel',
      countSlots: pageData.countSlots || 0,
    });

    return summary;
  };

  const handleGenerateNow = async () => {
    if (!currentTemplate || !organization?.id) return;

    setIsGenerating(true);
    try {
      // Use locked event_id and variant from template if available
      const lockedEventId = currentTemplate?.event_id || pageData?.eventId || null;
      const lockedVariant = currentTemplate?.summary_variant || selectedVariant;
      
      console.log('Generating with locked values:', {
        lockedEventId,
        lockedVariant,
        templateEventId: currentTemplate.event_id,
        templateVariant: currentTemplate.summary_variant,
        pageDataEventId: pageData?.eventId,
        selectedVariant
      });
      
      // Build the summary with current context (using locked variant if available)
      const summary = buildSummary({
        category: pageData.category || 'COURT_AVAILABILITY',
        data: pageData.data || [],
        variant: lockedVariant,
        target: pageData.target || 'TODAY',
        tz: pageData.tz || 'Europe/London',
        playtomicOffset: pageData.playtomicOffset || 0,
        clubName: pageData.clubName || 'Club',
        dateDisplayShort: pageData.dateDisplayShort || '',
        sport: pageData.sport || 'Padel',
        countSlots: pageData.countSlots || 0,
        eventId: lockedEventId || pageData?.eventId || null // Filter by selected event if available
      });

      console.log('Summary built:', {
        summary: summary.substring(0, 100) + '...',
        category: pageData.category,
        dataCount: pageData.data?.length || 0,
        variant: selectedVariant
      });

      // Get all tokens for replacement
      const replacements = getTokenReplacements({
        summary,
        clubName: pageData.clubName || 'Club',
        dateDisplayShort: pageData.dateDisplayShort || '',
        sport: pageData.sport || 'Padel',
        countSlots: pageData.countSlots || 0,
        messageContent: summary // Add summary as message_content fallback
      });

      console.log('Token replacements:', {
        summary: replacements['{{summary}}']?.substring(0, 50) + '...',
        club_name: replacements['{{club_name}}'],
        date_display_short: replacements['{{date_display_short}}'],
        sport: replacements['{{sport}}'],
        count_slots: replacements['{{count_slots}}'],
        message_content: replacements['{{message_content}}']?.substring(0, 50) + '...'
      });

      // Compile all layer content (text layers only, image layers pass through)
      const compiledLayers = layers.map(layer => {
        if (layer.type === 'text' && layer.content) {
          const compiledContent = compileMessage(layer.content, replacements);
          return {
            ...layer,
            content: compiledContent
          };
        } else {
          // For image layers and other types, pass through as-is
          return layer;
        }
      });

      console.log('Compiled layers for render:', {
        totalLayers: compiledLayers.length,
        textLayers: compiledLayers.filter(l => l.type === 'text').length,
        imageLayers: compiledLayers.filter(l => l.type === 'image').length,
        layers: compiledLayers.map((l, idx) => ({
          index: idx + 1,
          type: l.type,
          visible: l.visible !== false,
          content: l.type === 'text' ? (l.content || 'EMPTY') : 'N/A',
          contentLength: l.type === 'text' ? (l.content?.length || 0) : 0,
          hasTokens: l.type === 'text' ? (l.content?.includes('{{') || false) : false,
          imageUrl: l.type === 'image' ? (l.imageUrl || 'MISSING') : 'N/A',
          x: l.x,
          y: l.y,
          width: l.width,
          height: l.height
        }))
      });

      // Prepare context for the edge function
      const context = {
        summary,
        club_name: pageData.clubName || 'Club',
        date_display_short: pageData.dateDisplayShort || '',
        sport: pageData.sport || 'Padel',
        count_slots: pageData.countSlots || 0
      };

      // Ensure all layers have required properties
      const sanitizedLayers = compiledLayers.map(layer => ({
        ...layer,
        visible: layer.visible !== false, // Default to true
        x: layer.x || 0,
        y: layer.y || 0,
        width: layer.width || (layer.type === 'text' ? 200 : 100),
        height: layer.height || (layer.type === 'image' ? 100 : undefined),
        fontSize: layer.fontSize || 32,
        color: layer.color || '#000000',
        fontFamily: layer.fontFamily || 'Roboto',
        fontWeight: layer.fontWeight || 'normal',
        fontStyle: layer.fontStyle || 'normal',
        textAlign: layer.textAlign || 'left',
        lineHeight: layer.lineHeight || 1.2
      }));
      
      console.log('Sanitized layers before sending:', {
        totalLayers: sanitizedLayers.length,
        layers: sanitizedLayers.map((l, idx) => ({
          index: idx + 1,
          type: l.type,
          visible: l.visible,
          content: l.type === 'text' ? (l.content || 'EMPTY').substring(0, 100) : 'N/A',
          contentLength: l.type === 'text' ? (l.content || '').length : 0,
          imageUrl: l.type === 'image' ? (l.imageUrl || 'EMPTY').substring(0, 100) : 'N/A',
          x: l.x,
          y: l.y,
          width: l.width,
          height: l.height,
          fontSize: l.fontSize,
          color: l.color
        }))
      });

      console.log('Sending to render function:', {
        org_id: organization.id,
        template_id: currentTemplate.id,
        source: source.toUpperCase(),
        layersCount: sanitizedLayers.length,
        layers: sanitizedLayers.map(l => ({
          type: l.type,
          visible: l.visible,
          content: l.type === 'text' ? (l.content?.substring(0, 30) + '...') : 'N/A',
          imageUrl: l.type === 'image' ? l.imageUrl : 'N/A'
        }))
      });

      // Use locked variant from template if available
      const renderVariant = currentTemplate?.summary_variant || selectedVariant;
      
      const { data, error } = await supabase.functions.invoke('render-social-post', {
        body: {
          org_id: organization.id,
          template_id: currentTemplate.id,
          source: source.toUpperCase(),
          summary_variant: renderVariant,
          message_content_raw: layers.find(l => l.content?.includes('{{'))?.content || '',
          context,
          layers: sanitizedLayers
        },
      });

      console.log('Render function response:', {
        success: data?.success,
        render_id: data?.render_id,
        image_url: data?.image_url,
        correlationId: data?.correlationId,
        error: error,
        fullResponse: data
      });

      if (error) {
        console.error('Render function error:', error);
        throw error;
      }

      if (!data?.success) {
        console.error('Render function returned unsuccessful:', data);
        throw new Error(data?.error || 'Failed to generate image');
      }

      toast({
        title: "Social post generated! 🎉",
        description: (
          <div className="flex items-center gap-3">
            {data?.image_url && (
              <img 
                src={data.image_url} 
                alt="Generated post" 
                className="w-12 h-12 rounded object-cover"
              />
            )}
            <div>
              <p>Your post has been created and saved to Social Media Library.</p>
              <a 
                href="/client/social-media-library?tab=renders" 
                className="text-blue-600 hover:underline text-sm"
              >
                View in library →
              </a>
            </div>
          </div>
        ),
        duration: 5000,
      });

      // Small delay before navigation to show the toast
      // TEMPORARILY DISABLED: Redirect stopped for debugging
      // setTimeout(() => {
      //   window.location.href = '/client/social-media-library?tab=renders';
      // }, 1500);
    } catch (error) {
      console.error('Error generating social post:', error);
      
      // Log error with correlation ID for debugging
      const correlationId = crypto.randomUUID();
      console.error(`[${correlationId}] Generation error details:`, {
        error: error.message,
        template: currentTemplate?.id,
        source,
        layers: layers.length
      });
      
      toast({
        title: "Error generating post",
        description: `Couldn't generate the image. Please try again. (ID: ${correlationId.slice(0, 8)})`,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSchedule = async () => {
    if (!currentTemplate || !organization?.id || !scheduledDate || !scheduledTime) return;

    setIsScheduling(true);
    try {
      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);

      const frequency = scheduleType === 'DAILY' ? 'DAILY' : 'ONCE';
      const runAtUtc = scheduledDateTime.toISOString();

      // Use locked event_id and summary_variant from template if available, otherwise use current selection
      const lockedEventId = currentTemplate.event_id || pageData?.eventId || null;
      const lockedVariant = currentTemplate.summary_variant || selectedVariant;
      const sourceCategory = currentTemplate.source_category || source;

      console.log('Scheduling with:', {
        lockedEventId,
        lockedVariant,
        sourceCategory,
        pageDataEventId: pageData?.eventId,
        templateEventId: currentTemplate.event_id
      });

      const { error } = await supabase
        .from('social_post_schedules')
        .insert({
          org_id: organization.id,
          template_id: currentTemplate.id,
          category: sourceCategory,
          event_id: lockedEventId, // IMPORTANT: Save event_id at top level for scheduler
          run_at_utc: runAtUtc,
          next_run_at_utc: runAtUtc,
          frequency,
          status: 'ACTIVE',
          created_by: (await supabase.auth.getUser()).data.user?.id || '',
          compiled_payload: {
            template_id: currentTemplate.id,
            source: sourceCategory,
            target: pageData?.target || 'TODAY',
            summary_variant: lockedVariant,
            event_id: lockedEventId
          }
        });

      if (error) throw error;

      toast({
        title: "Social post scheduled!",
        description: `Your post will be generated at ${scheduledTime} on ${scheduledDate}.`,
      });

      setScheduleDialog(false);
      setScheduledDate('');
      setScheduledTime('09:00');
      setScheduleType('ONE_OFF');
      setRangeStart('');
      setRangeEnd('');
    } catch (error) {
      console.error('Error scheduling social post:', error);
      toast({
        title: "Error scheduling post",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsScheduling(false);
    }
  };

  const selectedLayer = layers.find(layer => layer.id === selectedLayerId) || null;

  const insertToken = (token: string) => {
    if (!selectedLayer) return;
    const currentContent = selectedLayer.content || '';
    const newContent = currentContent + `{{${token}}}`;
    handleUpdateLayer(selectedLayer.id, { content: newContent });
  };

  const adjustZoom = (delta: number) => {
    setZoom(prev => Math.max(25, Math.min(200, prev + delta)));
  };

  const handleRenameLayer = (layerId: string, newName: string) => {
    handleUpdateLayer(layerId, { name: newName });
  };

  const hasSummaryToken = (layer: TextLayer) => {
    return layer.content?.includes('{{summary}}');
  };

  const navigate = useNavigate();

  // Premium card styling
  const cardClass = "bg-white/70 dark:bg-card/70 backdrop-blur-sm rounded-2xl shadow-lg border border-border/40 dark:border-white/[0.08] overflow-hidden";

  // Empty state when no templates
  if (templates.length === 0) {
    return (
      <Card className={cardClass}>
        <CardHeader className="pb-0">
          <div className="flex items-center gap-3 pb-4 border-b border-border/30">
            <div className="p-2 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
              <Image className="h-4 w-4 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Social Post Builder</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Create visual posts for social media.</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="flex flex-col items-center justify-center py-12 px-8">
            <div className="p-4 rounded-2xl bg-muted/30 dark:bg-muted/20 mb-4">
              <Image className="h-10 w-10 text-muted-foreground/50" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No templates yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
              Create your first social media template in the Social Media Library to start building visual posts.
            </p>
            <Button className="bg-primary/10 border border-primary text-primary hover:bg-primary/20 rounded-lg" onClick={() => navigate('/client/social-media-library')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Go to Social Media Library
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cardClass}>
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between pb-4 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100/50 dark:bg-purple-900/20">
              <Image className="h-4 w-4 text-purple-600 dark:text-purple-400" strokeWidth={1.5} />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Social Post Builder</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">Create visual posts for social media.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Template:</Label>
              <Select value={selectedTemplateId} onValueChange={(value) => {
                setSelectedTemplateId(value);
                const template = templates.find(t => t.id === value);
                setCurrentTemplate(template || null);
              }}>
                <SelectTrigger className="w-48 h-9 rounded-lg border-border/50 bg-white dark:bg-background">
                  <SelectValue placeholder="Select template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id!}>
                      <div className="flex items-center gap-2">
                        {template.bg_url ? (
                          <img src={template.bg_url} alt="thumb" className="w-6 h-6 object-cover rounded" />
                        ) : (
                          <div className="w-6 h-6 rounded bg-muted" />
                        )}
                        <span>{template.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-5 space-y-5">
        {/* Controls row */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Canvas:</Label>
            <Select value={canvasPreset} onValueChange={(value: CanvasPreset) => setCanvasPreset(value)}>
              <SelectTrigger className="w-40 h-9 rounded-lg border-border/50 bg-white dark:bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CANVAS_PRESETS).map(([key, preset]) => (
                  <SelectItem key={key} value={key}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canvasPreset === 'custom' && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={customWidth}
                onChange={(e) => setCustomWidth(parseInt(e.target.value) || 1080)}
                className="w-16 h-9 rounded-lg border-border/50 bg-white dark:bg-background"
                min={200}
                max={2000}
              />
              <span className="text-xs text-muted-foreground">×</span>
              <Input
                type="number"
                value={customHeight}
                onChange={(e) => setCustomHeight(parseInt(e.target.value) || 1080)}
                className="w-16 h-9 rounded-lg border-border/50 bg-white dark:bg-background"
                min={200}
                max={2000}
              />
            </div>
          )}

          {summaryVariants.length > 1 && (
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Variant:</Label>
              <Select value={selectedVariant} onValueChange={(value) => {
                setSelectedVariant(value);
                onVariantChange(value);
              }}>
                <SelectTrigger className="w-32 h-9 rounded-lg border-border/50 bg-white dark:bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {summaryVariants.map((variant) => (
                    <SelectItem key={variant} value={variant}>
                      {variant.charAt(0).toUpperCase() + variant.slice(1)}
                    </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

        {currentTemplate && (
          <>
            {/* Top Section: Text Input + Tokens + Style Controls */}
            <div className="space-y-4">
              {/* Text Content Input */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Text Content</Label>
                <Textarea
                  value={selectedLayer?.content || ''}
                  onChange={(e) => selectedLayer && handleUpdateLayer(selectedLayer.id, { content: e.target.value })}
                  placeholder={selectedLayer ? "Enter text content..." : "Select a text layer to edit"}
                  disabled={!selectedLayer}
                  className="min-h-[80px] resize-none"
                />
              </div>

              {/* Token Strip */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Insert Tokens</Label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {AVAILABLE_TOKENS.map((token) => (
                    <Button
                      key={token}
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-xs whitespace-nowrap flex-shrink-0"
                      onClick={() => insertToken(token)}
                      disabled={!selectedLayer}
                    >
                      {token}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Style Controls Row */}
              {selectedLayer && (
                <div className="grid grid-cols-2 md:grid-cols-8 gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="space-y-1">
                    <Label className="text-xs">Font</Label>
                    <Select
                      value={selectedLayer.fontFamily}
                      onValueChange={(value) => handleUpdateLayer(selectedLayer.id, { fontFamily: value })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_FAMILIES.map((font) => (
                          <SelectItem key={font} value={font} className="text-xs">
                            {font}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Size</Label>
                    <Input
                      type="number"
                      value={selectedLayer.fontSize}
                      onChange={(e) => handleUpdateLayer(selectedLayer.id, { fontSize: parseInt(e.target.value) || 32 })}
                      className="h-8 text-xs"
                      min={8}
                      max={120}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Line Height</Label>
                    <Input
                      type="number"
                      value={selectedLayer.lineHeight}
                      onChange={(e) => handleUpdateLayer(selectedLayer.id, { lineHeight: parseFloat(e.target.value) || 1.2 })}
                      className="h-8 text-xs"
                      min={0.8}
                      max={3}
                      step={0.1}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Color</Label>
                    <Input
                      type="color"
                      value={selectedLayer.color}
                      onChange={(e) => handleUpdateLayer(selectedLayer.id, { color: e.target.value })}
                      className="w-full h-8 p-1"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Weight</Label>
                    <Select
                      value={selectedLayer.fontWeight}
                      onValueChange={(value: 'normal' | 'bold') => handleUpdateLayer(selectedLayer.id, { fontWeight: value })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal" className="text-xs">Regular</SelectItem>
                        <SelectItem value="bold" className="text-xs">Bold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Align</Label>
                    <Select
                      value={selectedLayer.textAlign}
                      onValueChange={(value: 'left' | 'center' | 'right') => handleUpdateLayer(selectedLayer.id, { textAlign: value })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left" className="text-xs">Left</SelectItem>
                        <SelectItem value="center" className="text-xs">Center</SelectItem>
                        <SelectItem value="right" className="text-xs">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Zoom</Label>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => adjustZoom(-25)}>-</Button>
                      <span className="text-xs w-12 text-center">{zoom}%</span>
                      <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => adjustZoom(25)}>+</Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Main Content - Canvas + Layers (Vertical Layout) */}
            <div className="grid grid-cols-[1fr_250px] gap-6 min-h-[700px]">
              {/* Canvas Area - Full Width */}
              <div className="flex flex-col justify-center">
                <SocialCanvas
                  canvasWidth={currentTemplate.canvas_w || getCanvasSize().width}
                  canvasHeight={currentTemplate.canvas_h || getCanvasSize().height}
                  backgroundUrl={currentTemplate.bg_url}
                  layers={layers}
                  selectedLayerId={selectedLayerId}
                  pageData={pageData}
                  onSelectLayer={setSelectedLayerId}
                  onUpdateLayer={handleUpdateLayer}
                  zoom={zoom}
                />
              </div>

              {/* Layers Panel - Sidebar */}
              <div>
                <LayersPanel
                  layers={layers}
                  selectedLayerId={selectedLayerId}
                  onAddTextLayer={handleAddTextLayer}
                  onSelectLayer={setSelectedLayerId}
                  onToggleLayerVisibility={handleToggleLayerVisibility}
                  onDeleteLayer={handleDeleteLayer}
                  onReorderLayers={handleReorderLayers}
                  onRenameLayer={handleRenameLayer}
                />
              </div>
            </div>
          </>
        )}
        {!currentTemplate && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {templates.length === 0 
                ? 'No templates available. Create one in Social Media Library first.'
                : 'Select a template to start designing your social post.'
              }
            </p>
          </div>
        )}

        {/* Compiled Preview */}
        {currentTemplate && (
          <div className="space-y-2 border-t pt-4">
            <Label className="text-sm font-medium">Compiled Preview</Label>
            <Textarea
              value={getCompiledPreview()}
              readOnly
              className="min-h-[80px] bg-muted/50"
            />
          </div>
        )}

        {/* Actions Footer */}
        {currentTemplate && (
          <div className="footer flex justify-between gap-3">
            <Button
              onClick={handleGenerateNow}
              disabled={isGenerating || layers.length === 0}
              className="px-8"
            >
              {isGenerating ? 'Generating...' : 'Generate Now'}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setScheduleDialog(true)}
              disabled={layers.length === 0}
              className="px-8"
            >
              <Clock className="h-4 w-4 mr-2" />
              Schedule
            </Button>
          </div>
        )}

        {/* Schedule Dialog */}
        <Dialog open={scheduleDialog} onOpenChange={setScheduleDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Social Post</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Schedule Type</Label>
                <div className="flex gap-3">
                  <Button variant={scheduleType==='DAILY'?'default':'outline'} size="sm" onClick={() => setScheduleType('DAILY')}>Daily</Button>
                  <Button variant={scheduleType==='RANGE'?'default':'outline'} size="sm" onClick={() => setScheduleType('RANGE')}>One-Off Custom Range</Button>
                  <Button variant={scheduleType==='ONE_OFF'?'default':'outline'} size="sm" onClick={() => setScheduleType('ONE_OFF')}>One-Off</Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>

              {scheduleType === 'RANGE' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rangeStart">Range Start</Label>
                    <Input id="rangeStart" type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rangeEnd">Range End</Label>
                    <Input id="rangeEnd" type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setScheduleDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSchedule}
                  disabled={isScheduling || !scheduledDate}
                >
                  {isScheduling ? 'Scheduling...' : 'Schedule Post'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}