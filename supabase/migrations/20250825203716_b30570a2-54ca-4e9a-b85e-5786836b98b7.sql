-- Create dynamic fields table for storing summary templates
CREATE TABLE public.dynamic_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id UUID NOT NULL,
  field_key TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  last_output_json JSONB,
  last_output_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(location_id, field_key)
);

-- Enable Row Level Security
ALTER TABLE public.dynamic_fields ENABLE ROW LEVEL SECURITY;

-- Create policies for dynamic fields
CREATE POLICY "Admins can manage all dynamic fields" 
ON public.dynamic_fields 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view dynamic fields for their location" 
ON public.dynamic_fields 
FOR SELECT 
USING (location_id = get_current_user_location_id());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_dynamic_fields_updated_at
BEFORE UPDATE ON public.dynamic_fields
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();