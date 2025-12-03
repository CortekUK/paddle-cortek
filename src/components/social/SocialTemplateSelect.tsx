import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, Plus, Image } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Template {
  id: string;
  name: string;
  bg_url: string;
  canvas_w: number;
  canvas_h: number;
}

interface SocialTemplateSelectProps {
  templates: Template[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  onCreateTemplate?: () => void;
}

export const SocialTemplateSelect: React.FC<SocialTemplateSelectProps> = ({
  templates,
  value,
  onValueChange,
  placeholder = "Select a template...",
  onCreateTemplate
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedTemplate = templates.find(template => template.id === value);

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-auto p-3"
        >
          {selectedTemplate ? (
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded bg-muted flex-shrink-0 overflow-hidden">
                {selectedTemplate.bg_url ? (
                  <img 
                    src={selectedTemplate.bg_url} 
                    alt={selectedTemplate.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium">{selectedTemplate.name}</div>
                <div className="text-xs text-muted-foreground">
                  {selectedTemplate.canvas_w} × {selectedTemplate.canvas_h}px
                </div>
              </div>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-full p-0" style={{ width: 'var(--radix-popover-trigger-width)' }}>
        <Command>
          <CommandInput 
            placeholder="Search templates..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandEmpty>No templates found.</CommandEmpty>
          <CommandGroup>
            {filteredTemplates.map((template) => (
              <CommandItem
                key={template.id}
                value={template.id}
                onSelect={() => {
                  onValueChange(template.id === value ? "" : template.id);
                  setOpen(false);
                }}
                className="flex items-center gap-3 p-3"
              >
                <div className="w-20 h-20 rounded bg-muted flex-shrink-0 overflow-hidden">
                  {template.bg_url ? (
                    <img 
                      src={template.bg_url} 
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{template.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {template.canvas_w} × {template.canvas_h}px
                  </div>
                </div>
                <Check
                  className={cn(
                    "ml-auto h-4 w-4",
                    value === template.id ? "opacity-100" : "opacity-0"
                  )}
                />
              </CommandItem>
            ))}
            
            {/* Create Template Option */}
            {onCreateTemplate && (
              <>
                {filteredTemplates.length > 0 && (
                  <div className="border-t mx-1 my-1" />
                )}
                <CommandItem
                  onSelect={() => {
                    onCreateTemplate();
                    setOpen(false);
                  }}
                  className="flex items-center gap-3 p-3 text-primary"
                >
                  <div className="w-20 h-20 rounded bg-primary/10 flex-shrink-0 flex items-center justify-center">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">Create Template</div>
                    <div className="text-sm text-muted-foreground">
                      Design a new social media template
                    </div>
                  </div>
                </CommandItem>
              </>
            )}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};