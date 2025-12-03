-- Create wa_templates table
CREATE TABLE IF NOT EXISTS public.wa_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, category, name)
);

-- Create wa_messages_log table
CREATE TABLE IF NOT EXISTS public.wa_messages_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  category TEXT NOT NULL,
  template_id UUID,
  whatsapp_group_name TEXT NOT NULL,
  payload_message TEXT NOT NULL,
  emulator_url TEXT NOT NULL,
  emulator_result JSONB,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.wa_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_messages_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for wa_templates
CREATE POLICY "client read/write own templates"
ON public.wa_templates
FOR ALL
TO authenticated
USING (tenant_id = (SELECT tenant_id FROM organizations WHERE id = current_org_id()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM organizations WHERE id = current_org_id()));

-- RLS policies for wa_messages_log
CREATE POLICY "client read own logs"
ON public.wa_messages_log
FOR SELECT
TO authenticated
USING (tenant_id = (SELECT tenant_id FROM organizations WHERE id = current_org_id()));

CREATE POLICY "client insert logs"
ON public.wa_messages_log
FOR INSERT
TO authenticated
WITH CHECK (tenant_id = (SELECT tenant_id FROM organizations WHERE id = current_org_id()));

-- Create function to update updated_at on wa_templates
CREATE OR REPLACE FUNCTION public.update_wa_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for wa_templates updated_at
CREATE TRIGGER update_wa_templates_updated_at
  BEFORE UPDATE ON public.wa_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wa_templates_updated_at();