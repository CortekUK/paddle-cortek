-- Add Playtomic fields to locations table
ALTER TABLE public.locations 
ADD COLUMN tenant_id text,
ADD COLUMN playtomic_url text;

-- Create fetch_snapshots table for saving API snapshots
CREATE TABLE public.fetch_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id uuid NOT NULL,
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  tenant_id text NOT NULL,
  filters jsonb,
  url text NOT NULL,
  status_code integer,
  response_body jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on fetch_snapshots
ALTER TABLE public.fetch_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies for fetch_snapshots
CREATE POLICY "Admins can manage all snapshots" 
ON public.fetch_snapshots 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view snapshots for their location" 
ON public.fetch_snapshots 
FOR SELECT 
USING (location_id = get_current_user_location_id());