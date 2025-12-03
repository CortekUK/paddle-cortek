-- Templates table for message templates
CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('AVAILABILITY')),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_message_templates_org_cat 
  ON public.message_templates(org_id, category);

-- Enable RLS
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for message_templates
CREATE POLICY "Templates: org members can view"
  ON public.message_templates FOR SELECT
  USING (is_org_member(org_id, auth.uid()) OR is_admin_user(auth.uid()));

CREATE POLICY "Templates: org owners/managers can manage"
  ON public.message_templates FOR ALL
  USING (is_org_owner_or_manager(org_id, auth.uid()) OR is_admin_user(auth.uid()))
  WITH CHECK (is_org_owner_or_manager(org_id, auth.uid()) OR is_admin_user(auth.uid()));

-- Scheduled sends table
CREATE TABLE IF NOT EXISTS public.scheduled_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('AVAILABILITY')),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PAUSED')),
  time_utc TIME NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'DAILY' CHECK (frequency = 'DAILY'),
  target TEXT NOT NULL CHECK (target IN ('TODAY','TOMORROW')),
  template_id UUID NOT NULL REFERENCES public.message_templates(id) ON DELETE RESTRICT,
  whatsapp_group TEXT NOT NULL,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_sends_due
  ON public.scheduled_sends(status, next_run_at);

-- Enable RLS
ALTER TABLE public.scheduled_sends ENABLE ROW LEVEL SECURITY;

-- RLS policies for scheduled_sends
CREATE POLICY "Schedules: org members can view"
  ON public.scheduled_sends FOR SELECT
  USING (is_org_member(org_id, auth.uid()) OR is_admin_user(auth.uid()));

CREATE POLICY "Schedules: org owners/managers can manage"
  ON public.scheduled_sends FOR ALL
  USING (is_org_owner_or_manager(org_id, auth.uid()) OR is_admin_user(auth.uid()))
  WITH CHECK (is_org_owner_or_manager(org_id, auth.uid()) OR is_admin_user(auth.uid()));

-- Send logs table
CREATE TABLE IF NOT EXISTS public.send_logs_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  schedule_id UUID REFERENCES public.scheduled_sends(id) ON DELETE SET NULL,
  whatsapp_group TEXT NOT NULL,
  message_excerpt TEXT,
  status TEXT NOT NULL,
  response_text TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.send_logs_v2 ENABLE ROW LEVEL SECURITY;

-- RLS policies for send_logs_v2  
CREATE POLICY "Send logs: org members can view"
  ON public.send_logs_v2 FOR SELECT
  USING (is_org_member(org_id, auth.uid()) OR is_admin_user(auth.uid()));

CREATE POLICY "Send logs: system can insert"
  ON public.send_logs_v2 FOR INSERT
  WITH CHECK (true);

-- Add club_name field to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS club_name TEXT;

-- Add triggers for updated_at
CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_sends_updated_at
  BEFORE UPDATE ON public.scheduled_sends
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();