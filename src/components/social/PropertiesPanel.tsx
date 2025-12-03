import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { TextLayer, AVAILABLE_TOKENS, FONT_FAMILIES } from "@/types/social";

interface PropertiesPanelProps {
  selectedLayer: TextLayer | null;
  onUpdateLayer: (layerId: string, updates: Partial<TextLayer>) => void;
}

export function PropertiesPanel({ selectedLayer, onUpdateLayer }: PropertiesPanelProps) {
  if (!selectedLayer) {
    return (
      <Card className="p-4 w-full lg:w-64">
        <div className="text-sm text-muted-foreground text-center py-8">
          Select a layer to edit properties
        </div>
      </Card>
    );
  }

  const insertToken = (token: string) => {
    const newContent = selectedLayer.content + `{{${token}}}`;
    onUpdateLayer(selectedLayer.id, { content: newContent });
  };

  return (
    <Card className="p-4 w-full lg:w-64 max-h-[600px] overflow-y-auto lg:sticky lg:top-4">
      <div className="space-y-4">
        <h3 className="font-semibold text-sm">Properties</h3>

        {/* Content */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">Content</Label>
          <Textarea
            value={selectedLayer.content}
            onChange={(e) => onUpdateLayer(selectedLayer.id, { content: e.target.value })}
            placeholder="Enter text or use tokens..."
            className="min-h-[60px] text-xs"
          />
          
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Insert tokens:</Label>
            <div className="flex flex-wrap gap-1">
              {AVAILABLE_TOKENS.map((token) => (
                <Button
                  key={token}
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs"
                  onClick={() => insertToken(token)}
                >
                  {token}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Style */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold">Style</Label>
          
          <div className="space-y-2">
            <Label className="text-xs">Font Family</Label>
            <Select
              value={selectedLayer.fontFamily}
              onValueChange={(value) => onUpdateLayer(selectedLayer.id, { fontFamily: value })}
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

          <div className="space-y-2">
            <Label className="text-xs">Font Size: {selectedLayer.fontSize}px</Label>
            <Slider
              value={[selectedLayer.fontSize]}
              onValueChange={([value]) => onUpdateLayer(selectedLayer.id, { fontSize: value })}
              min={8}
              max={120}
              step={1}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={selectedLayer.color}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { color: e.target.value })}
                className="w-12 h-8 p-1 border"
              />
              <Input
                type="text"
                value={selectedLayer.color}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { color: e.target.value })}
                className="flex-1 h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Weight</Label>
              <Select
                value={selectedLayer.fontWeight}
                onValueChange={(value: 'normal' | 'bold') => onUpdateLayer(selectedLayer.id, { fontWeight: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal" className="text-xs">Normal</SelectItem>
                  <SelectItem value="bold" className="text-xs">Bold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Style</Label>
              <Select
                value={selectedLayer.fontStyle}
                onValueChange={(value: 'normal' | 'italic') => onUpdateLayer(selectedLayer.id, { fontStyle: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal" className="text-xs">Normal</SelectItem>
                  <SelectItem value="italic" className="text-xs">Italic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Alignment</Label>
            <Select
              value={selectedLayer.textAlign}
              onValueChange={(value: 'left' | 'center' | 'right') => onUpdateLayer(selectedLayer.id, { textAlign: value })}
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

          <div className="space-y-2">
            <Label className="text-xs">Line Height: {selectedLayer.lineHeight}</Label>
            <Slider
              value={[selectedLayer.lineHeight]}
              onValueChange={([value]) => onUpdateLayer(selectedLayer.id, { lineHeight: value })}
              min={1.0}
              max={2.0}
              step={0.1}
              className="w-full"
            />
          </div>
        </div>

        {/* Position & Size */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold">Position & Size</Label>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">X</Label>
              <Input
                type="number"
                value={selectedLayer.x}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { x: parseInt(e.target.value) || 0 })}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Y</Label>
              <Input
                type="number"
                value={selectedLayer.y}
                onChange={(e) => onUpdateLayer(selectedLayer.id, { y: parseInt(e.target.value) || 0 })}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Width</Label>
            <Input
              type="number"
              value={selectedLayer.width}
              onChange={(e) => onUpdateLayer(selectedLayer.id, { width: parseInt(e.target.value) || 100 })}
              className="h-8 text-xs"
              min={50}
              max={1920}
            />
            <div className="text-xs text-muted-foreground">
              Controls text wrapping
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}