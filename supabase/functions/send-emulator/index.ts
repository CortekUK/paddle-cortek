import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendRequest {
  message: string;
  groups: string[];
  test?: boolean;
}

function encodeURIComponentRFC3986(str: string) {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

async function sendWithRetries(url: string, maxRetries = 3): Promise<{
  success: boolean;
  status_code?: number;
  response_body?: string;
  error?: string;
}> {
  const delays = [500, 1000, 2000]; // 0.5s, 1s, 2s delays
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1} sending to: ${url}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const responseText = await response.text();
      
      return {
        success: response.ok,
        status_code: response.status,
        response_body: responseText,
      };
      
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      const err = error as Error;
      
      if (attempt === maxRetries) {
        return {
          success: false,
          error: err.message || 'Request failed after retries',
        };
      }
      
      // Wait before next retry
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delays[attempt]));
      }
    }
  }
  
  return {
    success: false,
    error: 'Max retries exceeded',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message, groups, test = false }: SendRequest = await req.json();

    if (!message || !groups || groups.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message and groups are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's location to find emulator URL
    const { data: profile } = await supabase
      .from('profiles')
      .select('location_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.location_id) {
      return new Response(
        JSON.stringify({ error: 'User has no associated location' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: location } = await supabase
      .from('locations')
      .select('emulator_url, default_group_ids')
      .eq('id', profile.location_id)
      .single();

    if (!location) {
      return new Response(
        JSON.stringify({ error: 'Location not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate available space for message content based on longest group name
    const longestGroup = groups.reduce((a, b) => a.length > b.length ? a : b, '');
    const baseUrlLength = location.emulator_url.length + '?WhatsAppGroup='.length + encodeURIComponentRFC3986(longestGroup).length + '&Message='.length;
    const maxMessageLength = 1800 - baseUrlLength;
    
    let messagesToSend: string[] = [];
    if (message.length > maxMessageLength) {
      // Split into chunks with continuation markers
      const chunkSize = Math.max(100, maxMessageLength - 20); // Leave room for "...continued" markers
      for (let i = 0; i < message.length; i += chunkSize) {
        let chunk = message.slice(i, i + chunkSize);
        if (i > 0) chunk = `...${chunk}`;
        if (i + chunkSize < message.length) chunk = `${chunk}...`;
        messagesToSend.push(chunk);
      }
    } else {
      messagesToSend = [message];
    }

    // Send to each group
    const results = [];
    for (const group of groups) {
      for (let i = 0; i < messagesToSend.length; i++) {
        const currentMessage = messagesToSend[i];
        
        // Build URL with correct query param names and proper RFC 3986 encoding
        const url = `${location.emulator_url}?WhatsAppGroup=${encodeURIComponentRFC3986(group)}&Message=${encodeURIComponentRFC3986(currentMessage)}`;
        
        // Send with retries
        const result = await sendWithRetries(url);
        
        // Categorize errors
        let errorType = null;
        if (!result.success) {
          if (result.error?.includes('AbortError') || result.error?.includes('timeout')) {
            errorType = 'timeout';
          } else if (result.error?.includes('TypeError') || result.error?.includes('DNS') || result.error?.includes('fetch failed')) {
            errorType = 'network';
          } else if (result.status_code && (result.status_code < 200 || result.status_code >= 300)) {
            errorType = 'http';
          } else {
            errorType = 'unknown';
          }
        }
        
        // Log this send attempt
        await supabase.from('send_logs').insert({
          user_id: user.id,
          location_id: profile.location_id,
          channel: test ? 'test' : 'emulator',
          request_url: url,
          status_code: result.status_code,
          response_body: result.response_body || result.error,
          payload: { 
            group, 
            message: currentMessage, 
            part: i + 1, 
            total: messagesToSend.length,
            error_type: errorType,
            test: test || false
          }
        });

        results.push({
          group,
          part: i + 1,
          total: messagesToSend.length,
          url,
          status_code: result.status_code,
          response_body: result.response_body,
          error_type: errorType,
          success: result.success
        });

        // If this part failed and it's not a test, stop sending remaining parts for this group
        if (!result.success && !test) {
          break;
        }
        
        // Add delay between message parts to avoid overwhelming the emulator
        if (i < messagesToSend.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay between parts
        }
      }
      
      // Add delay between groups  
      if (groups.indexOf(group) < groups.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 0.5s delay between groups
      }
    }

    return new Response(
      JSON.stringify({
        success: results.every(r => r.success),
        results,
        total_parts: messagesToSend.length,
        total_groups: groups.length,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in send-emulator function:', error);
    const err = error as Error;
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});