import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  console.log(`${req.method} request to hyper-api`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let tenantid: string;
    let datefrom: string;
    let dateto: string;
    let sport_id: string;
    let has_players: string;

    // Handle both GET and POST requests
    if (req.method === 'GET') {
      const url = new URL(req.url);
      tenantid = url.searchParams.get('tenantid') || '';
      datefrom = url.searchParams.get('datefrom') || '';
      dateto = url.searchParams.get('dateto') || '';
      sport_id = url.searchParams.get('sport_id') || 'PADEL';
      has_players = url.searchParams.get('has_players') || 'TRUE';
      console.log(`GET params - tenantid: ${tenantid}, datefrom: ${datefrom}, dateto: ${dateto}, sport_id: ${sport_id}, has_players: ${has_players}`);
    } else if (req.method === 'POST') {
      const body = await req.json();
      tenantid = body.tenantid || '';
      datefrom = body.datefrom || '';
      dateto = body.dateto || '';
      sport_id = body.sport_id || 'PADEL';
      has_players = body.has_players || 'TRUE';
      console.log(`POST body - tenantid: ${tenantid}, datefrom: ${datefrom}, dateto: ${dateto}, sport_id: ${sport_id}, has_players: ${has_players}`);
    } else {
      throw new Error(`Method ${req.method} not allowed`);
    }

    // Validate required parameters
    if (!tenantid || !datefrom || !dateto) {
      throw new Error('Missing required parameters: tenantid, datefrom, dateto');
    }

    let result: any;
    let source = '';
    let upstream_status = '';
    let upstream_body_snippet = '';
    let api_method = '';

    // First try: Attempt POST to Playtomic's hyper-api
    try {
      const hyperApiUrl = `https://playtomic.com/hyper-api/matches`;
      const hyperRequestBody = {
        tenant_id: tenantid,
        start_min: datefrom,
        start_max: dateto,
        sport_id: sport_id,
        has_players: has_players === 'TRUE'
      };
      
      console.log(`Attempting POST to Playtomic hyper API: ${hyperApiUrl}`);
      console.log(`POST body: ${JSON.stringify(hyperRequestBody)}`);
      
      const hyperResponse = await fetch(hyperApiUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Supabase-Edge-Function/1.0',
        },
        body: JSON.stringify(hyperRequestBody)
      });

      upstream_status = `${hyperResponse.status} ${hyperResponse.statusText}`;
      api_method = 'POST';
      const responseText = await hyperResponse.text();
      upstream_body_snippet = responseText.substring(0, 300);

      if (hyperResponse.ok) {
        console.log(`Hyper API POST success: ${upstream_status}`);
        const data = JSON.parse(responseText);
        const matches = data.matches || [];
        const match_ids = matches.map((match: any) => match.id || match.match_id).filter(Boolean);

        result = {
          match_ids,
          total_matches: matches.length,
          tenant_id: tenantid,
          date_range: { from: datefrom, to: dateto },
          source: 'playtomic-hyper-api-post',
          upstream_status,
          upstream_body_snippet,
          api_method,
          raw_data: data
        };
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        console.log(`Hyper API POST failed: ${upstream_status}, falling back to official API`);
        source = 'playtomic-hyper-api-post-failed';
      }
    } catch (hyperError: any) {
      console.log(`Hyper API POST error: ${hyperError.message}, falling back to official API`);
      source = 'playtomic-hyper-api-post-error';
      upstream_status = `Error: ${hyperError.message}`;
    }

    // Second try: GET to Playtomic's hyper-api
    try {
      const hyperApiUrl = `https://playtomic.com/hyper-api/matches?tenant_id=${tenantid}&start_min=${encodeURIComponent(datefrom)}&start_max=${encodeURIComponent(dateto)}&sport_id=${sport_id}&has_players=${has_players}`;
      
      console.log(`Attempting GET to Playtomic hyper API: ${hyperApiUrl}`);
      
      const hyperResponse = await fetch(hyperApiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Supabase-Edge-Function/1.0',
        },
      });

      const currentStatus = `${hyperResponse.status} ${hyperResponse.statusText}`;
      const responseText = await hyperResponse.text();
      
      if (source === '') {
        upstream_status = currentStatus;
        upstream_body_snippet = responseText.substring(0, 300);
        api_method = 'GET';
      }

      if (hyperResponse.ok) {
        console.log(`Hyper API GET success: ${currentStatus}`);
        const data = JSON.parse(responseText);
        const matches = data.matches || [];
        const match_ids = matches.map((match: any) => match.id || match.match_id).filter(Boolean);

        result = {
          match_ids,
          total_matches: matches.length,
          tenant_id: tenantid,
          date_range: { from: datefrom, to: dateto },
          source: source || 'playtomic-hyper-api-get',
          upstream_status: upstream_status || currentStatus,
          upstream_body_snippet: upstream_body_snippet || responseText.substring(0, 300),
          api_method: api_method || 'GET',
          raw_data: data
        };
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        console.log(`Hyper API GET also failed: ${currentStatus}, falling back to official API`);
        if (source === '') source = 'playtomic-hyper-api-get-failed';
      }
    } catch (hyperError: any) {
      console.log(`Hyper API GET error: ${hyperError.message}, falling back to official API`);
      if (source === '') {
        source = 'playtomic-hyper-api-get-error';
        upstream_status = `Error: ${hyperError.message}`;
      }
    }

    // Final fallback: Use official Playtomic API via existing playtomic-fetch function
    console.log(`Falling back to official Playtomic API`);
    
    const officialApiUrl = `https://api.playtomic.io/v1/matches?tenant_id=${tenantid}&sport_id=${sport_id}&has_players=${has_players}&from_start_date=${encodeURIComponent(datefrom)}&to_start_date=${encodeURIComponent(dateto)}`;
    
    const officialResponse = await fetch(officialApiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Supabase-Edge-Function/1.0',
      },
    });

    const officialStatus = `${officialResponse.status} ${officialResponse.statusText}`;
    const officialText = await officialResponse.text();

    if (!officialResponse.ok) {
      throw new Error(`All APIs failed. Official API: ${officialStatus}`);
    }

    console.log(`Official API success: ${officialStatus}`);
    const officialData = JSON.parse(officialText);
    const matches = officialData || [];
    const match_ids = matches.map((match: any) => match.match_id || match.id).filter(Boolean);

    result = {
      match_ids,
      total_matches: matches.length,
      tenant_id: tenantid,
      date_range: { from: datefrom, to: dateto },
      source: source + '-fallback-to-official',
      upstream_status: upstream_status + ` | Official: ${officialStatus}`,
      upstream_body_snippet: upstream_body_snippet + ` | Official: ${officialText.substring(0, 200)}`,
      api_method: api_method + ' | GET',
      raw_data: officialData
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in hyper-api function:', error);
    
    const errorResponse = {
      error: error.message,
      match_ids: [],
      total_matches: 0,
      source: 'error',
      upstream_status: 'Function Error',
      upstream_body_snippet: error.message,
      api_method: 'N/A'
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});