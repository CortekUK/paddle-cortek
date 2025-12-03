-- Add missing columns to social_post_renders if they don't exist
DO $$ 
BEGIN 
    -- Add message_content_raw column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'social_post_renders' AND column_name = 'message_content_raw') THEN
        ALTER TABLE public.social_post_renders ADD COLUMN message_content_raw text NOT NULL DEFAULT '';
    END IF;
    
    -- Add message_content_resolved column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'social_post_renders' AND column_name = 'message_content_resolved') THEN
        ALTER TABLE public.social_post_renders ADD COLUMN message_content_resolved text NOT NULL DEFAULT '';
    END IF;
    
    -- Add image_path column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'social_post_renders' AND column_name = 'image_path') THEN
        ALTER TABLE public.social_post_renders ADD COLUMN image_path text NOT NULL DEFAULT '';
    END IF;
    
    -- Add source check constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'social_post_renders' AND constraint_name = 'social_post_renders_source_check') THEN
        ALTER TABLE public.social_post_renders ADD CONSTRAINT social_post_renders_source_check CHECK (source IN ('COURTS', 'PARTIALS', 'COMPETITIONS'));
    END IF;
END $$;

-- Ensure social-posts bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('social-posts', 'social-posts', true)
ON CONFLICT (id) DO NOTHING;