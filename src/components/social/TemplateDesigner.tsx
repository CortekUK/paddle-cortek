import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { 
  Save, 
  Type, 
  Image as ImageIcon, 
  Square, 
  Upload
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationAuth } from '@/hooks/useOrganizationAuth';
import { toast } from 'sonner';
import { Stage, Layer, Text, Image as KonvaImage, Rect as KonvaRect, Transformer } from 'react-konva';
import Konva from 'konva';
import { CANVAS_PRESETS, CanvasPreset } from '@/types/social';

interface FabricLayer {
  id: string;
  type: 'text' | 'image' | 'shape' | 'qr';
  name: string;
  binding?: string; // Token binding (e.g., 'message_content', 'club_name')
  imageUrl?: string; // URL for image layers
  style: {
    left: number;
    top: number;
    width: number;
    height: number;
    fontSize?: number;
    fill?: string;
    fontFamily?: string;
    fontWeight?: string | number;
    textAlign?: string;
    locked?: boolean;
  };
  fabricObject?: any;
}

interface TemplateDesignerProps {
  template?: {
    id: string;
    name: string;
    bg_url: string;
    canvas_w: number;
    canvas_h: number;
    bg_natural_w?: number;
    bg_natural_h?: number;
    bg_fit?: 'cover' | 'contain';
    bg_offset_x?: number;
    bg_offset_y?: number;
    layers: FabricLayer[];
  };
  onSave: (template: any) => void;
  onClose: () => void;
}

const TemplateDesigner: React.FC<TemplateDesignerProps> = ({ template, onSave, onClose }) => {
  const { organization } = useOrganizationAuth();
  const [name, setName] = useState(template?.name || '');
  const [canvasPreset, setCanvasPreset] = useState<CanvasPreset>('instagram-portrait');
  const [canvasSize, setCanvasSize] = useState({ 
    w: template?.canvas_w || 1080, 
    h: template?.canvas_h || 1350 
  });
  const [fabricLayers, setFabricLayers] = useState<FabricLayer[]>(template?.layers || []);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [bgUrl, setBgUrl] = useState(template?.bg_url || '');
  const [bgNaturalW, setBgNaturalW] = useState(template?.bg_natural_w || 0);
  const [bgNaturalH, setBgNaturalH] = useState(template?.bg_natural_h || 0);
  // Default to 'contain' for better visibility - user can change to 'cover' if needed
  const [bgFit, setBgFit] = useState<'cover' | 'contain'>(template?.bg_fit || 'contain');
  const [bgOffsetX, setBgOffsetX] = useState(template?.bg_offset_x || 0);
  const [bgOffsetY, setBgOffsetY] = useState(template?.bg_offset_y || 0);
  const [bgStatus, setBgStatus] = useState<'loading' | 'ready' | 'error'>('ready');
  const [previewSource, setPreviewSource] = useState<'sample' | 'current' | 'saved'>('sample');
  const [isUploading, setIsUploading] = useState(false);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  const [layerImages, setLayerImages] = useState<Map<string, HTMLImageElement>>(new Map());

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sample data for preview
  const sampleTokens = {
    club_name: 'Padel Paradise Club',
    date_display_short: 'Mon 15',
    sport: 'Padel',
    summary: 'Courts available for booking tomorrow morning with great weather conditions.',
    count_slots: '12',
    message_content: 'Great news! 12 courts available tomorrow morning at Padel Paradise Club. Perfect weather conditions expected. Book now!'
  };

  // Konva Transformer selection handling
  useEffect(() => {
    if (!transformerRef.current || !stageRef.current) return;
    
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    
    if (selectedLayerId) {
      const layer = stage.findOne(`#${selectedLayerId}`);
      if (layer) {
        transformer.nodes([layer]);
        transformer.getLayer()?.batchDraw();
      }
    } else {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
    }
  }, [selectedLayerId]);

  // Initialize background image when URL changes
  useEffect(() => {
    if (bgUrl && !bgImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setBgNaturalW(img.naturalWidth);
        setBgNaturalH(img.naturalHeight);
        setBgImage(img);
        setBgStatus('ready');
      };
      img.onerror = () => {
        setBgStatus('error');
        toast.error('Failed to load background image');
      };
      img.src = bgUrl;
    }
  }, [bgUrl]);

  // Load images for existing image layers (from template)
  useEffect(() => {
    const imageLayers = fabricLayers.filter(layer => layer.type === 'image' && layer.imageUrl);
    
    imageLayers.forEach(layer => {
      // Only load if not already loaded
      if (!layerImages.has(layer.id) && layer.imageUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          setLayerImages(prev => new Map(prev).set(layer.id, img));
        };
        img.onerror = () => {
          console.error(`Failed to load image for layer ${layer.id}:`, layer.imageUrl);
          toast.error(`Failed to load image: ${layer.name}`);
        };
        img.src = layer.imageUrl;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fabricLayers]);


  // Note: Canvas dimensions are handled by the initialization effect above
  // When canvasSize changes, the canvas is recreated with new dimensions
  // This avoids Fabric.js v6 internal state issues with setDimensions

  // Helper functions for cover/contain calculations
  const computeCover = (imgW: number, imgH: number, canW: number, canH: number) => {
    const scale = Math.max(canW / imgW, canH / imgH);
    return { scale, drawW: imgW * scale, drawH: imgH * scale };
  };

  const computeContain = (imgW: number, imgH: number, canW: number, canH: number) => {
    const scale = Math.min(canW / imgW, canH / imgH);
    return { scale, drawW: imgW * scale, drawH: imgH * scale };
  };

  // Set background image for new uploads
  const setBackgroundImage = async (url: string) => {
    console.log('🖼️ Loading background image:', url);
    setBgStatus('loading');
    setBgUrl(url);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      // Wait for image to load with explicit error handling
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          console.log('✅ Image loaded successfully:', {
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            src: url
          });
          setBgNaturalW(img.naturalWidth);
          setBgNaturalH(img.naturalHeight);
          setBgImage(img);
          setBgStatus('ready');
          resolve();
        };
        img.onerror = (error) => {
          console.error('❌ Image failed to load:', error, url);
          setBgStatus('error');
          reject(new Error(`Failed to load image: ${url}`));
        };
        img.src = url;
      });
    } catch (error) {
      console.error('💥 Error in setBackgroundImage:', error);
      setBgStatus('error');
      toast.error(`Failed to load background image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  };

  // Note: Background rendering is handled by Konva in JSX

  // Handle manual URL input
  const handleBgUrlChange = (url: string) => {
    setBgUrl(url);
    if (url && url.trim()) {
      setBackgroundImage(url.trim());
    }
  };

  // Handle canvas preset changes
  const handleCanvasPresetChange = (preset: CanvasPreset) => {
    setCanvasPreset(preset);
    if (preset !== 'custom') {
      const presetSize = CANVAS_PRESETS[preset];
      setCanvasSize({ w: presetSize.width, h: presetSize.height });
    }
  };

  // Note: Konva renders layers automatically via JSX, no need for loadExistingLayers

  // Get sample text for token bindings
  const getSampleTextForBinding = (binding: string) => {
    const sampleData = sampleTokens as any;
    return sampleData[binding] || `{{${binding}}}`;
  };

  // Note: Konva handles updates via state, no need for updateLayerFromFabricObject

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !organization?.id) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a PNG or JPG image file');
      return;
    }

    setIsUploading(true);
    console.log('📤 Starting file upload:', file.name, file.type);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${organization.id}/${fileName}`;

      console.log('📤 Uploading to Supabase:', filePath);
      const { data, error } = await supabase.storage
        .from('social-templates')
        .upload(filePath, file);

      if (error) {
        console.error('💥 Supabase upload error:', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('social-templates')
        .getPublicUrl(filePath);

      console.log('📎 Generated public URL:', publicUrl);
      
      // Wait for the image to actually load and render before showing success
      await setBackgroundImage(publicUrl);
      toast.success('Background image uploaded and loaded successfully');
      
    } catch (error) {
      console.error('💥 Error in upload pipeline:', error);
      toast.error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      // Clear the file input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  // Add layer with Konva integration
  const addLayer = (type: FabricLayer['type']) => {
    console.log(`➕ Adding new ${type} layer...`);

    const layerId = `layer_${Date.now()}`;
    
    const newLayer: FabricLayer = {
      id: layerId,
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Layer`,
      binding: type === 'text' ? 'message_content' : undefined,
      style: {
        left: 100,
        top: 100,
        width: type === 'text' ? canvasSize.w - 40 : 200,
        height: 100,
        fontSize: 24,
        fill: '#000000',
        fontFamily: 'Inter',
        fontWeight: 700,
        textAlign: 'left',
        locked: false
      }
    };


    try {
      if (type === 'text') {
        // Konva: Just add to state, rendering happens via JSX
        setFabricLayers(prev => [...prev, newLayer]);
        setSelectedLayerId(layerId);
        console.log(`✅ Text layer added: ${layerId}`);
      } else if (type === 'image') {
        // Create file input for image upload
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file || !organization?.id) return;
          
          try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `${organization.id}/${fileName}`;
            
            const { data, error } = await supabase.storage
              .from('social-templates')
              .upload(filePath, file);
              
            if (error) throw error;
            
            const { data: { publicUrl } } = supabase.storage
              .from('social-templates')
              .getPublicUrl(filePath);
            
            // Konva: Load image and add to state
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              // Image loaded, add layer to state with URL and store image element
              const layerWithUrl = {
                ...newLayer,
                imageUrl: publicUrl
              };
              setFabricLayers(prev => [...prev, layerWithUrl]);
              setLayerImages(prev => new Map(prev).set(layerId, img));
              setSelectedLayerId(layerId);
              toast.success('Image added successfully');
            };
            img.onerror = () => {
              console.error('Error loading image');
              toast.error('Failed to load image');
            };
            img.src = publicUrl;
          } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('Failed to upload image');
          }
        };
        input.click();
        return; // Don't add layer yet, wait for image upload
        
      } else if (type === 'shape') {
        // Konva: Just add to state, rendering happens via JSX
        setFabricLayers(prev => [...prev, newLayer]);
        setSelectedLayerId(layerId);
        console.log(`✅ Shape layer added: ${layerId}`);
      } else if (type === 'qr') {
        // QR Code layer - placeholder for now
        console.warn(`⚠️ QR Code layer not yet implemented`);
        toast.info('QR Code layers coming soon!');
        return;
      } else {
        console.warn(`⚠️ Unknown layer type: "${type}"`);
        toast.error(`Unknown layer type: ${type}`);
        return;
      }
    } catch (error) {
      console.error('💥 Error adding layer:', error);
      toast.error(`Failed to add ${type} layer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Update layer with real-time preview
  const updateLayer = (layerId: string, updates: Partial<FabricLayer>) => {
    // Konva: Just update state, rendering happens via JSX
    setFabricLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, ...updates } : layer
    ));
  };

  // Delete layer
  const deleteLayer = (layerId: string) => {
    // Konva: Just remove from state, rendering happens via JSX
    setFabricLayers(prev => prev.filter(layer => layer.id !== layerId));
    // Clean up image cache
    setLayerImages(prev => {
      const newMap = new Map(prev);
      newMap.delete(layerId);
      return newMap;
    });
    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
    }
    if (editingLayerId === layerId) {
      setEditingLayerId(null);
    }
  };

  const selectedLayer = fabricLayers.find(layer => layer.id === selectedLayerId);

  // Save template
  const handleSave = () => {
    // Convert fabric objects to serializable format
    const layersData = fabricLayers.map(layer => ({
      ...layer,
      fabricObject: undefined // Remove fabric object reference
    }));

    const templateData = {
      id: template?.id,
      name,
      bg_url: bgUrl,
      bg_natural_w: bgNaturalW,
      bg_natural_h: bgNaturalH,
      bg_fit: bgFit,
      bg_offset_x: bgOffsetX,
      bg_offset_y: bgOffsetY,
      canvas_w: canvasSize.w,
      canvas_h: canvasSize.h,
      layers: layersData
    };
    
    onSave(templateData);
  };

  // Note: All Fabric.js code removed - Konva handles rendering via JSX

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-hidden">
      <div className="flex h-full">
        {/* Left Sidebar - Tools & Properties */}
        <div className="w-80 border-r bg-card overflow-y-auto">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Template Designer</h2>
              <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
            </div>
            
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter template name"
              />
            </div>
          </div>

          {/* Add Layer Buttons */}
          <div className="p-4 border-b">
            <Label className="text-sm font-medium">Add Layer</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => addLayer('text')}
                className="flex items-center gap-1"
              >
                <Type className="h-3 w-3" />
                Text
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => addLayer('image')}
                className="flex items-center gap-1"
              >
                <ImageIcon className="h-3 w-3" />
                Image
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => addLayer('shape')}
                className="flex items-center gap-1"
              >
                <Square className="h-3 w-3" />
                Shape
              </Button>
            </div>
          </div>

          {/* Layers List */}
          <div className="p-4 border-b flex-1 overflow-y-auto">
            <Label className="text-sm font-medium">Layers</Label>
            <div className="space-y-1 mt-2">
              {fabricLayers.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No layers yet. Add a layer above.
                </div>
              )}
              {fabricLayers.map((layer) => (
                <div 
                  key={layer.id}
                  className={`p-2 rounded border cursor-pointer ${
                    selectedLayerId === layer.id ? 'border-primary bg-primary/5' : 'border-border'
                  }`}
                  onClick={() => setSelectedLayerId(layer.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{layer.name}</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLayer(layer.id);
                      }}
                    >
                      ×
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Properties Panel - shown when layer selected */}
          {selectedLayer && selectedLayer.type === 'text' && (
            <div className="p-4 space-y-4 border-t bg-muted/30">
              <Label className="text-sm font-medium">Layer Properties</Label>
              
              <div>
                <Label className="text-xs">Text Binding</Label>
                <Select 
                  value={selectedLayer.binding || ''} 
                  onValueChange={(value) => updateLayer(selectedLayerId!, { binding: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="message_content">Message Content</SelectItem>
                    <SelectItem value="club_name">Club Name</SelectItem>
                    <SelectItem value="date_display_short">Date</SelectItem>
                    <SelectItem value="summary">Summary</SelectItem>
                    <SelectItem value="count_slots">Count</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Font Size: {selectedLayer.style.fontSize || 24}px</Label>
                <Slider
                  value={[selectedLayer.style.fontSize || 24]}
                  onValueChange={(value) => 
                    updateLayer(selectedLayerId!, {
                      style: { ...selectedLayer.style, fontSize: value[0] }
                    })
                  }
                  max={72}
                  min={8}
                  step={1}
                  className="mt-2"
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Color</Label>
                  <Input 
                    type="color"
                    value={selectedLayer.style.fill || '#000000'}
                    onChange={(e) =>
                      updateLayer(selectedLayerId!, {
                        style: { ...selectedLayer.style, fill: e.target.value }
                      })
                    }
                    className="mt-1 h-8"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Alignment</Label>
                  <Select 
                    value={selectedLayer.style.textAlign || 'left'}
                    onValueChange={(value) => 
                      updateLayer(selectedLayerId!, {
                        style: { ...selectedLayer.style, textAlign: value }
                      })
                    }
                  >
                    <SelectTrigger className="mt-1 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 bg-muted/20 overflow-auto">
          <div className="p-4">
            {/* Canvas Preview with Konva */}
            <div className="flex justify-center items-center p-4">
              <div 
                ref={containerRef}
                className="border-2 border-dashed border-border bg-white shadow-lg relative" 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  overflow: 'auto'
                }}
              >
                <Stage
                  ref={stageRef}
                  width={canvasSize.w}
                  height={canvasSize.h}
                  style={{ maxWidth: '100%', height: 'auto' }}
                >
                  <Layer>
                    {/* Background Image */}
                    {bgImage && bgStatus === 'ready' && bgNaturalW > 0 && bgNaturalH > 0 && (() => {
                      const canW = canvasSize.w;
                      const canH = canvasSize.h;
                      const { drawW, drawH } = bgFit === 'contain' 
                        ? computeContain(bgNaturalW, bgNaturalH, canW, canH)
                        : computeCover(bgNaturalW, bgNaturalH, canW, canH);
                      const x = ((canW - drawW) / 2) + bgOffsetX;
                      const y = ((canH - drawH) / 2) + bgOffsetY;
                      
                      return (
                        <KonvaImage
                          image={bgImage}
                          x={x}
                          y={y}
                          width={drawW}
                          height={drawH}
                        />
                      );
                    })()}
                    
                    {/* Text Layers */}
                    {fabricLayers
                      .filter(layer => layer.type === 'text')
                      .map((layer) => {
                        const sampleText = getSampleTextForBinding(layer.binding || 'message_content');
                        const maxWidth = canvasSize.w - 40;
                        
                        return (
                          <Text
                            key={layer.id}
                            id={layer.id}
                            x={layer.style.left}
                            y={layer.style.top}
                            width={Math.min(layer.style.width || maxWidth, maxWidth)}
                            text={sampleText}
                            fontSize={layer.style.fontSize || 24}
                            fontFamily={layer.style.fontFamily || 'Inter'}
                            fontStyle={layer.style.fontWeight === 'bold' || layer.style.fontWeight === '700' ? 'bold' : 'normal'}
                            fill={layer.style.fill || '#000000'}
                            align={layer.style.textAlign || 'left'}
                            lineHeight={1.2}
                            wrap="word"
                            draggable
                            onDragEnd={(e) => {
                              updateLayer(layer.id, {
                                style: {
                                  ...layer.style,
                                  left: e.target.x(),
                                  top: e.target.y()
                                }
                              });
                            }}
                            onTransformEnd={(e) => {
                              const node = e.target;
                              updateLayer(layer.id, {
                                style: {
                                  ...layer.style,
                                  left: node.x(),
                                  top: node.y(),
                                  width: Math.min(node.width() * node.scaleX(), maxWidth),
                                  height: node.height() * node.scaleY()
                                }
                              });
                              node.scaleX(1);
                              node.scaleY(1);
                            }}
                            onClick={() => setSelectedLayerId(layer.id)}
                            onDblClick={() => {
                              setEditingLayerId(layer.id);
                              setEditingText(sampleText);
                            }}
                          />
                        );
                      })}

                    {/* Image Layers */}
                    {fabricLayers
                      .filter(layer => layer.type === 'image' && layer.imageUrl)
                      .map((layer) => {
                        const layerImage = layerImages.get(layer.id);
                        if (!layerImage) return null;
                        
                        return (
                          <KonvaImage
                            key={layer.id}
                            id={layer.id}
                            image={layerImage}
                            x={layer.style.left}
                            y={layer.style.top}
                            width={layer.style.width}
                            height={layer.style.height}
                            draggable
                            onDragEnd={(e) => {
                              updateLayer(layer.id, {
                                style: {
                                  ...layer.style,
                                  left: e.target.x(),
                                  top: e.target.y()
                                }
                              });
                            }}
                            onTransformEnd={(e) => {
                              const node = e.target;
                              updateLayer(layer.id, {
                                style: {
                                  ...layer.style,
                                  left: node.x(),
                                  top: node.y(),
                                  width: node.width() * node.scaleX(),
                                  height: node.height() * node.scaleY()
                                }
                              });
                              node.scaleX(1);
                              node.scaleY(1);
                            }}
                            onClick={() => setSelectedLayerId(layer.id)}
                          />
                        );
                      })}

                    {/* Shape Layers */}
                    {fabricLayers
                      .filter(layer => layer.type === 'shape')
                      .map((layer) => (
                        <KonvaRect
                          key={layer.id}
                          id={layer.id}
                          x={layer.style.left}
                          y={layer.style.top}
                          width={layer.style.width}
                          height={layer.style.height}
                          fill="#4f46e5"
                          stroke="#000000"
                          strokeWidth={2}
                          draggable
                          onDragEnd={(e) => {
                            updateLayer(layer.id, {
                              style: {
                                ...layer.style,
                                left: e.target.x(),
                                top: e.target.y()
                              }
                            });
                          }}
                          onClick={() => setSelectedLayerId(layer.id)}
                        />
                      ))}
                    
                    {/* Transformer for selected layer */}
                    {selectedLayerId && (() => {
                      const selectedLayer = fabricLayers.find(l => l.id === selectedLayerId);
                      const isTextLayer = selectedLayer?.type === 'text';
                      
                      return (
                        <Transformer
                          ref={transformerRef}
                          boundBoxFunc={(oldBox, newBox) => {
                            const maxWidth = canvasSize.w - 40;
                            const maxHeight = canvasSize.h - 40;
                            
                            // For text layers, restrict width to maintain word wrapping
                            if (isTextLayer && newBox.width > maxWidth) {
                              return { ...oldBox, width: maxWidth };
                            }
                            
                            // For all layers, enforce minimum and maximum dimensions
                            if (newBox.width < 50 || newBox.height < 20) {
                              return oldBox;
                            }
                            
                            if (newBox.width > maxWidth) {
                              return { ...oldBox, width: maxWidth };
                            }
                            
                            if (newBox.height > maxHeight) {
                              return { ...oldBox, height: maxHeight };
                            }
                            
                            return newBox;
                          }}
                          rotateEnabled={false}
                        />
                      );
                    })()}
                  </Layer>
                </Stage>
                
                {/* HTML Text Editor Overlay */}
                {editingLayerId && (() => {
                  const layer = fabricLayers.find(l => l.id === editingLayerId);
                  if (!layer) return null;
                  const maxWidth = canvasSize.w - 40;
                  
                  return (
                    <div
                      contentEditable
                      suppressContentEditableWarning
                      style={{
                        position: 'absolute',
                        left: `${layer.style.left}px`,
                        top: `${layer.style.top}px`,
                        width: `${Math.min(layer.style.width || maxWidth, maxWidth)}px`,
                        minHeight: '20px',
                        fontSize: `${layer.style.fontSize || 24}px`,
                        fontFamily: layer.style.fontFamily || 'Inter',
                        fontWeight: layer.style.fontWeight || 700,
                        color: layer.style.fill || '#000000',
                        textAlign: (layer.style.textAlign || 'left') as any,
                        lineHeight: 1.2,
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                        whiteSpace: 'pre-wrap',
                        outline: '2px solid #4f46e5',
                        padding: '4px',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        zIndex: 1000,
                        maxWidth: `${maxWidth}px`,
                        boxSizing: 'border-box'
                      }}
                      onBlur={(e) => {
                        const newText = e.currentTarget.textContent || '';
                        // Update layer text content would go here
                        setEditingLayerId(null);
                      }}
                      onInput={(e) => {
                        const div = e.currentTarget;
                        div.style.height = 'auto';
                        div.style.height = `${div.scrollHeight}px`;
                      }}
                    >
                      {editingText}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Actions */}
        <div className="w-60 border-l bg-card p-4">
          <div className="space-y-4">
            <div>
              <Label>Canvas Size</Label>
              <div className="mt-2">
                <Select value={canvasPreset} onValueChange={(value: CanvasPreset) => handleCanvasPresetChange(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-background border shadow-lg">
                    {Object.entries(CANVAS_PRESETS).map(([key, preset]) => (
                      <SelectItem key={key} value={key} className="cursor-pointer hover:bg-muted">
                        {preset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Background Image</Label>
              <div className="space-y-2 mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || bgStatus === 'loading' || !organization?.id}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? 'Uploading...' : bgStatus === 'loading' ? 'Loading...' : 'Upload PNG/JPG'}
                </Button>
                
                {bgStatus === 'error' && (
                  <div className="text-xs text-destructive">Failed to load image</div>
                )}
                
                {bgUrl && (
                  <Select value={bgFit} onValueChange={(value: 'cover' | 'contain') => setBgFit(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cover">Cover (fill canvas)</SelectItem>
                      <SelectItem value="contain">Contain (fit inside)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button onClick={handleSave} className="w-full mb-2">
                <Save className="h-4 w-4 mr-2" />
                Save Template
              </Button>
              <Button variant="outline" onClick={onClose} className="w-full">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


export default TemplateDesigner;