-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any existing cron jobs
SELECT cron.unschedule('run-scheduled-sends-v2') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'run-scheduled-sends-v2'
);

-- Create the scheduled sends runner function
CREATE OR REPLACE FUNCTION public.run_scheduled_sends_v2()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  schedule_record RECORD;
  template_content TEXT;
  club_name TEXT;
  club_timezone TEXT;
  target_date DATE;
  availability_data JSONB;
  message_content TEXT;
  emulator_url TEXT;
  emulator_response TEXT;
  emulator_success BOOLEAN;
  next_run_timestamp TIMESTAMPTZ;
  processed_count INTEGER := 0;
  results JSONB := '[]'::jsonb;
BEGIN
  -- Process all due schedules
  FOR schedule_record IN
    SELECT ss.*, mt.content as template_content, org.name as org_name, org.tenant_id
    FROM public.scheduled_sends_v2 ss
    JOIN public.message_templates mt ON ss.template_id = mt.id
    JOIN public.organizations org ON ss.org_id = org.id
    WHERE ss.status = 'ACTIVE' 
      AND ss.next_run_at_utc <= NOW()
    ORDER BY ss.next_run_at_utc
    LIMIT 50
  LOOP
    BEGIN
      -- Get organization details
      club_name := COALESCE(schedule_record.org_name, 'Club');
      club_timezone := schedule_record.tz;
      
      -- Calculate target date based on schedule target and timezone
      IF schedule_record.target = 'TODAY' THEN
        target_date := (NOW() AT TIME ZONE club_timezone)::DATE;
      ELSE -- TOMORROW
        target_date := (NOW() AT TIME ZONE club_timezone)::DATE + INTERVAL '1 day';
      END IF;
      
      -- Build the message (simplified - using template as-is for now)
      message_content := schedule_record.template_content;
      
      -- Replace basic tokens
      message_content := REPLACE(message_content, '{{club_name}}', club_name);
      message_content := REPLACE(message_content, '{{date_display_short}}', TO_CHAR(target_date, 'Mon DD'));
      message_content := REPLACE(message_content, '{{sport}}', 'Padel');
      message_content := REPLACE(message_content, '{{summary}}', 'Courts available');
      message_content := REPLACE(message_content, '{{count_slots}}', '0');
      
      -- Build emulator URL
      emulator_url := 'http://81.78.219.62:5000/message?WhatsAppGroup=' || 
                     encode(schedule_record.whatsapp_group::bytea, 'escape') || 
                     '&Message=' || 
                     encode(message_content::bytea, 'escape');
      
      -- Call emulator using pg_net
      SELECT INTO emulator_response, emulator_success
        CASE 
          WHEN (net.http_get(emulator_url)).status_code = 200 THEN
            (net.http_get(emulator_url)).content::text
          ELSE
            'Error: HTTP ' || (net.http_get(emulator_url)).status_code::text
        END,
        (net.http_get(emulator_url)).status_code = 200;
      
      -- Log the send
      INSERT INTO public.send_logs_v2 (
        org_id, 
        schedule_id, 
        category, 
        status, 
        response_text, 
        message_excerpt,
        whatsapp_group
      ) VALUES (
        schedule_record.org_id,
        schedule_record.id,
        'COURT_AVAILABILITY',
        CASE WHEN emulator_success THEN 'OK' ELSE 'ERROR' END,
        emulator_response,
        LEFT(message_content, 100),
        schedule_record.whatsapp_group
      );
      
      -- Calculate next run time (same time tomorrow in club timezone)
      next_run_timestamp := (
        (NOW() AT TIME ZONE club_timezone)::DATE + INTERVAL '1 day' + 
        (schedule_record.time_local::TIME)
      ) AT TIME ZONE club_timezone;
      
      -- Update schedule
      UPDATE public.scheduled_sends_v2 
      SET 
        next_run_at_utc = next_run_timestamp,
        last_run_at_utc = NOW(),
        last_status = CASE WHEN emulator_success THEN 'OK' ELSE 'ERROR' END,
        last_error = CASE WHEN emulator_success THEN NULL ELSE emulator_response END,
        updated_at = NOW()
      WHERE id = schedule_record.id;
      
      processed_count := processed_count + 1;
      
      -- Add to results
      results := results || jsonb_build_object(
        'schedule_id', schedule_record.id,
        'name', schedule_record.name,
        'status', CASE WHEN emulator_success THEN 'OK' ELSE 'ERROR' END,
        'next_run', next_run_timestamp
      );
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error
      INSERT INTO public.send_logs_v2 (
        org_id, 
        schedule_id, 
        category, 
        status, 
        response_text, 
        message_excerpt,
        whatsapp_group
      ) VALUES (
        schedule_record.org_id,
        schedule_record.id,
        'COURT_AVAILABILITY',
        'ERROR',
        SQLERRM,
        'Function error',
        schedule_record.whatsapp_group
      );
      
      -- Update schedule with error
      UPDATE public.scheduled_sends_v2 
      SET 
        last_run_at_utc = NOW(),
        last_status = 'ERROR',
        last_error = SQLERRM,
        updated_at = NOW()
      WHERE id = schedule_record.id;
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'processed', processed_count,
    'results', results
  );
END;
$$;

-- Create cron job to run every 5 minutes
SELECT cron.schedule(
  'run-scheduled-sends-v2',
  '*/5 * * * *',
  'SELECT public.run_scheduled_sends_v2();'
);