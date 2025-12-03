-- Add missing RLS policies for social_post_schedules table
DO $$ 
BEGIN
    -- Check if policies exist before creating them
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'social_post_schedules' 
        AND policyname = 'Schedules: org members can view'
    ) THEN
        CREATE POLICY "Schedules: org members can view" 
        ON social_post_schedules FOR SELECT 
        USING (is_org_member(org_id, auth.uid()) OR is_admin_user(auth.uid()));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'social_post_schedules' 
        AND policyname = 'Schedules: org owners/managers can manage'
    ) THEN
        CREATE POLICY "Schedules: org owners/managers can manage" 
        ON social_post_schedules FOR ALL 
        USING (is_org_owner_or_manager(org_id, auth.uid()) OR is_admin_user(auth.uid()))
        WITH CHECK (is_org_owner_or_manager(org_id, auth.uid()) OR is_admin_user(auth.uid()));
    END IF;
END $$;