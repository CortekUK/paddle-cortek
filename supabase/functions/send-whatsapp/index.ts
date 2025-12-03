import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendWhatsAppRequest {
  tenant_id: string;
  category: string;
  whatsapp_group: string;
  message: string;
  template_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenant_id, category, whatsapp_group, message, template_id }: SendWhatsAppRequest = await req.json();
    
    // Create Supabase client with JWT from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    // Verify user authentication and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify tenant access - check if user belongs to organization with this tenant_id
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, tenant_id')
      .eq('tenant_id', tenant_id)
      .single();

    if (orgError || !orgData) {
      console.error('Organization verification error:', orgError);
      return new Response(JSON.stringify({ error: 'Forbidden - Invalid tenant' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user is member of this organization
    const { data: memberData, error: memberError } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('org_id', orgData.id)
      .eq('user_id', user.id)
      .single();

    if (memberError || !memberData) {
      console.error('Member verification error:', memberError);
      return new Response(JSON.stringify({ error: 'Forbidden - Not organization member' }), { 
        status: 403, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Sending WhatsApp message:', { tenant_id, category, whatsapp_group, messageLength: message.length });

    // Build emulator URL with proper encoding
    const emulatorUrl = `http://jonhillyer.ddns.net:5000/message?WhatsAppGroup=${encodeURIComponent(whatsapp_group)}&Message=${encodeURIComponent(message)}`;
    
    // Send to emulator with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    let emulatorResult: any;
    let status: string;
    
    try {
      const response = await fetch(emulatorUrl, { 
        method: 'GET', 
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      
      // Try to parse JSON, fallback to text if it fails
      let responseBody;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        responseBody = await response.json();
      } else {
        const textBody = await response.text();
        responseBody = { result: textBody };
      }
      
      emulatorResult = responseBody;
      
      // Check if response indicates success
      const resultString = typeof responseBody?.result === 'string' ? responseBody.result : JSON.stringify(responseBody);
      status = resultString.includes('OK') ? 'OK' : 'ERROR';
      
      console.log('Emulator response:', { status, result: emulatorResult });
      
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Emulator request failed:', error);
      
      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout - emulator server may be unreachable';
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Network error - cannot reach emulator server';
      }
      
      emulatorResult = { error: errorMessage, originalError: error.message };
      status = 'ERROR';
    }

    // Log the send attempt
    const { data: logData, error: logError } = await supabase
      .from('wa_messages_log')
      .insert({
        tenant_id,
        category,
        template_id,
        whatsapp_group_name: whatsapp_group,
        payload_message: message,
        emulator_url: emulatorUrl,
        emulator_result: emulatorResult,
        status
      })
      .select('id')
      .single();

    if (logError) {
      console.error('Failed to log message:', logError);
    }

    return new Response(
      JSON.stringify({
        status,
        result: emulatorResult,
        log_id: logData?.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in send-whatsapp function:', error);
    return new Response(
      JSON.stringify({
        status: 'ERROR',
        result: { error: error.message }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});