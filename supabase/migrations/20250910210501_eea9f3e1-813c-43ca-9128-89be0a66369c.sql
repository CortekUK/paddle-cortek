-- Create social_renders table if it doesn't exist
CREATE TABLE IF NOT EXISTS social_renders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('COURT_AVAILABILITY', 'PARTIAL_MATCHES', 'COMPETITIONS')),
  template_id UUID REFERENCES social_templates(id) ON DELETE CASCADE,
  compiled_text TEXT NOT NULL,
  compiled_payload JSONB NOT NULL,
  bg_url TEXT,
  layers JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RENDERING', 'COMPLETED', 'FAILED')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create social_post_schedules table if it doesn't exist
CREATE TABLE IF NOT EXISTS social_post_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('COURT_AVAILABILITY', 'PARTIAL_MATCHES', 'COMPETITIONS')),
  template_id UUID NOT NULL REFERENCES social_templates(id) ON DELETE CASCADE,
  compiled_payload JSONB NOT NULL,
  run_at_utc TIMESTAMPTZ NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'ONCE' CHECK (frequency IN ('ONCE', 'DAILY', 'WEEKLY')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED')),
  last_run_at_utc TIMESTAMPTZ,
  next_run_at_utc TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Update social_templates columns if they don't exist
ALTER TABLE social_templates 
  ADD COLUMN IF NOT EXISTS canvas_w INTEGER NOT NULL DEFAULT 1080,
  ADD COLUMN IF NOT EXISTS canvas_h INTEGER NOT NULL DEFAULT 1080;

-- Update existing layers column
UPDATE social_templates SET layers = '[]'::jsonb WHERE layers IS NULL;

-- Enable RLS if not already enabled
ALTER TABLE social_renders ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_post_schedules ENABLE ROW LEVEL SECURITY;

-- Add triggers if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_social_renders_updated_at'
    ) THEN
        CREATE TRIGGER update_social_renders_updated_at
        BEFORE UPDATE ON social_renders
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_social_post_schedules_updated_at'
    ) THEN
        CREATE TRIGGER update_social_post_schedules_updated_at
        BEFORE UPDATE ON social_post_schedules
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create storage bucket for rendered images if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('social-renders', 'social-renders', true)
ON CONFLICT (id) DO NOTHING;