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
    const body = await req.json();
    const { tenant_id, category, whatsapp_group, message, template_id }: SendWhatsAppRequest = body;
    
    // Validate required fields
    if (!tenant_id || !category || !whatsapp_group || !message) {
      const missing = [];
      if (!tenant_id) missing.push('tenant_id');
      if (!category) missing.push('category');
      if (!whatsapp_group) missing.push('whatsapp_group');
      if (!message) missing.push('message');
      
      console.error('Missing required fields:', missing);
      return new Response(
        JSON.stringify({
          status: 'ERROR',
          result: { error: `Missing required fields: ${missing.join(', ')}` }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Create Supabase client with service role key (no auth headers needed)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables:', { hasUrl: !!supabaseUrl, hasKey: !!supabaseServiceKey });
      return new Response(
        JSON.stringify({
          status: 'ERROR',
          result: { error: 'Server configuration error' }
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Sending WhatsApp message:', { tenant_id, category, whatsapp_group, messageLength: message.length, hasTemplate: !!template_id });

    // Build emulator URL with proper encoding
    const emulatorUrl = `http://jonhillyer.ddns.net:5000/message?WhatsAppGroup=${encodeURIComponent(whatsapp_group)}&Message=${encodeURIComponent(message)}`;
    
    console.log('Emulator URL:', emulatorUrl);
    
    // Send to emulator with extended timeout (Jon's server may take longer than 60 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout (2 minutes)
    
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
      
      // Check if response indicates success - be more flexible with success detection
      const resultString = typeof responseBody?.result === 'string' ? responseBody.result : JSON.stringify(responseBody);
      
      // Consider it successful if we get a 2xx response and the response doesn't explicitly indicate failure
      // Note: "connversation_row" is a typo on the emulator server (should be "conversation_row")
      const isExplicitError = resultString.toLowerCase().includes('error') || 
                             resultString.toLowerCase().includes('failed') ||
                             resultString.toLowerCase().includes('timeout') ||
                             resultString.toLowerCase().includes('cannot find');
      
      status = (response.ok && !isExplicitError) ? 'OK' : 'ERROR';
      
      console.log('Emulator response:', { 
        status, 
        responseOk: response.ok, 
        responseStatus: response.status,
        result: emulatorResult,
        resultString: resultString.substring(0, 200) // Log first 200 chars
      });
      
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

    // Log the send attempt (using service role, no auth needed)
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
    console.error('Error in send-whatsapp-message function:', error);
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
