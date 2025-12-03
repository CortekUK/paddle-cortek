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
    const { club_url } = await req.json();
    
    if (!club_url) {
      return Response.json({ error: 'club_url is required' }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log(`Discovering tenant for URL: ${club_url}`);

    // Extract tenant info from Playtomic club URL
    // Expected format: https://playtomic.io/club/{tenant_id} or similar patterns
    let tenant_id = '';
    let evidence_url = club_url;

    // Try to extract tenant ID from various URL patterns
    const urlPatterns = [
      /\/club\/([a-f0-9-]{36})/i,  // UUID format
      /\/club\/(\d+)/,              // Numeric ID
      /tenant_id=([a-f0-9-]{36})/i, // Query parameter
      /\/([a-f0-9-]{36})$/i,        // UUID at end of path
    ];

    for (const pattern of urlPatterns) {
      const match = club_url.match(pattern);
      if (match) {
        tenant_id = match[1];
        break;
      }
    }

    // If no pattern matched, try to fetch the page and look for tenant info
    if (!tenant_id) {
      console.log('No tenant ID found in URL, attempting to fetch page...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      try {
        const response = await fetch(club_url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; PlaytomicBot/1.0)',
          },
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const html = await response.text();
          
          // Look for tenant ID in various places in the HTML
          const htmlPatterns = [
            /"tenant_id"\s*:\s*"([a-f0-9-]{36})"/i,
            /'tenant_id'\s*:\s*'([a-f0-9-]{36})'/i,
            /data-tenant-id="([a-f0-9-]{36})"/i,
            /tenant[_-]?id["\s:=]+([a-f0-9-]{36})/i,
          ];
          
          for (const pattern of htmlPatterns) {
            const match = html.match(pattern);
            if (match) {
              tenant_id = match[1];
              evidence_url = `Found in HTML source of ${club_url}`;
              break;
            }
          }
        }
      } catch (fetchError) {
        console.log('Failed to fetch club page:', fetchError);
        // Continue with empty tenant_id - we'll return an error below
      }
    }

    if (!tenant_id) {
      return Response.json({ 
        error: 'Could not discover tenant ID from the provided URL',
        details: 'Please check the URL format or try a different Playtomic club URL'
      }, { 
        status: 404, 
        headers: corsHeaders 
      });
    }

    // Validate that tenant_id looks like a UUID
    const uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    if (!uuidPattern.test(tenant_id)) {
      return Response.json({ 
        error: 'Discovered tenant ID does not appear to be a valid UUID',
        discovered_value: tenant_id
      }, { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    console.log(`Successfully discovered tenant: ${tenant_id}`);

    const result = {
      tenant_id,
      sport_id: 'PADEL', // Default sport
      evidence: {
        seen_on: evidence_url,
        discovered_at: new Date().toISOString(),
      }
    };

    return Response.json(result, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in discover-tenant:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return Response.json({ 
      error: 'Internal server error', 
      details: errorMessage
    }, { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});