import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { SummaryFormat } from "@/types/social";

interface SummaryFormatControlsProps {
  format: SummaryFormat;
  onUpdate: (updates: Partial<SummaryFormat>) => void;
}

export function SummaryFormatControls({ format, onUpdate }: SummaryFormatControlsProps) {
  return (
    <Card className="p-4 space-y-4 border-blue-200 bg-blue-50/50">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <h4 className="font-medium text-sm">Summary Format Settings</h4>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Layout</Label>
          <Select
            value={format.layout}
            onValueChange={(value: 'inline' | 'bulleted' | 'paragraph') => 
              onUpdate({ layout: value })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inline">Inline</SelectItem>
              <SelectItem value="bulleted">Bulleted</SelectItem>
              <SelectItem value="paragraph">Paragraph</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Time Format</Label>
          <Select
            value={format.timeStyle}
            onValueChange={(value: '12h' | '24h') => onUpdate({ timeStyle: value })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12h">12 Hour</SelectItem>
              <SelectItem value="24h">24 Hour</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Range Joiner</Label>
          <Input
            value={format.rangeJoiner}
            onChange={(e) => onUpdate({ rangeJoiner: e.target.value })}
            className="h-8 text-xs"
            placeholder="–"
          />
        </div>

        {format.layout === 'inline' && (
          <div className="space-y-1">
            <Label className="text-xs">Separator</Label>
            <Input
              value={format.separator}
              onChange={(e) => onUpdate({ separator: e.target.value })}
              className="h-8 text-xs"
              placeholder="·"
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="include-labels"
            checked={format.includeLabels}
            onCheckedChange={(checked) => onUpdate({ includeLabels: checked })}
          />
          <Label htmlFor="include-labels" className="text-xs">Include time labels</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="uppercase-labels"
            checked={format.uppercaseLabels}
            onCheckedChange={(checked) => onUpdate({ uppercaseLabels: checked })}
          />
          <Label htmlFor="uppercase-labels" className="text-xs">Uppercase labels</Label>
        </div>

        {format.maxLines && (
          <div className="flex items-center space-x-2">
            <Label className="text-xs">Max lines:</Label>
            <Input
              type="number"
              value={format.maxLines}
              onChange={(e) => onUpdate({ maxLines: parseInt(e.target.value) || undefined })}
              className="w-16 h-8 text-xs"
              min={1}
              max={10}
            />
          </div>
        )}
      </div>
    </Card>
  );
}