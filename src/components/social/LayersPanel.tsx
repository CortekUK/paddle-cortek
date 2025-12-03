import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Eye, EyeOff, Trash2, GripVertical, Edit } from "lucide-react";
import { TextLayer } from "@/types/social";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface LayersPanelProps {
  layers: TextLayer[];
  selectedLayerId: string | null;
  onAddTextLayer: () => void;
  onSelectLayer: (layerId: string) => void;
  onToggleLayerVisibility: (layerId: string) => void;
  onDeleteLayer: (layerId: string) => void;
  onReorderLayers: (layerIds: string[]) => void;
  onRenameLayer: (layerId: string, newName: string) => void;
}

export function LayersPanel({
  layers,
  selectedLayerId,
  onAddTextLayer,
  onSelectLayer,
  onToggleLayerVisibility,
  onDeleteLayer,
  onReorderLayers,
  onRenameLayer,
}: LayersPanelProps) {
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  
  const getLayerDisplayName = (layer: TextLayer) => {
    if (layer.name) return layer.name;
    if (!layer.content || layer.content.trim() === '') return 'Text Layer';
    const content = layer.content.replace(/\{\{[^}]*\}\}/g, '').trim();
    return content.length > 18 ? content.substring(0, 18) + '...' : content || 'Text Layer';
  };

  const handleStartRename = (layer: TextLayer) => {
    setEditingLayerId(layer.id);
    setEditingName(layer.name || getLayerDisplayName(layer));
  };

  const handleFinishRename = () => {
    if (editingLayerId && editingName.trim()) {
      onRenameLayer(editingLayerId, editingName.trim());
    }
    setEditingLayerId(null);
    setEditingName('');
  };

  const handleCancelRename = () => {
    setEditingLayerId(null);
    setEditingName('');
  };

  return (
    <Card className="p-4 w-full h-fit max-h-[700px] overflow-y-auto">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Layers</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={onAddTextLayer}
            className="h-8 px-2"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Text
          </Button>
        </div>

        <div className="space-y-2">
          {layers.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No layers yet. Add your first text layer.
            </div>
          ) : (
            layers.map((layer, index) => (
              <div
                key={layer.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-accent/50 transition-colors",
                  selectedLayerId === layer.id && "border-primary bg-accent"
                )}
                onClick={() => onSelectLayer(layer.id)}
              >
                <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  {editingLayerId === layer.id ? (
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={handleFinishRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleFinishRename();
                        if (e.key === 'Escape') handleCancelRename();
                      }}
                      className="h-6 text-xs"
                      autoFocus
                    />
                  ) : (
                    <div 
                      className="text-xs font-medium truncate cursor-pointer hover:text-primary"
                      onClick={() => handleStartRename(layer)}
                      title="Click to rename"
                    >
                      {getLayerDisplayName(layer)}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Layer {layers.length - index}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartRename(layer);
                  }}
                  title="Rename layer"
                >
                  <Edit className="h-3 w-3" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLayerVisibility(layer.id);
                  }}
                >
                  {layer.visible ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3" />
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteLayer(layer.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}