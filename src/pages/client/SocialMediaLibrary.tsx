import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Upload, Image, Calendar, Download, ExternalLink, Edit, Trash2, Play, Copy, PauseCircle, PlayCircle, XCircle, ListChecks } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationAuth } from '@/hooks/useOrganizationAuth';
import { toast } from 'sonner';
import TemplateDesigner from '@/components/social/TemplateDesigner';
import { Lightbox } from '@/components/ui/lightbox';
import { format } from 'date-fns';

const SocialMediaLibrary = () => {
  const { organization } = useOrganizationAuth();
  const [activeTab, setActiveTab] = useState("templates");
  const [templates, setTemplates] = useState<any[]>([]);
  const [renders, setRenders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDesigner, setShowDesigner] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState({ url: '', title: '', render: null as any });
  const [schedules, setSchedules] = useState<any[]>([]);

  useEffect(() => {
    if (organization?.id) {
      loadData();
    }
  }, [organization?.id]);

  const loadData = async () => {
    if (!organization?.id) return;
    
    setLoading(true);
    try {
      // Load templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('social_templates')
        .select('*')
        .eq('org_id', organization.id)
        .order('created_at', { ascending: false });

      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);

      // Load renders from new table with template name
      const { data: rendersData, error: rendersError } = await supabase
        .from('social_post_renders')
        .select(`
          *,
          social_templates(name)
        `)
        .eq('org_id', organization.id)
        .order('created_at', { ascending: false });

      if (rendersError) throw rendersError;
      
      // Log renders for debugging
      console.log('Loaded renders:', rendersData?.map(r => ({
        id: r.id,
        image_url: r.image_url,
        source: r.source
      })));
      
      setRenders(rendersData || []);

      // Load schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('social_post_schedules')
        .select('*')
        .eq('org_id', organization.id)
        .order('created_at', { ascending: false });

      if (schedulesError) throw schedulesError;
      setSchedules(schedulesData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (templateData: any) => {
    try {
      if (templateData.id) {
        // Update existing template
        const { error } = await supabase
          .from('social_templates')
          .update({
            name: templateData.name,
            bg_url: templateData.bg_url,
            canvas_w: templateData.canvas_w,
            canvas_h: templateData.canvas_h,
            layers: templateData.layers,
            event_id: templateData.event_id || null,
            summary_variant: templateData.summary_variant || null,
            source_category: templateData.source_category || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', templateData.id);

        if (error) throw error;
        toast.success('Template updated successfully');
      } else {
        // Create new template
        const { error } = await supabase
          .from('social_templates')
          .insert({
            org_id: organization?.id,
            name: templateData.name,
            bg_url: templateData.bg_url,
            canvas_w: templateData.canvas_w,
            canvas_h: templateData.canvas_h,
            layers: templateData.layers,
            event_id: templateData.event_id || null,
            summary_variant: templateData.summary_variant || null,
            source_category: templateData.source_category || null
          });

        if (error) throw error;
        toast.success('Template created successfully');
      }

      setShowDesigner(false);
      setEditingTemplate(null);
      loadData();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('social_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      toast.success('Template deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handleDeleteRender = async (renderId: string) => {
    if (!confirm('Are you sure you want to delete this render?')) return;

    try {
      const { error } = await supabase
        .from('social_post_renders')
        .delete()
        .eq('id', renderId);

      if (error) throw error;
      toast.success('Render deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting render:', error);
      toast.error('Failed to delete render');
    }
  };

  const handleScheduleAction = async (scheduleId: string, action: 'pause' | 'resume' | 'cancel') => {
    try {
      const status = action === 'pause' ? 'PAUSED' : action === 'resume' ? 'ACTIVE' : 'CANCELLED';
      const { error } = await supabase
        .from('social_post_schedules')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', scheduleId);
      if (error) throw error;
      toast.success(`Schedule ${action}d`);
      loadData();
    } catch (error) {
      console.error('Schedule action failed:', error);
      toast.error('Failed to update schedule');
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      const { error } = await supabase
        .from('social_post_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;
      toast.success('Schedule deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Failed to delete schedule');
    }
  };

  const handleRunNow = async (scheduleId: string) => {
    try {
      toast.info('Running schedule...');
      const { data, error } = await supabase.functions.invoke('run-social-post-schedules', {
        body: { scheduleId }
      });
      
      if (error) throw error;
      
      console.log('Run now result:', data);
      toast.success('Schedule executed successfully');
      loadData();
    } catch (error) {
      console.error('Run now failed:', error);
      toast.error('Failed to run schedule');
    }
  };

  const handleOpenImage = (render: any) => {
    setLightboxImage({
      url: render.image_url,
      title: `${render.source?.replace(/_/g, ' ') || 'Social Post'} - ${format(new Date(render.created_at), 'MMM d, HH:mm')}`,
      render
    });
    setLightboxOpen(true);
  };

  const handleDownloadImage = async (render: any) => {
    try {
      // First try direct download
      const response = await fetch(render.image_url, { 
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `social-post-${format(new Date(render.created_at), 'yyyy-MM-dd-HHmm')}.png`;
      a.style.display = 'none';
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 100);
      toast.success('Download started successfully');
      
    } catch (err) {
      console.error('Download failed:', err);
      toast.error('Download failed, opening in new tab instead');
      // Fallback: open in new tab
      window.open(render.image_url, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-64"></div>
          <div className="h-4 bg-muted rounded w-96"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Social Media Library</h1>
        <p className="text-muted-foreground">
          Create templates and manage your generated social media posts
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="renders" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Renders
          </TabsTrigger>
          <TabsTrigger value="schedules" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            Schedules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Templates</h2>
            <Button 
              className="flex items-center gap-2"
              onClick={() => {
                setEditingTemplate(null);
                setShowDesigner(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.length === 0 ? (
              <Card className="border-dashed border-2 flex flex-col items-center justify-center p-8 min-h-[300px]">
                <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Create your first template</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Design a social media template with custom layouts and styling
                </p>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setEditingTemplate(null);
                    setShowDesigner(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </Card>
            ) : (
              templates.map((template) => (
                <Card key={template.id} className="overflow-hidden">
                  <div className="aspect-square bg-muted relative">
                    {template.bg_url ? (
                      <img 
                        src={template.bg_url} 
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium">{template.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {template.canvas_w} × {template.canvas_h}px
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      {template.layers.length} layers • Updated {format(new Date(template.updated_at), 'MMM d')}
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setEditingTemplate(template);
                          setShowDesigner(true);
                        }}
                        className="flex items-center gap-1 flex-1"
                      >
                        <Edit className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="renders" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Rendered Posts</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Filter
              </Button>
              <Button variant="outline" size="sm">
                Sort
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {renders.length === 0 ? (
              <Card className="border-dashed border-2 flex flex-col items-center justify-center p-8 min-h-[300px]">
                <Image className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No renders yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Generate your first social media post from any of the feature pages
                </p>
              </Card>
            ) : (
              renders.map((render) => {
                const imageUrl = render.image_url || render.imageUrl || '';
                const isValidUrl = imageUrl && (imageUrl.startsWith('http') || imageUrl.startsWith('/'));
                
                return (
                  <Card key={render.id} className="overflow-hidden">
                    <div className="aspect-square bg-muted relative cursor-pointer group" onClick={() => handleOpenImage(render)}>
                      {isValidUrl ? (
                        <>
                          <img 
                            src={imageUrl} 
                            alt="Social media post"
                            className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                            loading="lazy"
                            onError={(e) => {
                              console.error('Image load error:', imageUrl, e);
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.parentElement?.querySelector('.image-fallback') as HTMLElement;
                              if (fallback) {
                                fallback.style.display = 'flex';
                              }
                            }}
                            onLoad={(e) => {
                              // Hide fallback when image loads successfully
                              const fallback = e.currentTarget.parentElement?.querySelector('.image-fallback') as HTMLElement;
                              if (fallback) {
                                fallback.style.display = 'none';
                              }
                            }}
                          />
                          <div 
                            className="image-fallback w-full h-full absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-muted"
                            style={{ display: 'none' }}
                          >
                            <Image className="h-8 w-8 mb-2 opacity-50" />
                            <span className="text-xs">Loading image...</span>
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-muted">
                          <Image className="h-8 w-8 mb-2 opacity-50" />
                          <span className="text-xs">No image URL</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
                        <div className="bg-white/90 rounded-full p-2">
                          <ExternalLink className="h-4 w-4 text-gray-700" />
                        </div>
                      </div>
                    </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Badge variant="outline" className="mb-2 text-xs">
                          {render.source?.replace(/_/g, ' ') || 'Unknown'}
                        </Badge>
                        {(render.social_templates as any)?.name && (
                          <p className="text-sm font-medium mb-1">
                            {(render.social_templates as any).name}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {render.summary_variant || 'Default'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {render.width || 1080} × {render.height || 1080}px
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      Generated {format(new Date(render.created_at), 'MMM d, HH:mm')}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handleDownloadImage(render)}
                        className="flex items-center gap-1 w-full"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </Button>
                      <Button 
                        size="sm" 
                        variant="secondary"
                        onClick={() => handleOpenImage(render)}
                        className="flex items-center gap-1 w-full"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => { navigator.clipboard.writeText(render.image_url); toast.success('Link copied'); }}
                        className="flex items-center gap-1 w-full"
                        title="Copy image URL"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        Copy link
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDeleteRender(render.id)}
                        className="flex items-center gap-1 w-full"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="schedules" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Schedules</h2>
            <div className="text-sm text-muted-foreground">Manage scheduled social renders</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {schedules.length === 0 ? (
              <Card className="border-dashed border-2 flex flex-col items-center justify-center p-8 min-h-[200px]">
                <ListChecks className="h-10 w-10 text-muted-foreground mb-2" />
                <div className="text-sm text-muted-foreground">No schedules yet</div>
              </Card>
            ) : (
              schedules.map((s) => (
                <Card key={s.id} className="p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">{s.source?.replace(/_/g,' ') || 'Social'}</div>
                    <div className="text-xs px-2 py-1 rounded border">
                      {s.status}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Type: {s.frequency} • TZ: {s.tz}
                  </div>
                  <div className="text-xs">Next run: {s.next_run_at_utc ? new Date(s.next_run_at_utc).toLocaleString() : '-'}</div>
                  <div className="text-xs">Last run: {s.last_run_at_utc ? new Date(s.last_run_at_utc).toLocaleString() : '-'}</div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button variant="default" size="sm" onClick={() => handleRunNow(s.id)} className="gap-1">
                      <Play className="h-4 w-4" /> Run Now
                    </Button>
                    {s.status !== 'PAUSED' && s.status !== 'COMPLETED' && s.status !== 'CANCELLED' && (
                      <Button variant="outline" size="sm" onClick={() => handleScheduleAction(s.id, 'pause')} className="gap-1">
                        <PauseCircle className="h-4 w-4" /> Pause
                      </Button>
                    )}
                    {s.status === 'PAUSED' && (
                      <Button variant="outline" size="sm" onClick={() => handleScheduleAction(s.id, 'resume')} className="gap-1">
                        <PlayCircle className="h-4 w-4" /> Resume
                      </Button>
                    )}
                    {s.status !== 'CANCELLED' && s.status !== 'COMPLETED' && (
                      <Button variant="outline" size="sm" onClick={() => handleScheduleAction(s.id, 'cancel')} className="gap-1">
                        <XCircle className="h-4 w-4" /> Cancel
                      </Button>
                    )}
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteSchedule(s.id)} className="gap-1">
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Template Designer Modal */}
      {showDesigner && (
        <TemplateDesigner
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onClose={() => {
            setShowDesigner(false);
            setEditingTemplate(null);
          }}
        />
      )}

      {/* Image Lightbox */}
      <Lightbox
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        imageUrl={lightboxImage.url}
        title={lightboxImage.title}
        onDownload={lightboxImage.render ? () => handleDownloadImage(lightboxImage.render) : undefined}
      />
    </div>
  );
};

export default SocialMediaLibrary;