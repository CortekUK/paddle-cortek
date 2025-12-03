import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode as b64encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Generate correlation ID for error tracking
    const correlationId = crypto.randomUUID().slice(0, 8);
    
    // Get authorization header and extract JWT token
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    
    if (!token) {
      return new Response(JSON.stringify({ 
        error: 'Missing bearer token', 
        correlationId 
      }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Check if this is a service role call (from another edge function)
    // Service role tokens have "role": "service_role" in their payload
    let userId: string | null = null;
    let isServiceRole = false;
    
    try {
      // Decode JWT payload (base64url decode the middle part)
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        isServiceRole = payload.role === 'service_role';
        if (!isServiceRole && payload.sub) {
          userId = payload.sub;
        }
      }
    } catch (e) {
      console.log(`[${correlationId}] Could not decode token, will try user auth`);
    }

    // If not a service role call, authenticate the user
    if (!isServiceRole) {
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        console.error(`User authentication failed [${correlationId}]:`, userError);
        return new Response(JSON.stringify({ 
          error: 'Invalid token', 
          correlationId 
        }), { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      userId = user.id;
    } else {
      console.log(`[${correlationId}] Service role call detected`);
    }

    const {
      org_id,
      template_id,
      source,
      summary_variant,
      message_content_raw,
      context,
      layers
    } = await req.json();

    console.log(`[${correlationId}] 📥 Received request:`, { 
      org_id, 
      template_id, 
      source, 
      summary_variant,
      user_id: userId,
      layersCount: layers ? layers.length : 0,
      layersIsArray: Array.isArray(layers),
      layers: layers ? layers.map((l: any, idx: number) => ({
        index: idx + 1,
        type: l.type,
        visible: l.visible,
        hasContent: !!l.content,
        contentLength: l.content ? l.content.length : 0,
        contentPreview: l.content ? l.content.substring(0, 100) : 'N/A',
        hasImageUrl: !!l.imageUrl,
        imageUrl: l.imageUrl ? l.imageUrl.substring(0, 100) + '...' : 'N/A',
        x: l.x,
        y: l.y,
        width: l.width,
        height: l.height,
        fontSize: l.fontSize,
        color: l.color
      })) : [],
      context: context ? {
        hasSummary: !!context.summary,
        summaryLength: context.summary ? context.summary.length : 0,
        summaryPreview: context.summary ? context.summary.substring(0, 100) : 'N/A',
        club_name: context.club_name,
        date_display_short: context.date_display_short
      } : null,
      messageContentRaw: message_content_raw ? message_content_raw.substring(0, 100) : 'N/A'
    });
    
    // Validate layers
    if (!layers || !Array.isArray(layers)) {
      console.error(`[${correlationId}] ❌ CRITICAL: Layers is not an array!`, { layers, type: typeof layers });
    } else if (layers.length === 0) {
      console.error(`[${correlationId}] ❌ CRITICAL: Layers array is empty!`);
    } else {
      const textLayers = layers.filter((l: any) => l.type === 'text');
      const imageLayers = layers.filter((l: any) => l.type === 'image');
      const emptyTextLayers = textLayers.filter((l: any) => !l.content || l.content.trim() === '');
      const emptyImageLayers = imageLayers.filter((l: any) => !l.imageUrl || l.imageUrl.trim() === '');
      
      console.log(`[${correlationId}] ✅ Layers validation:`, {
        totalLayers: layers.length,
        textLayers: textLayers.length,
        imageLayers: imageLayers.length,
        emptyTextLayers: emptyTextLayers.length,
        emptyImageLayers: emptyImageLayers.length,
        hasValidContent: textLayers.length > 0 && emptyTextLayers.length === 0
      });
      
      if (emptyTextLayers.length > 0) {
        console.error(`[${correlationId}] ⚠️ WARNING: ${emptyTextLayers.length} text layer(s) have empty content!`, 
          emptyTextLayers.map((l: any, idx: number) => ({
            index: layers.indexOf(l) + 1,
            content: l.content,
            contentLength: l.content ? l.content.length : 0
          }))
        );
      }
    }

    // Map source to valid enum values
    const mapSource = (s: string) => {
      const normalized = (s || '').toUpperCase();
      if (normalized === 'COURT_AVAILABILITY' || normalized === 'COURT' || normalized === 'COURTS') return 'COURT_AVAILABILITY';
      if (normalized === 'PARTIAL_MATCHES' || normalized === 'PARTIALS') return 'PARTIAL_MATCHES';
      if (normalized === 'COMPETITIONS') return 'COMPETITIONS';
      return 'COURT_AVAILABILITY'; // default fallback
    };
    
    const source_mapped = mapSource(source);

    // Get template from database
    const { data: template, error: templateError } = await supabase
      .from('social_templates')
      .select('*')
      .eq('id', template_id)
      .single();

    if (templateError || !template) {
      throw new Error('Template not found');
    }

    const canvasWidth = template.canvas_w || 1080;
    const canvasHeight = template.canvas_h || 1080;
    
    // Create SVG with background and text layers
    let svgContent = `
      <svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
    `;

    // Resolve message content with context
    const message_content_resolved = compileMessageContent(message_content_raw, context);
    
    // Add background if exists - inline as data URL to avoid CORS issues
    if (template.bg_url) {
      try {
        const bgImageData = await fetchImageAsDataUrl(template.bg_url);
        svgContent += `
          <image href="${bgImageData}" width="${canvasWidth}" height="${canvasHeight}" preserveAspectRatio="xMidYMid slice"/>
        `;
      } catch (error) {
        console.warn(`[${correlationId}] Failed to fetch background image, using white background:`, error);
        svgContent += `
          <rect width="${canvasWidth}" height="${canvasHeight}" fill="#ffffff"/>
        `;
      }
    } else {
      svgContent += `
        <rect width="${canvasWidth}" height="${canvasHeight}" fill="#ffffff"/>
      `;
    }

    // Add layers (text and image) from compiled layers
    let layersProcessed = 0;
    let layersRendered = 0;
    
    if (layers && Array.isArray(layers)) {
      console.log(`[${correlationId}] 📋 Processing ${layers.length} layers:`, {
        totalLayers: layers.length,
        textLayers: layers.filter((l: any) => l.type === 'text').length,
        imageLayers: layers.filter((l: any) => l.type === 'image').length,
        visibleLayers: layers.filter((l: any) => l.visible !== false).length,
        layersSummary: layers.map((l: any, i: number) => ({
          index: i + 1,
          type: l.type,
          visible: l.visible !== false,
          hasContent: !!l.content,
          contentPreview: l.content ? l.content.substring(0, 50) : 'N/A',
          hasImageUrl: !!l.imageUrl
        }))
      });
      
      // Process layers sequentially to handle async image loading
      for (let index = 0; index < layers.length; index++) {
        const layer = layers[index];
        layersProcessed++;
        
        // Default visible to true if not specified
        const isVisible = layer.visible !== false;
        
        // Skip invisible layers
        if (!isVisible) {
          console.log(`[${correlationId}] Skipping invisible layer ${index + 1}`);
          continue;
        }
        
        console.log(`[${correlationId}] Processing layer ${index + 1}:`, {
          type: layer.type,
          visible: isVisible,
          hasContent: !!layer.content,
          contentLength: layer.content ? layer.content.length : 0,
          contentPreview: layer.content ? layer.content.substring(0, 100) : 'N/A',
          hasImageUrl: !!layer.imageUrl,
          imageUrl: layer.imageUrl ? layer.imageUrl.substring(0, 100) : 'N/A',
          x: layer.x,
          y: layer.y,
          width: layer.width,
          height: layer.height
        });

        // Handle image layers
        if (layer.type === 'image' && layer.imageUrl) {
          // Validate coordinates
          const imgX = typeof layer.x === 'number' ? layer.x : (typeof layer.x === 'string' ? parseFloat(layer.x) : 50);
          const imgY = typeof layer.y === 'number' ? layer.y : (typeof layer.y === 'string' ? parseFloat(layer.y) : 50);
          const imgWidth = typeof layer.width === 'number' ? layer.width : (typeof layer.width === 'string' ? parseFloat(layer.width) : 200);
          const imgHeight = typeof layer.height === 'number' ? layer.height : (typeof layer.height === 'string' ? parseFloat(layer.height) : 200);
          
          console.log(`[${correlationId}] Rendering image layer ${index + 1}:`, {
            x: imgX,
            y: imgY,
            width: imgWidth,
            height: imgHeight,
            imageUrl: layer.imageUrl.substring(0, 100),
            coordinatesValid: !isNaN(imgX) && !isNaN(imgY) && imgX >= 0 && imgY >= 0
          });
          
          // Convert image URL to data URL to avoid CORS issues
          try {
            const imageDataUrl = await fetchImageAsDataUrl(layer.imageUrl);
            svgContent += `
              <image 
                href="${imageDataUrl}" 
                x="${imgX}" 
                y="${imgY}" 
                width="${imgWidth}" 
                height="${imgHeight}"
                preserveAspectRatio="xMidYMid meet"
              />
            `;
            layersRendered++;
            console.log(`[${correlationId}] ✅ Image layer ${index + 1} added to SVG`);
          } catch (error) {
            console.error(`[${correlationId}] ❌ Failed to add image layer ${index + 1}:`, error);
            // Fallback: try direct URL (might fail due to CORS)
            svgContent += `
              <image 
                href="${layer.imageUrl}" 
                x="${imgX}" 
                y="${imgY}" 
                width="${imgWidth}" 
                height="${imgHeight}"
                preserveAspectRatio="xMidYMid meet"
              />
            `;
            layersRendered++;
            console.log(`[${correlationId}] ⚠️ Image layer ${index + 1} added with direct URL (fallback)`);
          }
        }
        
        // Handle text layers
        if (layer.type === 'text') {
          // Content is already compiled by frontend, use it directly
          // If content is empty, try to compile from message_content_raw
          let text = layer.content || '';
          
          console.log(`[${correlationId}] Text layer ${index + 1} initial content:`, {
            content: text,
            contentLength: text.length,
            hasTokens: text.includes('{{'),
            isEmpty: !text || text.trim() === ''
          });
          
          // If text is empty or still has tokens, try to compile from context
          if (!text || text.trim() === '' || text.includes('{{')) {
            if (context && message_content_raw) {
              text = compileMessageContent(message_content_raw, context);
              console.log(`[${correlationId}] Compiled text from context for layer ${index + 1}: "${text.substring(0, 50)}..."`);
            } else if (context && context.summary) {
              // Fallback: use summary if message_content_raw is not available
              text = context.summary;
              console.log(`[${correlationId}] Using summary as fallback for layer ${index + 1}: "${text.substring(0, 50)}..."`);
            } else {
              // Last resort: use a default message
              text = 'Content not available';
              console.log(`[${correlationId}] Using default text for layer ${index + 1}`);
            }
          }
          
          if (!text || !text.trim()) {
            console.error(`[${correlationId}] ❌ CRITICAL: Text layer ${index + 1} is still empty after all fallbacks!`);
            console.error(`[${correlationId}] Layer data:`, {
              layerContent: layer.content,
              contextSummary: context?.summary,
              messageContentRaw: message_content_raw
            });
            // Don't skip - use a placeholder to ensure something renders
            text = `Layer ${index + 1} - No content`;
            console.log(`[${correlationId}] Using placeholder text for layer ${index + 1}`);
          }
          
          // Validate coordinates - check both layer.x/y and layer.style.left/top formats
          // Template designer uses style.left/top/width, while older code uses x/y/width directly
          const style = layer.style || {};
          const rawX = layer.x ?? style.left ?? style.x ?? 50;
          const rawY = layer.y ?? style.top ?? style.y ?? 50;
          const rawWidth = layer.width ?? style.width ?? 200;
          const rawHeight = layer.height ?? style.height ?? 100;
          const rawFontSize = layer.fontSize ?? style.fontSize ?? 32;
          const rawColor = layer.color ?? style.fill ?? style.color ?? '#000000';
          const fontFamily = layer.fontFamily ?? style.fontFamily ?? 'Roboto';
          const fontWeight = layer.fontWeight ?? style.fontWeight ?? 'normal';
          const fontStyle = layer.fontStyle ?? style.fontStyle ?? 'normal';
          const textAlign = layer.textAlign ?? style.textAlign ?? 'start';
          
          const x = typeof rawX === 'number' ? rawX : parseFloat(rawX) || 50;
          const y = typeof rawY === 'number' ? rawY : parseFloat(rawY) || 50;
          const width = typeof rawWidth === 'number' ? rawWidth : parseFloat(rawWidth) || 200;
          const fontSize = typeof rawFontSize === 'number' ? rawFontSize : parseFloat(rawFontSize) || 32;
          const color = rawColor || '#000000';
          
          console.log(`[${correlationId}] Rendering text layer ${index + 1}:`, {
            x,
            y,
            width,
            fontSize,
            color,
            fontFamily,
            fontWeight,
            textAlign,
            fromStyle: !!layer.style,
            content: text.substring(0, 50) + '...',
            contentLength: text.length,
            coordinatesValid: !isNaN(x) && !isNaN(y) && x >= 0 && y >= 0
          });
          
          // Handle multi-line text with simple wrapping for long lines/URLs
          const maxCharsPerLine = Math.max(1, Math.floor(width / (fontSize * 0.55)));
          const wrapLine = (inputLine: string) => {
            const wrapped: string[] = [];
            if (!inputLine) {
              wrapped.push('');
              return wrapped;
            }
            
            const words = inputLine.split(' ');
            let currentLine = '';
            
            words.forEach(word => {
              const candidate = currentLine ? `${currentLine} ${word}` : word;
              if (candidate.length <= maxCharsPerLine) {
                currentLine = candidate;
              } else {
                if (currentLine) {
                  wrapped.push(currentLine);
                }
                if (word.length > maxCharsPerLine) {
                  for (let i = 0; i < word.length; i += maxCharsPerLine) {
                    wrapped.push(word.slice(i, i + maxCharsPerLine));
                  }
                  currentLine = '';
                } else {
                  currentLine = word;
                }
              }
            });
            
            if (currentLine) {
              wrapped.push(currentLine);
            }
            return wrapped;
          };
          
          const lines = text.split('\n').flatMap((line: string) => wrapLine(line));
          const lineHeight = fontSize * (layer.lineHeight || 1.2);
          
          // Calculate text anchor based on alignment
          let textAnchor = 'start';
          let xPos = x;
          
          if (textAlign === 'center') {
            textAnchor = 'middle';
            xPos = x + (width / 2);
          } else if (textAlign === 'right' || textAlign === 'end') {
            textAnchor = 'end';
            xPos = x + width;
          }
          
          let linesRendered = 0;
          lines.forEach((line: string, lineIndex: number) => {
            if (line.trim()) { // Only render non-empty lines
              const escapedLine = escapeXml(line);
              // With dominant-baseline="hanging", y refers to the top of the text
              // So we just need y + (lineIndex * lineHeight) for multi-line text
              const yPos = y + (lineIndex * lineHeight);
              
              // Ensure color is valid - if it's white on white background, make it black
              const textColor = (color === '#ffffff' || color === '#FFFFFF' || color === 'white') ? '#000000' : color;
              
              const textElement = `
                <text 
                  x="${xPos}" 
                  y="${yPos}"
                  font-size="${fontSize}"
                  fill="${textColor}"
                  font-weight="${fontWeight === 'bold' || fontWeight === 700 || fontWeight === '700' ? 'bold' : 'normal'}"
                  font-style="${fontStyle === 'italic' ? 'italic' : 'normal'}"
                  font-family="${fontFamily || 'Roboto'}, Arial, sans-serif"
                  text-anchor="${textAnchor}"
                  dominant-baseline="hanging"
                >${escapedLine}</text>
              `;
              svgContent += textElement;
              linesRendered++;
              console.log(`[${correlationId}] Added text line ${lineIndex + 1} for layer ${index + 1}:`, {
                original: line.substring(0, 50),
                escaped: escapedLine.substring(0, 50),
                x: xPos,
                y: (layer.y || 0) + (lineIndex * lineHeight) + (layer.fontSize || 32)
              });
            }
          });
          
          if (linesRendered > 0) {
            layersRendered++;
            console.log(`[${correlationId}] ✅ Text layer ${index + 1} added to SVG (${linesRendered} lines, total layers rendered: ${layersRendered})`);
          } else {
            console.error(`[${correlationId}] ❌ Text layer ${index + 1} had no renderable lines! Text was: "${text}"`);
          }
        }
      }
      
      console.log(`[${correlationId}] 📊 Layer processing summary:`, {
        totalLayers: layers.length,
        layersProcessed,
        layersRendered,
        skipped: layersProcessed - layersRendered,
        success: layersRendered > 0
      });
      
      if (layersRendered === 0) {
        console.error(`[${correlationId}] ❌ CRITICAL: No layers were rendered! All ${layers.length} layers were skipped or failed.`);
        console.error(`[${correlationId}] Layers details:`, layers.map((l: any, i: number) => ({
          index: i + 1,
          type: l.type,
          visible: l.visible,
          content: l.content ? l.content.substring(0, 100) : 'N/A',
          imageUrl: l.imageUrl ? l.imageUrl.substring(0, 100) : 'N/A'
        })));
      }
    } else {
      console.warn(`[${correlationId}] No layers provided or layers is not an array`);
    }

    // Ensure we have at least some content (fallback if no layers rendered)
    const textElementsCount = (svgContent.match(/<text[^>]*>/g) || []).length;
    const imageElementsCount = (svgContent.match(/<image[^>]*>/g) || []).length;
    
    console.log(`[${correlationId}] Content check before closing SVG:`, {
      textElementsCount,
      imageElementsCount,
      svgLength: svgContent.length,
      hasTextTags: svgContent.includes('<text'),
      hasImageTags: svgContent.includes('<image')
    });
    
    if (textElementsCount === 0 && imageElementsCount === 0) {
      console.error(`[${correlationId}] ❌ CRITICAL: No layers rendered! Adding fallback text.`);
      console.error(`[${correlationId}] SVG content so far:`, svgContent.substring(0, 1000));
      // Add a fallback text to indicate something went wrong
      svgContent += `
        <text 
          x="${canvasWidth / 2}" 
          y="${canvasHeight / 2}"
          font-size="48"
          fill="#666666"
          font-family="Arial, sans-serif"
          text-anchor="middle"
          dominant-baseline="middle"
        >No content to display</text>
      `;
    }

    svgContent += '</svg>';

    // Validate SVG structure
    const svgStartCount = (svgContent.match(/<svg/g) || []).length;
    const svgEndCount = (svgContent.match(/<\/svg>/g) || []).length;
    const textElementCount = (svgContent.match(/<text[^>]*>/g) || []).length;
    const imageElementCount = (svgContent.match(/<image[^>]*>/g) || []).length;
    const rectElementCount = (svgContent.match(/<rect[^>]*>/g) || []).length;
    
    console.log(`[${correlationId}] 🔍 SVG Structure Validation:`, {
      svgStartTags: svgStartCount,
      svgEndTags: svgEndCount,
      isComplete: svgStartCount === 1 && svgEndCount === 1,
      textElements: textElementCount,
      imageElements: imageElementCount,
      rectElements: rectElementCount,
      totalElements: textElementCount + imageElementCount + rectElementCount,
      svgLength: svgContent.length,
      hasTestText: svgContent.includes('TEST: SVG Rendering Works'),
      svgFirst500: svgContent.substring(0, 500),
      svgLast500: svgContent.substring(Math.max(0, svgContent.length - 500))
    });
    
    if (svgStartCount !== 1 || svgEndCount !== 1) {
      console.error(`[${correlationId}] ❌ CRITICAL: Invalid SVG structure! Start tags: ${svgStartCount}, End tags: ${svgEndCount}`);
    }
    
    if (!svgContent.includes('TEST: SVG Rendering Works')) {
      console.error(`[${correlationId}] ❌ CRITICAL: Test text not found in SVG content!`);
    }
    
    // Count actual elements in SVG (excluding background)
    const backgroundImageCount = (svgContent.match(/<image[^>]*width=["']\d+["'][^>]*height=["']\d+["']/g) || []).length;
    const actualImageLayers = imageElementsCount - backgroundImageCount;
    
    console.log(`[${correlationId}] SVG content generated:`, {
      svgLength: svgContent.length,
      hasBackground: svgContent.includes('<image') || svgContent.includes('<rect'),
      textLayersCount: textElementsCount,
      imageLayersCount: actualImageLayers,
      backgroundImageCount: backgroundImageCount,
      totalLayersReceived: layers ? layers.length : 0,
      svgPreview: svgContent.substring(0, 2000) + '...',
      svgEnd: svgContent.substring(Math.max(0, svgContent.length - 500))
    });
    
    // Final validation
    if (textElementsCount === 0 && actualImageLayers === 0) {
      console.error(`[${correlationId}] ⚠️ WARNING: No content rendered! SVG will be blank.`);
      console.error(`[${correlationId}] Full SVG content (first 2000 chars):`, svgContent.substring(0, 2000));
      console.error(`[${correlationId}] Full SVG content (last 1000 chars):`, svgContent.substring(Math.max(0, svgContent.length - 1000)));
      console.error(`[${correlationId}] SVG content length:`, svgContent.length);
      console.error(`[${correlationId}] Text elements found:`, textElementsCount);
      console.error(`[${correlationId}] Image elements found:`, imageElementsCount);
      console.error(`[${correlationId}] Background images:`, backgroundImageCount);
      console.error(`[${correlationId}] Actual image layers:`, actualImageLayers);
    } else {
      console.log(`[${correlationId}] ✅ SVG content validated:`, {
        textElements: textElementsCount,
        imageLayers: actualImageLayers,
        backgroundImages: backgroundImageCount,
        svgLength: svgContent.length
      });
    }

    // Convert SVG to PNG using SVG to PNG conversion service
    console.log(`[${correlationId}] Converting SVG to PNG...`, {
      svgLength: svgContent.length,
      canvasWidth,
      canvasHeight,
      textElementsCount,
      imageElementsCount: actualImageLayers,
      svgHasContent: svgContent.length > 200,
      svgStartsWith: svgContent.substring(0, 50),
      svgEndsWith: svgContent.substring(Math.max(0, svgContent.length - 50))
    });
    
    // Log full SVG for debugging (first 5000 chars)
    console.log(`[${correlationId}] Full SVG content (first 5000 chars):`, svgContent.substring(0, 5000));
    
    const svgToImage = await convertSvgToPng(svgContent, canvasWidth, canvasHeight);
    
    console.log(`[${correlationId}] SVG to PNG conversion completed:`, {
      pngSize: svgToImage.length,
      pngSizeKB: (svgToImage.length / 1024).toFixed(2),
      isEmpty: svgToImage.length === 0
    });
    
    if (svgToImage.length === 0) {
      console.error(`[${correlationId}] ❌ CRITICAL: PNG conversion resulted in empty image!`);
      console.error(`[${correlationId}] SVG content that was converted:`, svgContent.substring(0, 2000));
    }
    
    // Generate unique filename with proper date structure and convention
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = Date.now();
    const tabKey = (source_mapped || 'COURT_AVAILABILITY')
      .toLowerCase()
      .replace('court_availability', 'court-availability')
      .replace('competitions', 'competitions-academies')
      .replace('partial_matches', 'partial-courts');
    const templateSlug = (template.name || 'template')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const isoStamp = new Date().toISOString().replace(/[:-]/g, '').replace(/\..+/, 'Z');
    const filename = `${tabKey}_${templateSlug}_${isoStamp}.png`;
    const imagePath = `org_${org_id}/${year}/${month}/${day}/${filename}`;
    
    // Upload to Supabase Storage with proper blob handling
    const pngBlob = new Blob([svgToImage.buffer], { type: 'image/png' });
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('social-posts')
      .upload(imagePath, pngBlob, {
        contentType: 'image/png',
        upsert: true,
        duplex: 'half'
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('social-posts')
      .getPublicUrl(imagePath);

    console.log(`[${correlationId}] Authenticated:`, userId || 'service_role');

    // Insert render record using mapped source
    const { data: renderData, error: insertError } = await supabase
      .from('social_post_renders')
      .insert({
        org_id,
        template_id,
        source: source_mapped,
        summary_variant,
        message_content_raw,
        message_content_resolved,
        image_path: imagePath,
        image_url: publicUrl,
        width: canvasWidth,
        height: canvasHeight,
        created_by: userId || org_id // Use org_id as fallback for service role calls
      })
      .select()
      .single();

    if (insertError) {
      console.error(`[${correlationId}] Insert error:`, insertError);
      throw insertError;
    }

    console.log(`[${correlationId}] Successfully created render:`, renderData.id);

    return new Response(JSON.stringify({
      success: true,
      render_id: renderData.id,
      image_url: publicUrl,
      image_path: imagePath,
      correlationId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const correlationId = crypto.randomUUID().slice(0, 8);
    const err = error as Error;
    console.error(`[${correlationId}] Error in render-social-post function:`, error);
    return new Response(JSON.stringify({ 
      error: err.message,
      success: false,
      correlationId,
      details: err.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper functions
function compileMessageContent(template: string, context: any): string {
  let compiled = template;
  
  const replacements = {
    '{{summary}}': context.summary || '',
    '{{club_name}}': context.club_name || '',
    '{{date_display_short}}': context.date_display_short || '',
    '{{sport}}': context.sport || 'Padel',
    '{{count_slots}}': context.count_slots?.toString() || '0',
    '{{message_content}}': template
  };
  
  for (const [token, value] of Object.entries(replacements)) {
    compiled = compiled.replace(new RegExp(token.replace(/[{}]/g, '\\$&'), 'g'), value);
  }
  
  return compiled;
}

function getTextForBinding(binding: string, context: any, messageContent: string): string {
  switch (binding) {
    case 'summary':
      return context.summary || '';
    case 'club_name':
      return context.club_name || '';
    case 'date_display_short':
      return context.date_display_short || '';
    case 'sport':
      return context.sport || 'Padel';
    case 'count_slots':
      return context.count_slots?.toString() || '0';
    case 'message_content':
      return messageContent;
    default:
      return `{{${binding}}}`;
  }
}

// Helper to escape XML characters
function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// Helper function to fetch image as data URL
async function fetchImageAsDataUrl(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64 = b64encode(uint8Array);
    
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error('Error fetching image as data URL:', error);
    throw error;
  }
}

// SVG to PNG conversion using proper libraries
async function convertSvgToPng(svgContent: string, width: number, height: number): Promise<Uint8Array> {
  console.log('Converting SVG to PNG...', { 
    width, 
    height,
    svgLength: svgContent.length,
    svgPreview: svgContent.substring(0, 500),
    hasText: svgContent.includes('<text'),
    hasImage: svgContent.includes('<image'),
    hasRect: svgContent.includes('<rect')
  });

  // Try resvg-wasm via esm.sh with proper configuration
  try {
    const { Resvg, initWasm } = await import('https://esm.sh/@resvg/resvg-wasm@2.6.2?target=deno');
    const wasmUrl = 'https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm';
    const wasmBinary = await fetch(wasmUrl).then(r => r.arrayBuffer());
    await initWasm(wasmBinary);

    // Validate SVG before conversion
    if (!svgContent.includes('<svg')) {
      throw new Error('SVG content does not contain <svg> tag');
    }
    if (!svgContent.includes('</svg>')) {
      throw new Error('SVG content does not contain closing </svg> tag');
    }
    
    console.log('SVG validation passed, loading fonts...');
    
    // Try to load a font from CDN for text rendering
    let fontBuffers: Uint8Array[] = [];
    try {
      // Load Arial-equivalent font (DejaVu Sans is a common fallback)
      // Using a publicly available font file
      const fontUrl = 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf';
      const fontResponse = await fetch(fontUrl);
      if (fontResponse.ok) {
        const fontData = await fontResponse.arrayBuffer();
        fontBuffers.push(new Uint8Array(fontData));
        console.log('✅ Font loaded successfully');
      } else {
        console.warn('⚠️ Could not load font from CDN, proceeding without custom font');
      }
    } catch (fontError) {
      console.warn('⚠️ Font loading failed:', fontError);
    }
    
    console.log('Creating Resvg instance...');
    
    const resvg = new Resvg(svgContent, {
      background: 'white',
      fitTo: {
        mode: 'width',
        value: width,
      },
      font: {
        loadSystemFonts: false, // Disable system fonts (not available in Deno)
        defaultFontFamily: 'Roboto',
        fontFiles: [],
        fontBuffers: fontBuffers,
      },
    });

    console.log('Rendering PNG from SVG...');
    const rendered = resvg.render();
    const pngData = rendered.asPng();
    console.log('✅ resvg conversion successful', { 
      outputSize: pngData.length,
      outputSizeKB: (pngData.length / 1024).toFixed(2),
      isEmpty: pngData.length === 0
    });
    
    if (pngData.length === 0) {
      console.error('❌ CRITICAL: resvg conversion resulted in empty PNG!');
      console.error('SVG content:', svgContent.substring(0, 2000));
    }
    
    return new Uint8Array(pngData);
  } catch (e) {
    console.error('❌ resvg failed:', e);
    console.error('Falling back to createValidPngFallback...');
    return createValidPngFallback(width, height, svgContent);
  }
}

// Create a proper fallback PNG with composite content
async function createValidPngFallback(width: number, height: number, svgContent: string): Promise<Uint8Array> {
  console.log('Creating structured PNG fallback');
  
  // Extract text content and styles from SVG
  const textMatches = svgContent.match(/<text[^>]*>(.*?)<\/text>/g) || [];
  const texts = textMatches.map(match => {
    const content = match.replace(/<text[^>]*>/, '').replace(/<\/text>/, '');
    return content.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
  }).filter(text => text.length > 0);

  // Check if there's a background image in the SVG
  const hasBackground = svgContent.includes('<image') || svgContent.includes('background');
  
  // Create a basic but informative fallback SVG
  const fallbackSvg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)"/>
      ${hasBackground ? `<rect x="10%" y="10%" width="80%" height="60%" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2" rx="8" opacity="0.5"/>` : ''}
      <rect x="5%" y="5%" width="90%" height="90%" fill="none" stroke="#cbd5e1" stroke-width="1" rx="12"/>
      ${texts.map((text, i) => {
        const y = Math.min(height * 0.2 + (i * 60), height * 0.8);
        const fontSize = Math.max(16, Math.min(32, width / (text.length * 0.8)));
        return `<text x="50%" y="${y}" font-family="Inter, Arial, sans-serif" font-size="${fontSize}" font-weight="600" fill="#1e293b" text-anchor="middle" dominant-baseline="middle">${escapeXml(text.slice(0, 120))}</text>`;
      }).join('')}
      <text x="50%" y="${height - 30}" font-family="Inter, Arial, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">Social Post • Generated ${new Date().toLocaleDateString()}</text>
    </svg>
  `;

  // Try resvg one more time with the simplified SVG
  try {
    const { Resvg, initWasm } = await import('https://esm.sh/@resvg/resvg-wasm@2.6.2?target=deno');
    const wasmUrl = 'https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm';
    const wasmBinary = await fetch(wasmUrl).then(r => r.arrayBuffer());
    await initWasm(wasmBinary);

    const resvg = new Resvg(fallbackSvg, {
      background: 'white',
      fitTo: { mode: 'zoom', value: 1.0 },
    });

    const pngData = resvg.render().asPng();
    console.log('Fallback SVG converted successfully');
    return new Uint8Array(pngData);
  } catch (e) {
    console.warn('Fallback SVG conversion failed:', e);
    return createBasicPng(width, height);
  }
}

// Create a basic valid PNG as final fallback
function createBasicPng(width: number, height: number): Uint8Array {
  console.log('Creating basic PNG fallback');
  
  // Create a simple white PNG with proper size encoding
  // This is a more complete PNG structure that should work reliably
  const widthBytes = new Uint8Array(4);
  const heightBytes = new Uint8Array(4);
  const view = new DataView(widthBytes.buffer);
  view.setUint32(0, width, false);
  const hView = new DataView(heightBytes.buffer);
  hView.setUint32(0, height, false);
  
  const pngData = new Uint8Array([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk header
    ...widthBytes, ...heightBytes, // Width and height
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, // Bit depth, color type, etc.
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, // IDAT chunk header
    0x54, 0x78, 0x9C, 0x63, 0xF8, 0x0F, 0x00, 0x00, // Minimal compressed data
    0x01, 0x00, 0x01, 0x14, 0x47, 0x82, 0x32, 0x00, // CRC and more
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, // IEND chunk
    0x42, 0x60, 0x82
  ]);
  
  return pngData;
}