import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'
import { DateTime } from "https://esm.sh/luxon@3.4.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    const body = await req.json()
    
    // Log incoming request body for debugging
    console.log('schedules-v2-upsert received body:', JSON.stringify(body, null, 2))
    
    const { 
      id, 
      org_id, 
      name, 
      time_local, 
      tz, 
      target, 
      whatsapp_group, 
      template_id, 
      status,
      created_by,
      category = 'AVAILABILITY', // Default to AVAILABILITY for Court Availability
      // New optional fields for enhanced scheduling
      summary_variant,
      event_id,
      date_start_utc,
      date_end_utc,
      is_one_off = false,
      run_at_utc
    } = body
    
    // Log the extracted date values
    console.log('Extracted date values:', {
      date_start_utc,
      date_end_utc,
      date_start_utc_type: typeof date_start_utc,
      date_end_utc_type: typeof date_end_utc,
      date_start_utc_length: date_start_utc?.length,
      date_end_utc_length: date_end_utc?.length
    })

    // Validate and sanitize template_id - convert empty string to null
    const sanitizedTemplateId = template_id && template_id.trim() !== '' ? template_id.trim() : null
    
    // Validate required fields for new schedules
    if (!id && !sanitizedTemplateId) {
      return new Response(JSON.stringify({ error: 'template_id is required for new schedules' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Sanitize optional fields - convert empty strings to null
    const sanitizedSummaryVariant = summary_variant && summary_variant.trim() !== '' ? summary_variant.trim() : null
    const sanitizedEventId = event_id && event_id.trim() !== '' ? event_id.trim() : null

    // Convert created_by (user_id) to profile.id if needed
    let profileId = created_by
    if (created_by) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', created_by)
        .single()
      if (profile) {
        profileId = profile.id
      }
    }

    console.log('Upserting schedule:', { 
      id, 
      name, 
      time_local, 
      tz, 
      target, 
      is_one_off, 
      run_at_utc,
      date_start_utc,
      date_end_utc,
      summary_variant,
      event_id
    })

    // Compute next_run_at_utc using Luxon
    let next_run_at_utc: string | null = null
    
    if (is_one_off && run_at_utc) {
      // For one-off schedules, use the provided run_at_utc
      next_run_at_utc = run_at_utc
    } else if (!is_one_off && time_local) {
      // For recurring schedules, compute next run time
      const nowClub = DateTime.now().setZone(tz)
      const [hour, minute] = time_local.split(':').map(Number)
      
      let candidate = nowClub.set({ 
        hour, 
        minute, 
        second: 0, 
        millisecond: 0 
      })
      
      // If the time has already passed today, schedule for tomorrow
      if (candidate <= nowClub) {
        candidate = candidate.plus({ days: 1 })
      }
      
      next_run_at_utc = candidate.toUTC().toISO()
    }
    
    console.log('Computed next run:', { next_run_at_utc })

    let result
    if (id) {
      // Prepare update object
      const updateData: any = {
        name,
        time_local,
        tz,
        target,
        whatsapp_group,
        template_id: sanitizedTemplateId,
        status,
        category,
        next_run_at_utc,
        summary_variant: sanitizedSummaryVariant,
        event_id: sanitizedEventId,
        is_one_off,
        run_at_utc: run_at_utc || null,
        updated_at: new Date().toISOString()
      }
      
      // Only set date fields if they are provided and not empty
      if (date_start_utc && date_start_utc.trim() !== '') {
        updateData.date_start_utc = date_start_utc
      } else {
        updateData.date_start_utc = null
      }
      
      if (date_end_utc && date_end_utc.trim() !== '') {
        updateData.date_end_utc = date_end_utc
      } else {
        updateData.date_end_utc = null
      }
      
      console.log('Update data being sent to database:', JSON.stringify(updateData, null, 2))
      
      // Update existing schedule
      const { data, error } = await supabase
        .from('scheduled_sends_v2')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      result = data
    } else {
      // Prepare insert object
      const insertData: any = {
        org_id,
        name,
        time_local,
        tz,
        target,
        whatsapp_group,
        template_id: sanitizedTemplateId,
        status,
        category,
        next_run_at_utc,
        summary_variant: sanitizedSummaryVariant,
        event_id: sanitizedEventId,
        is_one_off,
        run_at_utc: run_at_utc || null,
        created_by: profileId
      }
      
      // Only set date fields if they are provided and not empty
      if (date_start_utc && date_start_utc.trim() !== '') {
        insertData.date_start_utc = date_start_utc
      } else {
        insertData.date_start_utc = null
      }
      
      if (date_end_utc && date_end_utc.trim() !== '') {
        insertData.date_end_utc = date_end_utc
      } else {
        insertData.date_end_utc = null
      }
      
      console.log('Insert data being sent to database:', JSON.stringify(insertData, null, 2))
      
      // Create new schedule
      const { data, error } = await supabase
        .from('scheduled_sends_v2')
        .insert(insertData)
        .select()
        .single()
      
      if (error) throw error
      result = data
    }

    console.log('Schedule upserted successfully:', result.id)
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error upserting schedule:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})