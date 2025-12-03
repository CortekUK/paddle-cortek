-- Update existing emulator URLs in locations table
UPDATE public.locations 
SET emulator_url = 'http://jonhillyer.ddns.net:5000/message'
WHERE emulator_url = 'http://81.78.219.62:5000/message';

-- Update the default for future locations
ALTER TABLE public.locations 
ALTER COLUMN emulator_url SET DEFAULT 'http://jonhillyer.ddns.net:5000/message';

-- Update the run_scheduled_sends_v2 function to use the new URL
CREATE OR REPLACE FUNCTION public.run_scheduled_sends_v2()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
      club_name := COALESCE(schedule_record.org_name, 'Club');
      club_timezone := schedule_record.tz;
      
      IF schedule_record.target = 'TODAY' THEN
        target_date := (NOW() AT TIME ZONE club_timezone)::DATE;
      ELSE
        target_date := (NOW() AT TIME ZONE club_timezone)::DATE + INTERVAL '1 day';
      END IF;
      
      message_content := schedule_record.template_content;
      message_content := REPLACE(message_content, '{{club_name}}', club_name);
      message_content := REPLACE(message_content, '{{date_display_short}}', TO_CHAR(target_date, 'Mon DD'));
      message_content := REPLACE(message_content, '{{sport}}', 'Padel');
      message_content := REPLACE(message_content, '{{summary}}', 'Courts available');
      message_content := REPLACE(message_content, '{{count_slots}}', '0');
      
      -- Updated emulator URL
      emulator_url := 'http://jonhillyer.ddns.net:5000/message?WhatsAppGroup=' || 
                     encode(schedule_record.whatsapp_group::bytea, 'escape') || 
                     '&Message=' || 
                     encode(message_content::bytea, 'escape');
      
      SELECT INTO emulator_response, emulator_success
        CASE 
          WHEN (net.http_get(emulator_url)).status_code = 200 THEN
            (net.http_get(emulator_url)).content::text
          ELSE
            'Error: HTTP ' || (net.http_get(emulator_url)).status_code::text
        END,
        (net.http_get(emulator_url)).status_code = 200;
      
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
      
      next_run_timestamp := (
        (NOW() AT TIME ZONE club_timezone)::DATE + INTERVAL '1 day' + 
        (schedule_record.time_local::TIME)
      ) AT TIME ZONE club_timezone;
      
      UPDATE public.scheduled_sends_v2 
      SET 
        next_run_at_utc = next_run_timestamp,
        last_run_at_utc = NOW(),
        last_status = CASE WHEN emulator_success THEN 'OK' ELSE 'ERROR' END,
        last_error = CASE WHEN emulator_success THEN NULL ELSE emulator_response END,
        updated_at = NOW()
      WHERE id = schedule_record.id;
      
      processed_count := processed_count + 1;
      
      results := results || jsonb_build_object(
        'schedule_id', schedule_record.id,
        'name', schedule_record.name,
        'status', CASE WHEN emulator_success THEN 'OK' ELSE 'ERROR' END,
        'next_run', next_run_timestamp
      );
      
    EXCEPTION WHEN OTHERS THEN
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
$function$;