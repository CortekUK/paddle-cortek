import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'
import { puppeteer } from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      template_id, 
      source, 
      summary_variant, 
      target, 
      message_content,
      page_data,
      org_id
    } = await req.json();

    console.log('Rendering social media post:', { template_id, source, target });

    // Get template data
    const { data: template, error: templateError } = await supabase
      .from('social_templates')
      .select('*')
      .eq('id', template_id)
      .single();

    if (templateError) {
      throw new Error(`Template not found: ${templateError.message}`);
    }

    // Generate HTML for rendering
    const html = generateHTML(template, message_content, page_data);
    
    // Launch puppeteer and render
    const browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    try {
      const page = await browser.newPage();
      
      // Set viewport to match canvas size
      await page.setViewport({
        width: template.canvas.w,
        height: template.canvas.h,
        deviceScaleFactor: 2, // For high quality
      });

      // Set content and wait for fonts to load
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Take screenshot
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: true,
        omitBackground: false,
      });

      // Upload to storage
      const fileName = `renders/${org_id}/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getDate()).padStart(2, '0')}/${crypto.randomUUID()}.png`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('social-media')
        .upload(fileName, screenshot, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('social-media')
        .getPublicUrl(fileName);

      // Save render record
      const { data: renderData, error: renderError } = await supabase
        .from('social_renders')
        .insert({
          org_id,
          source,
          summary_variant,
          template_id,
          target,
          run_at_utc: new Date().toISOString(),
          result_url: publicUrl,
          inputs: {
            message_content,
            page_data,
            compiled_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (renderError) {
        console.error('Error saving render record:', renderError);
        // Don't fail the request, just log the error
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          render_id: renderData?.id,
          result_url: publicUrl,
          file_path: fileName
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );

    } finally {
      await browser.close();
    }

  } catch (error) {
    console.error('Error in social-render function:', error);
    const err = error as Error;
    return new Response(
      JSON.stringify({ 
        error: err.message,
        success: false
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

function generateHTML(template: any, messageContent: string, pageData: any): string {
  const { canvas, layers, bg_url, bgTransform } = template;
  
  // Generate CSS for layers
  const layerElements = layers.map((layer: any, index: number) => {
    const { box, style, type, source, url } = layer;
    
    const baseStyle = `
      position: absolute;
      left: ${box.x}px;
      top: ${box.y}px;
      width: ${box.w}px;
      height: ${box.h}px;
    `;

    if (type === 'text') {
      const textStyle = style ? `
        font-family: ${style.font || 'Inter'}, sans-serif;
        font-weight: ${style.weight || 400};
        font-size: ${style.size || 24}px;
        line-height: ${style.lineHeight || 1.2};
        color: ${style.color || '#000000'};
        text-align: ${style.align || 'left'};
        padding: ${style.padding || 0}px;
        display: flex;
        align-items: ${style.vAlign === 'middle' ? 'center' : style.vAlign === 'bottom' ? 'flex-end' : 'flex-start'};
        ${style.stroke ? `text-shadow: 
          -${style.stroke.width || 1}px -${style.stroke.width || 1}px 0 ${style.stroke.color || '#000'},  
          ${style.stroke.width || 1}px -${style.stroke.width || 1}px 0 ${style.stroke.color || '#000'},
          -${style.stroke.width || 1}px ${style.stroke.width || 1}px 0 ${style.stroke.color || '#000'},
          ${style.stroke.width || 1}px ${style.stroke.width || 1}px 0 ${style.stroke.color || '#000'};` : ''}
        ${style.shadow ? `filter: drop-shadow(${style.shadow.offsetX || 0}px ${style.shadow.offsetY || 2}px ${style.shadow.blur || 4}px ${style.shadow.color || 'rgba(0,0,0,0.3)'});` : ''}
      ` : '';

      // Get content based on source
      let content = messageContent;
      if (source && source !== 'message_content') {
        // Handle other token sources
        const tokens: Record<string, string> = {
          club_name: pageData?.club_name || 'Club',
          date_display_short: new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }),
          sport: 'Padel',
          summary: pageData?.summary || '',
          count_slots: pageData?.count_slots?.toString() || '0'
        };
        content = tokens[source] || `{{${source}}}`;
      }

      return `<div style="${baseStyle}${textStyle}">${content}</div>`;
      
    } else if (type === 'image' && url) {
      return `<img src="${url}" style="${baseStyle} object-fit: cover;" />`;
      
    } else if (type === 'shape') {
      return `<div style="${baseStyle} background-color: ${style?.backgroundColor || '#000000'}; border-radius: ${style?.borderRadius || 0}px;"></div>`;
    }
    
    return '';
  }).join('');

  // Handle background with transform
  let backgroundStyle = '';
  if (bg_url) {
    if (bgTransform) {
      // Apply transform for positioned background
      backgroundStyle = `
        position: absolute;
        top: 0;
        left: 0;
        width: ${canvas.w}px;
        height: ${canvas.h}px;
        background-image: url('${bg_url}');
        background-size: cover;
        background-position: center;
        transform: translate(${bgTransform.x || 0}px, ${bgTransform.y || 0}px) scale(${bgTransform.scale || 1});
        transform-origin: top left;
        overflow: hidden;
      `;
    } else {
      // Default full background
      backgroundStyle = `
        background-image: url('${bg_url}');
        background-size: cover;
        background-position: center;
      `;
    }
  } else {
    backgroundStyle = 'background-color: #ffffff;';
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Inter', sans-serif; 
          overflow: hidden;
          width: ${canvas.w}px;
          height: ${canvas.h}px;
        }
      </style>
    </head>
    <body>
      <div style="
        position: relative;
        width: ${canvas.w}px;
        height: ${canvas.h}px;
        overflow: hidden;
        ${!bgTransform && bg_url ? backgroundStyle : !bg_url ? backgroundStyle : ''}
      ">
        ${bgTransform && bg_url ? `<div style="${backgroundStyle}"></div>` : ''}
        ${layerElements}
      </div>
    </body>
    </html>
  `;
}