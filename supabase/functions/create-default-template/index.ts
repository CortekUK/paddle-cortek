import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { org_id } = await req.json();

    // Create a simple default template
    const defaultTemplate = {
      org_id,
      name: 'Court Availability - Default',
      bg_url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTA4MCIgaGVpZ2h0PSIxMDgwIiB2aWV3Qm94PSIwIDAgMTA4MCAxMDgwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTA4MCIgaGVpZ2h0PSIxMDgwIiBmaWxsPSIjMDA5NjU5IiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4K',
      canvas_w: 1080,
      canvas_h: 1080,
      layers: [
        {
          id: crypto.randomUUID(),
          type: 'text',
          content: '{{club_name}}',
          fontFamily: 'Roboto',
          fontSize: 48,
          fontWeight: 'bold',
          fontStyle: 'normal',
          color: '#009659',
          textAlign: 'center',
          lineHeight: 1.2,
          x: 50,
          y: 200,
          width: 980,
          rotation: 0,
          visible: true
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          content: 'Court availability for {{date_display_short}}',
          fontFamily: 'Roboto',
          fontSize: 32,
          fontWeight: 'normal',
          fontStyle: 'normal',
          color: '#333333',
          textAlign: 'center',
          lineHeight: 1.3,
          x: 50,
          y: 300,
          width: 980,
          rotation: 0,
          visible: true
        },
        {
          id: crypto.randomUUID(),
          type: 'text',
          content: '{{summary}}',
          fontFamily: 'Roboto',
          fontSize: 24,
          fontWeight: 'normal',
          fontStyle: 'normal',
          color: '#666666',
          textAlign: 'center',
          lineHeight: 1.4,
          x: 80,
          y: 450,
          width: 920,
          rotation: 0,
          visible: true
        }
      ]
    };

    const { data, error } = await supabase
      .from('social_templates')
      .insert(defaultTemplate)
      .select()
      .single();

    if (error) throw error;

    return new Response(
      JSON.stringify({ template: data }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});