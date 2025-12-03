import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';
import { useTheme } from 'next-themes';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

// Lazy load emoji picker
let Picker: any = null;
let data: any = null;

export default function EmojiPicker({ onEmojiSelect }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [pickerLoaded, setPickerLoaded] = useState(false);
  const { resolvedTheme } = useTheme();

  // Lazy load emoji picker when popover opens
  useEffect(() => {
    if (open && !pickerLoaded) {
      const loadPicker = async () => {
        try {
          const [pickerModule, dataModule] = await Promise.all([
            import('@emoji-mart/react'),
            import('@emoji-mart/data')
          ]);
          Picker = pickerModule.default;
          data = dataModule.default;
          setPickerLoaded(true);
        } catch (error) {
          console.error('Failed to load emoji picker:', error);
        }
      };
      loadPicker();
    }
  }, [open, pickerLoaded]);

  const handleEmojiSelect = (emojiData: any) => {
    onEmojiSelect(emojiData.native);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <div className="max-h-[400px] overflow-auto">
          {pickerLoaded && Picker && data ? (
            <Picker
              data={data}
              onEmojiSelect={handleEmojiSelect}
              theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
              previewPosition="none"
              skinTonePosition="search"
              navPosition="bottom"
              searchPosition="top"
              perLine={8}
              maxFrequentRows={2}
            />
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              Loading emojis...
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}