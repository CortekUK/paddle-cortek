const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint, tenant_id, sport_id, start_min, start_max, has_players, apply_date_filters } = await req.json();
    
    if (!endpoint || !tenant_id) {
      return Response.json({ error: 'endpoint and tenant_id are required' }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log(`Fetching ${endpoint} for tenant ${tenant_id}`);

    // Build the Playtomic API URL based on endpoint
    let baseUrl = '';
    const params = new URLSearchParams();

    switch (endpoint) {
      case 'availability':
        baseUrl = 'https://api.playtomic.io/v1/availability';
        if (sport_id) params.set('sport_id', sport_id);
        if (start_min) params.set('start_min', start_min);
        if (start_max) params.set('start_max', start_max);
        params.set('tenant_id', tenant_id);
        break;

      case 'matches':
        baseUrl = 'https://api.playtomic.io/v1/matches';
        params.set('tenant_id', tenant_id);
        if (sport_id) params.set('sport_id', sport_id);
        if (has_players) params.set('has_players', 'TRUE');
        if (start_min) params.set('from_start_date', start_min);
        if (start_max) params.set('to_start_date', start_max);
        break;

      case 'tournaments':
        baseUrl = 'https://api.playtomic.io/v1/tournaments';
        if (sport_id) params.set('sport_id', sport_id);
        params.set('tenant_id', tenant_id);
        if (start_min) params.set('from_start_date', start_min);
        if (start_max) params.set('to_start_date', start_max);
        break;

      case 'lessons':
        baseUrl = 'https://api.playtomic.io/v1/lessons';
        if (sport_id) params.set('sport_id', sport_id);
        params.set('tenant_id', tenant_id);
        if (start_min) params.set('from_start_date', start_min);
        if (start_max) params.set('to_start_date', start_max);
        break;

      case 'classes':
        baseUrl = 'https://api.playtomic.io/v1/classes';
        if (sport_id) params.set('sport_id', sport_id);
        params.set('tenant_id', tenant_id);
        if (apply_date_filters !== false) {
          if (start_min) params.set('from_start_date', start_min);
          if (start_max) params.set('to_start_date', start_max);
        }
        break;

      default:
        return Response.json({ error: 'Invalid endpoint' }, { 
          status: 400, 
          headers: corsHeaders 
        });
    }

    // Construct final URL with RFC3986 encoding
    const finalUrl = `${baseUrl}?${params.toString()}`;
    console.log(`Final URL: ${finalUrl}`);

    // Make the API request with 10s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let status = 0;
    let raw = null;
    let error = null;

    try {
      const response = await fetch(finalUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'PlaytomicAPI-TestLab/1.0',
          'Accept': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      status = response.status;
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        raw = await response.json();
      } else {
        raw = await response.text();
      }
      
      console.log(`Response status: ${status}`);
      
    } catch (fetchError) {
      clearTimeout(timeoutId);
      const err = fetchError as Error;
      
      if (err.name === 'AbortError') {
        console.log('Request timed out');
        status = 0;
        error = 'timeout';
        raw = { error: 'Request timed out after 10 seconds' };
      } else {
        console.log('Network error:', fetchError);
        status = 0;
        error = 'network';
        raw = { error: `Network error: ${err.message}` };
      }
    }

    // Categorize errors
    if (status === 0) {
      error = error || 'network';
    } else if (status >= 400) {
      error = 'http';
    }

    const result = {
      url: finalUrl,
      status,
      raw,
      error,
      endpoint,
      tenant_id,
      timestamp: new Date().toISOString(),
    };

    return Response.json(result, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in playtomic-fetch:', error);
    const err = error as Error;
    
    return Response.json({ 
      error: 'Internal server error', 
      details: err.message
    }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});