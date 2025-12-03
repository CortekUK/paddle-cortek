import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Transformer } from 'react-konva';
import Konva from 'konva';
import { TextLayer } from '@/types/social';
import { SummaryFormat } from '@/types/social';
import { buildSummary, getTokenReplacements, compileMessage } from '@/lib/buildSummary';

interface ImageLayer {
  id: string;
  type: 'image';
  name?: string;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

type AnyLayer = TextLayer | ImageLayer;

interface SocialCanvasProps {
  canvasWidth: number;
  canvasHeight: number;
  backgroundUrl?: string;
  layers: AnyLayer[];
  selectedLayerId: string | null;
  pageData: any;
  onSelectLayer: (layerId: string | null) => void;
  onUpdateLayer: (layerId: string, updates: Partial<AnyLayer>) => void;
  zoom?: number;
}

export function SocialCanvas({
  canvasWidth,
  canvasHeight,
  backgroundUrl,
  layers,
  selectedLayerId,
  pageData,
  onSelectLayer,
  onUpdateLayer,
  zoom = 100,
}: SocialCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [layerImages, setLayerImages] = useState<Map<string, HTMLImageElement>>(new Map());
  const [containerWidth, setContainerWidth] = useState(400);

  // Calculate display scale to maximize canvas size
  const maxDisplayWidth = Math.min(800, containerWidth - 40);
  const maxDisplayHeight = 650; // Increased height for vertical layout
  const baseScale = Math.min(
    maxDisplayWidth / canvasWidth,
    maxDisplayHeight / canvasHeight,
    1
  );
  const displayScale = baseScale * (zoom / 100);

  // Observe container width changes
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width - 32; // Account for padding
        setContainerWidth(Math.max(200, width)); // Minimum width
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Load background image
  useEffect(() => {
    if (!backgroundUrl) return;

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setBackgroundImage(img);
    };
    img.src = backgroundUrl;
  }, [backgroundUrl]);

  // Load image layers
  useEffect(() => {
    const imageLayers = layers.filter((layer): layer is ImageLayer => layer.type === 'image' && 'imageUrl' in layer);
    
    imageLayers.forEach((layer) => {
      if (!layer.imageUrl || layerImages.has(layer.id)) return;

      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setLayerImages(prev => new Map(prev).set(layer.id, img));
      };
      img.onerror = () => {
        console.error('Failed to load image layer:', layer.imageUrl);
      };
      img.src = layer.imageUrl;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers]);

  // Update transformer when selection changes
  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;

    if (!transformer || !stage) return;

    if (selectedLayerId) {
      const selectedNode = stage.findOne(`#${selectedLayerId}`);
      if (selectedNode) {
        transformer.nodes([selectedNode]);
        transformer.getLayer()?.batchDraw();
      }
    } else {
      transformer.nodes([]);
    }
  }, [selectedLayerId]);

  const compileLayerText = (layer: TextLayer) => {
    if (!pageData || !layer.content) return layer.content || '';

    // Build summary for token replacement with format awareness
    let summary = buildSummary({
      category: pageData.category || 'COURT_AVAILABILITY',
      data: pageData.data || [],
      variant: pageData.variant || 'basic',
      target: pageData.target || 'TODAY',
      tz: pageData.tz || 'Europe/London',
      playtomicOffset: pageData.playtomicOffset || 0,
      clubName: pageData.clubName || 'Club',
      dateDisplayShort: pageData.dateDisplayShort || '',
      sport: pageData.sport || 'Padel',
      countSlots: pageData.countSlots || 0
    });

    // Apply summary formatting if layer has summary token and format settings
    if (layer.content.includes('{{summary}}') && layer.summaryFormat) {
      summary = formatSummaryWithSettings(summary, layer.summaryFormat);
    }

    // Get token replacements
    const replacements = getTokenReplacements({
      summary,
      clubName: pageData.clubName || 'Club',
      dateDisplayShort: pageData.dateDisplayShort || '',
      sport: pageData.sport || 'Padel',
      countSlots: pageData.countSlots || 0,
      messageContent: layer.content
    });

    // Compile the message
    return compileMessage(layer.content, replacements);
  };

  const formatSummaryWithSettings = (summary: string, format: SummaryFormat) => {
    // Parse the summary into time periods (this is a simplified version)
    const lines = summary.split('\n').filter(line => line.trim());
    const periods: { label: string, content: string }[] = [];
    
    lines.forEach(line => {
      if (line.toLowerCase().includes('morning')) {
        periods.push({ label: format.uppercaseLabels ? 'MORNING' : 'Morning', content: line });
      } else if (line.toLowerCase().includes('afternoon')) {
        periods.push({ label: format.uppercaseLabels ? 'AFTERNOON' : 'Afternoon', content: line });
      } else if (line.toLowerCase().includes('evening')) {
        periods.push({ label: format.uppercaseLabels ? 'EVENING' : 'Evening', content: line });
      }
    });

    if (periods.length === 0) return summary;

    // Apply formatting based on layout
    switch (format.layout) {
      case 'inline':
        return periods
          .map(p => format.includeLabels ? `${p.label} ${p.content.replace(p.label.toLowerCase(), '').replace(p.label, '').trim()}` : p.content.replace(p.label.toLowerCase(), '').replace(p.label, '').trim())
          .join(` ${format.separator} `);
      
      case 'paragraph':
        return periods
          .map(p => format.includeLabels ? `${p.label} ${p.content.replace(p.label.toLowerCase(), '').replace(p.label, '').trim()}` : p.content.replace(p.label.toLowerCase(), '').replace(p.label, '').trim())
          .join('. ') + '.';
      
      case 'bulleted':
      default:
        return periods
          .map(p => format.includeLabels ? `${p.label}: ${p.content.replace(p.label.toLowerCase(), '').replace(p.label, '').trim()}` : p.content.replace(p.label.toLowerCase(), '').replace(p.label, '').trim())
          .join('\n');
    }
  };

  const handleTextDragEnd = (layerId: string, e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    onUpdateLayer(layerId, {
      x: Math.round(node.x() / displayScale),
      y: Math.round(node.y() / displayScale),
    });
  };

  const handleTextTransformEnd = (layerId: string, e: Konva.KonvaEventObject<Event>) => {
    const node = e.target;
    
    // Reset scale and rotation, update width instead
    const newWidth = Math.round(Math.max(50, (node.width() * node.scaleX()) / displayScale));
    
    node.scaleX(1);
    node.scaleY(1);
    node.rotation(0);
    
    onUpdateLayer(layerId, {
      x: Math.round(node.x() / displayScale),
      y: Math.round(node.y() / displayScale),
      width: newWidth,
    });
  };

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // If clicking on empty area, deselect
    if (e.target === e.target.getStage()) {
      onSelectLayer(null);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="border rounded-lg overflow-hidden bg-muted/20 flex items-center justify-center p-6 w-full"
      style={{ minHeight: '500px' }}
    >
      <div className="relative shadow-xl">
        <Stage
          ref={stageRef}
          width={canvasWidth * displayScale}
          height={canvasHeight * displayScale}
          onClick={handleStageClick}
          className="border bg-white rounded-lg"
        >
          <Layer>
            {/* Background Image */}
            {backgroundImage && (
              <KonvaImage
                image={backgroundImage}
                width={canvasWidth * displayScale}
                height={canvasHeight * displayScale}
              />
            )}

            {/* Image Layers */}
            {layers
              .filter((layer): layer is ImageLayer => layer.type === 'image' && layer.visible)
              .map((layer) => {
                const layerImage = layerImages.get(layer.id);
                if (!layerImage) return null;

                return (
                  <KonvaImage
                    key={layer.id}
                    id={layer.id}
                    image={layerImage}
                    x={layer.x * displayScale}
                    y={layer.y * displayScale}
                    width={layer.width * displayScale}
                    height={layer.height * displayScale}
                    draggable
                    onDragEnd={(e) => {
                      const node = e.target;
                      onUpdateLayer(layer.id, {
                        x: Math.round(node.x() / displayScale),
                        y: Math.round(node.y() / displayScale),
                      });
                    }}
                    onTransformEnd={(e) => {
                      const node = e.target;
                      onUpdateLayer(layer.id, {
                        x: Math.round(node.x() / displayScale),
                        y: Math.round(node.y() / displayScale),
                        width: Math.round((node.width() * node.scaleX()) / displayScale),
                        height: Math.round((node.height() * node.scaleY()) / displayScale),
                      });
                      node.scaleX(1);
                      node.scaleY(1);
                    }}
                    onClick={() => onSelectLayer(layer.id)}
                    onTap={() => onSelectLayer(layer.id)}
                  />
                );
              })}

            {/* Text Layers */}
            {layers
              .filter((layer): layer is TextLayer => layer.type === 'text' && layer.visible)
              .map((layer) => {
                const compiledText = compileLayerText(layer);
                
                // Ensure all required properties have valid default values
                const safeLayer = {
                  x: typeof layer.x === 'number' && !isNaN(layer.x) ? layer.x : 50,
                  y: typeof layer.y === 'number' && !isNaN(layer.y) ? layer.y : 50,
                  width: typeof layer.width === 'number' && !isNaN(layer.width) && layer.width > 0 ? layer.width : 200,
                  fontSize: typeof layer.fontSize === 'number' && !isNaN(layer.fontSize) && layer.fontSize > 0 ? layer.fontSize : 24,
                  lineHeight: typeof layer.lineHeight === 'number' && !isNaN(layer.lineHeight) && layer.lineHeight > 0 ? layer.lineHeight : 1.2,
                  fontFamily: layer.fontFamily || 'Roboto',
                  fontWeight: layer.fontWeight || 'normal',
                  fontStyle: layer.fontStyle || 'normal',
                  color: layer.color || '#000000',
                  textAlign: layer.textAlign || 'left',
                  wordWrap: layer.wordWrap !== false // Default to true
                };
                
                return (
                  <Text
                    key={layer.id}
                    id={layer.id}
                    x={safeLayer.x * displayScale}
                    y={safeLayer.y * displayScale}
                    width={safeLayer.width * displayScale}
                    text={compiledText || ''}
                    fontSize={safeLayer.fontSize * displayScale}
                    fontFamily={safeLayer.fontFamily}
                    fontStyle={safeLayer.fontWeight === 'bold' ? 'bold' : 'normal'}
                    fontVariant={safeLayer.fontStyle}
                    fill={safeLayer.color}
                    align={safeLayer.textAlign}
                    lineHeight={safeLayer.lineHeight}
                    wrap={safeLayer.wordWrap ? 'word' : 'none'}
                    draggable
                    onDragEnd={(e) => handleTextDragEnd(layer.id, e)}
                    onTransformEnd={(e) => handleTextTransformEnd(layer.id, e)}
                    onClick={() => onSelectLayer(layer.id)}
                    onTap={() => onSelectLayer(layer.id)}
                  />
                );
              })}

            {/* Transformer for selected layer */}
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(oldBox, newBox) => {
                // Limit resize to positive dimensions
                if (newBox.width < 50 || newBox.height < 20) {
                  return oldBox;
                }
                return newBox;
              }}
              enabledAnchors={['middle-left', 'middle-right']}
              rotateEnabled={false}
            />
          </Layer>
        </Stage>
        
        {/* Canvas info overlay with safe margins indicator */}
        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
          {canvasWidth} × {canvasHeight}px
        </div>
        
        {/* Safe margin guides */}
        <div 
          className="absolute border border-dashed border-blue-300/50 pointer-events-none"
          style={{
            left: `${canvasWidth * displayScale * 0.05}px`,
            top: `${canvasHeight * displayScale * 0.05}px`,
            width: `${canvasWidth * displayScale * 0.9}px`,
            height: `${canvasHeight * displayScale * 0.9}px`
          }}
        />
      </div>
    </div>
  );
}