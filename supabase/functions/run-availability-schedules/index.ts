import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get due schedules
    const { data: schedules, error: scheduleError } = await supabase
      .from('scheduled_sends')
      .select(`
        *,
        organizations!inner(tenant_id, club_name, name),
        message_templates!inner(content)
      `)
      .eq('status', 'ACTIVE')
      .lte('next_run_at', new Date().toISOString());

    if (scheduleError) {
      console.error('Error fetching schedules:', scheduleError);
      return new Response(JSON.stringify({ error: scheduleError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing ${schedules?.length || 0} due schedules at ${new Date().toISOString()}`, 
      schedules?.map(s => ({ id: s.id, name: s.name, next_run_at: s.next_run_at })));

    if (!schedules || schedules.length === 0) {
      return new Response(JSON.stringify({ message: 'No schedules due' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const results = [];

    for (const schedule of schedules) {
      try {
        console.log(`Processing schedule: ${schedule.name} (${schedule.id})`);
        
        // Calculate next run time (24 hours later)
        const nextRun = new Date();
        const [hours, minutes] = schedule.time_utc.split(':');
        nextRun.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);
        nextRun.setUTCDate(nextRun.getUTCDate() + 1);
        
        console.log(`Next run calculated: ${nextRun.toISOString()}`);

        // Build emulator URL and send message
        const message = schedule.message_templates?.content || 'Scheduled message';
        const emulatorUrl = `http://jonhillyer.ddns.net:5000/message?WhatsAppGroup=${encodeURIComponent(schedule.whatsapp_group)}&Message=${encodeURIComponent(message)}`;
        
        console.log(`Calling emulator URL: ${emulatorUrl}`);
        
        const response = await fetch(emulatorUrl, { 
          method: 'GET',
          signal: AbortSignal.timeout(30000)
        });
        
        const responseText = await response.text();
        const status = responseText.includes('OK') ? 'OK' : 'ERROR';
        
        console.log(`Emulator response (${response.status}): ${responseText.substring(0, 200)}...`);

        // Log the send attempt
        await supabase.from('send_logs_v2').insert({
          org_id: schedule.org_id,
          category: schedule.category,
          schedule_id: schedule.id,
          whatsapp_group: schedule.whatsapp_group,
          message_excerpt: message.substring(0, 240),
          status,
          response_text: responseText
        });

        // Update next run time
        await supabase
          .from('scheduled_sends')
          .update({
            last_run_at: new Date().toISOString(),
            next_run_at: nextRun.toISOString()
          })
          .eq('id', schedule.id);

        results.push({
          schedule_id: schedule.id,
          status,
          message: `Processed schedule ${schedule.name}`
        });

      } catch (error) {
        console.error('Error processing schedule:', schedule.id, error);
        const err = error as Error;
        
        // Log error
        await supabase.from('send_logs_v2').insert({
          org_id: schedule.org_id,
          category: schedule.category,
          schedule_id: schedule.id,
          whatsapp_group: schedule.whatsapp_group,
          message_excerpt: null,
          status: 'ERROR',
          response_text: err.message
        });

        results.push({
          schedule_id: schedule.id,
          status: 'ERROR',
          message: err.message
        });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in run-availability-schedules:', error);
    const err = error as Error;
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});