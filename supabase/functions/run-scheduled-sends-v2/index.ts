import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'
import { DateTime } from "https://esm.sh/luxon@3.4.4"


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Message rendering utility - same as manual send
function renderTemplate(content: string, tokens: Record<string, string>): string {
  let rendered = content
  for (const [key, value] of Object.entries(tokens)) {
    rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }
  return rendered
}

async function fetchMatchesData(tenantId: string, startDate: string, endDate: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
  
  const { data, error } = await supabase.functions.invoke('playtomic-fetch', {
    body: {
      tenant_id: tenantId,
      endpoint: 'matches',
      sport_id: 'PADEL',
      has_players: 'TRUE',
      start_min: startDate,
      start_max: endDate
    }
  })
  
  if (error) throw error
  return data
}

async function fetchCompetitionsData(tenantId: string, startDate: string, endDate: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
  
  // Fetch tournaments, lessons, and classes separately
  const [tournamentsResp, lessonsResp, classesResp] = await Promise.all([
    supabase.functions.invoke('playtomic-fetch', {
      body: { tenant_id: tenantId, endpoint: 'tournaments', sport_id: 'PADEL', start_min: startDate, start_max: endDate }
    }),
    supabase.functions.invoke('playtomic-fetch', {
      body: { tenant_id: tenantId, endpoint: 'lessons', sport_id: 'PADEL', start_min: startDate, start_max: endDate }
    }),
    supabase.functions.invoke('playtomic-fetch', {
      body: { tenant_id: tenantId, endpoint: 'classes', sport_id: 'PADEL', start_min: startDate, start_max: endDate }
    })
  ])
  
  // Log any errors from individual endpoints
  if (tournamentsResp.error) {
    console.error('Error fetching tournaments:', tournamentsResp.error);
  }
  if (lessonsResp.error) {
    console.error('Error fetching lessons:', lessonsResp.error);
  }
  if (classesResp.error) {
    console.error('Error fetching classes:', classesResp.error);
  }
  
  // Extract data - handle both raw and direct response formats
  const tournaments = tournamentsResp.data?.raw || tournamentsResp.data || [];
  const lessons = lessonsResp.data?.raw || lessonsResp.data || [];
  const classes = classesResp.data?.raw || classesResp.data || [];
  
  console.log(`fetchCompetitionsData results:`, {
    tournaments: tournaments.length,
    lessons: lessons.length,
    classes: classes.length,
    tournaments_has_error: !!tournamentsResp.error,
    lessons_has_error: !!lessonsResp.error,
    classes_has_error: !!classesResp.error
  });
  
  return {
    tournaments,
    lessons,
    classes
  }
}

// Fetch a specific event by ID (without date filters - searches wider range)
async function fetchSpecificEvent(tenantId: string, eventId: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
  
  // Search with a wide date range (30 days in past and future)
  const now = new Date()
  const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
  
  console.log(`Fetching specific event ${eventId} with wide date range:`, { startDate, endDate })
  
  // Fetch all event types to find the specific event
  const [tournamentsResp, lessonsResp, classesResp] = await Promise.all([
    supabase.functions.invoke('playtomic-fetch', {
      body: { tenant_id: tenantId, endpoint: 'tournaments', sport_id: 'PADEL', start_min: startDate, start_max: endDate }
    }),
    supabase.functions.invoke('playtomic-fetch', {
      body: { tenant_id: tenantId, endpoint: 'lessons', sport_id: 'PADEL', start_min: startDate, start_max: endDate }
    }),
    supabase.functions.invoke('playtomic-fetch', {
      body: { tenant_id: tenantId, endpoint: 'classes', sport_id: 'PADEL', start_min: startDate, start_max: endDate }
    })
  ])
  
  const allEvents = [
    ...((tournamentsResp.data?.raw || tournamentsResp.data || []).map((e: any) => ({ ...e, type: 'tournament' }))),
    ...((lessonsResp.data?.raw || lessonsResp.data || []).map((e: any) => ({ ...e, type: 'lesson' }))),
    ...((classesResp.data?.raw || classesResp.data || []).map((e: any) => ({ ...e, type: 'class' })))
  ]
  
  // Find the specific event by ID
  const event = allEvents.find((e: any) => {
    const eId = e.tournament_id || e.id || e.tournamentId
    return eId === eventId || String(eId) === String(eventId)
  })
  
  if (event) {
    console.log(`Found specific event:`, {
      id: event.tournament_id || event.id,
      name: event.tournament_name || event.name || event.title,
      type: event.type,
      start_date: event.start_date
    })
  } else {
    console.log(`Specific event ${eventId} not found in ${allEvents.length} events`)
  }
  
  return event
}

async function fetchAvailabilityData(tenantId: string, startDate: string, endDate: string) {
  // Fetch availability data - same logic as manual send
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
  
  const { data, error } = await supabase.functions.invoke('playtomic-fetch', {
    body: {
      tenant_id: tenantId,
      endpoint: 'availability',
      sport_id: 'PADEL',
      start_min: startDate,
      start_max: endDate
    }
  })
  
  if (error) throw error
  return data
}

// Helper functions for wall-time math and formatting (from admin)
function hhmmToMinutes(timeStr: string): number {
  const parts = timeStr.split(':').map(n => parseInt(n));
  return parts[0] * 60 + (parts[1] || 0);
}

function minutesToHHMM(minutes: number): string {
  const totalMins = minutes % 1440; // Wrap to 0-1439
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function addMinutesLocal(timeStr: string, offsetMins: number): string {
  const baseMins = hhmmToMinutes(timeStr);
  const adjustedMins = (baseMins + offsetMins + 1440) % 1440; // Handle negatives
  return minutesToHHMM(adjustedMins);
}

function formatCompactAmPm(minutes: number): string {
  const totalMins = ((minutes % 1440) + 1440) % 1440; // Wrap to 0–1439
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  
  if (hours === 0) {
    return mins === 0 ? "12am" : `12:${mins.toString().padStart(2, '0')}am`;
  } else if (hours < 12) {
    return mins === 0 ? `${hours}am` : `${hours}:${mins.toString().padStart(2, '0')}am`;
  } else if (hours === 12) {
    return mins === 0 ? "12pm" : `12:${mins.toString().padStart(2, '0')}pm`;
  } else {
    const displayHour = hours - 12;
    return mins === 0 ? `${displayHour}pm` : `${displayHour}:${mins.toString().padStart(2, '0')}pm`;
  }
}

// Non-overlapping day-part boundaries (in minutes) - from admin
const DAY_PART_BOUNDARIES = {
  morning: { start: 360, end: 720 }, // 06:00 - 12:00
  afternoon: { start: 720, end: 1020 }, // 12:00 - 17:00  
  evening: { start: 1020, end: 1380 } // 17:00 - 23:00
};

// Extract slots directly from raw JSON (from admin)
function extractRawSlots(data: any[]) {
  if (!Array.isArray(data) || data.length === 0) return [];
  
  const slots = [];
  
  for (const item of data) {
    if (item.slots && Array.isArray(item.slots)) {
      // This is a resource with nested slots
      for (const slot of item.slots) {
        slots.push({
          ...slot,
          start_date: item.start_date ?? slot.start_date, // Propagate start_date to reduce warnings
          resource_id: item.resource_id || item.id,
          resource_name: item.name || item.resource_name
        });
      }
    } else {
      // This might be a direct slot
      slots.push(item);
    }
  }
  
  return slots;
}

// Parse time from raw slot data with Playtomic offset (from admin)
function parseSlotTime(slot: any, playtomicOffsetMinutes = 60) {
  let startTime = null;
  
  // Try different field combinations
  if (slot.start_date && slot.start_time) {
    startTime = slot.start_time; // Use just the time part (HH:MM format)
  } else if (slot.start_time) {
    startTime = slot.start_time;
  } else if (slot.startTime) {
    startTime = slot.startTime;
  }
  
  if (!startTime) return null;
  
  // Extract base time and apply Playtomic offset
  const baseTime = startTime.split(':').slice(0, 2).join(':'); // Get HH:MM
  const duration = slot.duration || slot.duration_minutes || slot.length || 90;
  
  // Apply offset to get adjusted times
  const adjustedStartHHMM = addMinutesLocal(baseTime, playtomicOffsetMinutes);
  const adjustedStartMin = hhmmToMinutes(adjustedStartHHMM);
  const adjustedEndMin = (adjustedStartMin + duration) % 1440;
  
  return {
    startTimeHHMM: baseTime,
    adjustedStartHHMM,
    adjustedStartMin,
    adjustedEndMin,
    hour: Math.floor(adjustedStartMin / 60),
    duration
  };
}

// Generate enhanced summary using admin logic - day-parts time ranges
function generateDirectDayPartsTimeRangesSummary(slots: any[]) {
      const ranges: Record<string, { minStart: number | null; maxEnd: number | null; count: number }> = {
        morning: { minStart: null, maxEnd: null, count: 0 },
        afternoon: { minStart: null, maxEnd: null, count: 0 },
        evening: { minStart: null, maxEnd: null, count: 0 }
      };

  let outsideCount = 0;

  slots.forEach(slot => {
    const { adjustedStartMin, adjustedEndMin } = slot.timeData;
    
    let dayPart = null;
    let bucketEndMin = null;
    
    if (adjustedStartMin >= DAY_PART_BOUNDARIES.morning.start && adjustedStartMin < DAY_PART_BOUNDARIES.morning.end) {
      dayPart = 'morning';
      bucketEndMin = DAY_PART_BOUNDARIES.morning.end;
    } else if (adjustedStartMin >= DAY_PART_BOUNDARIES.afternoon.start && adjustedStartMin < DAY_PART_BOUNDARIES.afternoon.end) {
      dayPart = 'afternoon';
      bucketEndMin = DAY_PART_BOUNDARIES.afternoon.end;
    } else if (adjustedStartMin >= DAY_PART_BOUNDARIES.evening.start && adjustedStartMin < DAY_PART_BOUNDARIES.evening.end) {
      dayPart = 'evening';
      bucketEndMin = DAY_PART_BOUNDARIES.evening.end;
    } else {
      outsideCount++;
      return;
    }

    // Count the slot in this day-part
    ranges[dayPart].count++;

    // Clamp end time to bucket boundary
    const clampedEndMin = Math.min(adjustedEndMin, bucketEndMin);
    
    if (ranges[dayPart].minStart === null || adjustedStartMin < ranges[dayPart].minStart) {
      ranges[dayPart].minStart = adjustedStartMin;
    }
    if (ranges[dayPart].maxEnd === null || clampedEndMin > ranges[dayPart].maxEnd) {
      ranges[dayPart].maxEnd = clampedEndMin;
    }
  });

  const parts = [];
  if (ranges.morning.minStart !== null && ranges.morning.maxEnd !== null) {
    const timeRange = `${formatCompactAmPm(ranges.morning.minStart)} – ${formatCompactAmPm(ranges.morning.maxEnd)}`;
    const countSuffix = ranges.morning.count < 5 ? ` x${ranges.morning.count}` : '';
    parts.push(`Morning: ${timeRange}${countSuffix}`);
  }
  if (ranges.afternoon.minStart !== null && ranges.afternoon.maxEnd !== null) {
    const timeRange = `${formatCompactAmPm(ranges.afternoon.minStart)} – ${formatCompactAmPm(ranges.afternoon.maxEnd)}`;
    const countSuffix = ranges.afternoon.count < 5 ? ` x${ranges.afternoon.count}` : '';
    parts.push(`Afternoon: ${timeRange}${countSuffix}`);
  }
  if (ranges.evening.minStart !== null && ranges.evening.maxEnd !== null) {
    const timeRange = `${formatCompactAmPm(ranges.evening.minStart)} – ${formatCompactAmPm(ranges.evening.maxEnd)}`;
    const countSuffix = ranges.evening.count < 5 ? ` x${ranges.evening.count}` : '';
    parts.push(`Evening: ${timeRange}${countSuffix}`);
  }

  if (parts.length === 0) {
    return `No day-part ranges within 6am–10:59pm (found ${outsideCount} slots outside this window).`;
  }

  return parts.join('\n');
}

// Generate friendly date display (same as manual send)
function toShortDate(from: Date, to: Date, tz = 'Europe/London'): string {
  const f = new Intl.DateTimeFormat('en-US', { 
    timeZone: tz,
    weekday: 'short', 
    day: 'numeric', 
    month: 'short' 
  }).format(from); // Mon 29 Sep
  
  const t = new Intl.DateTimeFormat('en-US', { 
    timeZone: tz,
    weekday: 'short', 
    day: 'numeric', 
    month: 'short' 
  }).format(to); // Tue 30 Sep
  
  return f === t ? f : `${f} – ${t}`;
}

function generateSummary(availabilityData: any, startDate?: string, endDate?: string, timezone?: string): { summary: string, count_slots: number, date_display_short?: string } {
  console.log('generateSummary input:', JSON.stringify(availabilityData, null, 2))
  
  // The playtomic-fetch function returns { url, status, raw, error, ... }
  // We need to access the 'raw' field which contains the actual API response
  let actualData = availabilityData
  
  if (availabilityData?.raw) {
    actualData = availabilityData.raw
    console.log('Using raw data from playtomic-fetch response')
  }
  
  // Use the same logic as manual send - generateAvailabilitySummary
  if (!Array.isArray(actualData) || actualData.length === 0) {
    console.log('No data array, returning "No courts available"')
    return { summary: "No courts available", count_slots: 0 }
  }

  // Extract raw slots and parse times directly (same as manual send)
  const rawSlots = extractRawSlots(actualData);
  const validSlots = rawSlots
    .map(slot => ({ ...slot, timeData: parseSlotTime(slot, 60) }))
    .filter(slot => slot.timeData !== null);
  
  console.log('Valid slots after parsing:', validSlots.length)
  
  if (validSlots.length === 0) {
    console.log('No valid slots after parsing, returning "No courts available"')
    return { summary: "No courts available", count_slots: 0 }
  }
  
  // Use the same detailed summary format as manual send
  const summary = generateDirectDayPartsTimeRangesSummary(validSlots);
  
  // Generate date display (same as manual send)
  let date_display_short = undefined;
  if (startDate && endDate && timezone) {
    try {
      const fromDate = new Date(startDate);
      const toDate = new Date(endDate);
      date_display_short = toShortDate(fromDate, toDate, timezone);
      console.log('Generated date_display_short:', date_display_short);
    } catch (error) {
      console.error('Error generating date_display_short:', error);
    }
  }
  
  console.log('Final detailed summary:', summary)
  return { summary, count_slots: validSlots.length, date_display_short }
}

function formatTournamentDateTime(tournament: any, playtomicOffsetMinutes = 60) {
  try {
    const startDate = new Date(tournament.start_date);
    const endDate = new Date(tournament.end_date);
    
    // Apply Playtomic offset
    const adjustedStart = new Date(startDate.getTime() + playtomicOffsetMinutes * 60000);
    const adjustedEnd = new Date(endDate.getTime() + playtomicOffsetMinutes * 60000);
    
    const dateStr = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(adjustedStart);
    const startTimeStr = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(adjustedStart);
    const endTimeStr = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(adjustedEnd);
    const startTime = formatCompactAmPm(hhmmToMinutes(startTimeStr));
    const endTime = formatCompactAmPm(hhmmToMinutes(endTimeStr));
    
    return {
      date: dateStr,
      time: `${startTime} – ${endTime}`
    };
  } catch (_error) {
    return {
      date: 'Invalid date',
      time: 'Invalid time'
    };
  }
}

function getPlayerCapacity(tournament: any) {
  const registered = tournament.registered_players?.length || 0;
  const max = tournament.max_players || 0;
  const spacesLeft = Math.max(0, max - registered);
  
  return {
    registered,
    max,
    spacesLeft,
    display: `${registered}/${max}`,
    full: registered >= max
  };
}

function getTournamentId(tournament: any) {
  return tournament.tournament_id || tournament.id || tournament.tournamentId || null;
}

function getTournamentJoinUrl(tournament: any) {
  const tournamentId = getTournamentId(tournament);
  return tournamentId ? `https://app.playtomic.io/lessons/${tournamentId}` : null;
}

function generateTournamentSummary(tournament: any, playtomicOffsetMinutes = 60) {
  if (!tournament) return '';
  
  const name = (tournament.tournament_name || tournament.name || tournament.title || 'Untitled').trim();
  const dateTime = formatTournamentDateTime(tournament, playtomicOffsetMinutes);
  const capacity = getPlayerCapacity(tournament);
  const joinUrl = getTournamentJoinUrl(tournament);
  
  // Handle cancelled tournaments
  const isCancelled = tournament.is_cancelled === true || tournament.tournament_status === 'CANCELLED';
  const spacesText = isCancelled ? 'Spaces left = 0 (Cancelled)' : `Spaces left = ${capacity.spacesLeft}`;
  
  let summary = `${name}
Date: ${dateTime.date}
Time: ${dateTime.time}
${spacesText}`;

  if (joinUrl) {
    summary += `\nJoin URL: ${joinUrl}`;
  }

  return summary;
}

function formatMatchWhatsAppBlock(match: any, timezone = 'Europe/London', playtomicOffset = 60) {
  // Parse and format date/time
  let formattedDate = 'Date: Unknown';
  let formattedTime = 'Time: Unknown';
  
  if (match.start_date) {
    try {
      const startDate = new Date(match.start_date);
      
      // Apply Playtomic offset
      const offsetDate = new Date(startDate.getTime() + playtomicOffset * 60000);
      
      // Format date 
      formattedDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(offsetDate);
      
      // Handle duration and end time
      const duration = match.duration || 60; // Default 60 minutes
      const endDate = new Date(offsetDate.getTime() + duration * 60000);
      
      // Convert to 12-hour format without spaces/dots
      const fmt12 = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const startTime12 = fmt12.format(offsetDate).toLowerCase().replace(/\s/g, '');
      const endTime12 = fmt12.format(endDate).toLowerCase().replace(/\s/g, '');
      formattedTime = `${startTime12} – ${endTime12}`;
    } catch (_error) {
      console.error('Error formatting match date');
    }
  }

  // Get location info
  const location_name = match.location || match.tenant?.tenant_name || 'Unknown Location';
  const city = match.tenant?.address?.city || match.location_info?.address?.city || 'Unknown City';

  // Calculate level range - prioritize match min_level/max_level if available
  let levelRange = 'Level N/A';
  if (match.min_level != null && match.max_level != null) {
    // Use match's min/max level (formatted to 2 decimal places)
    const minLevel = match.min_level.toFixed(2);
    const maxLevel = match.max_level.toFixed(2);
    levelRange = `Level ${minLevel} - ${maxLevel}`;
  } else if (match.allPlayers && match.allPlayers.length > 0) {
    // Fall back to calculating from player levels (formatted to 1 decimal)
    const levels = match.allPlayers
      .map((player: any) => player.level_value)
      .filter((level: any) => typeof level === 'number');
    
    if (levels.length > 0) {
      const minLevel = Math.min(...levels).toFixed(1);
      const maxLevel = Math.max(...levels).toFixed(1);
      levelRange = `Level ${minLevel} - ${maxLevel}`;
    }
  }

  // Build player list and empty slots
  let playerLines = '';
  
  // Add confirmed players
  if (match.allPlayers) {
    match.allPlayers.forEach((player: any) => {
      const level = player.level_value ? `(${player.level_value.toFixed(2)})` : '(N/A)';
      playerLines += `✅ ${player.name} ${level}\n`;
    });
  }
  
  // Add empty slots
  const emptySlots = match.spacesLeft || 0;
  for (let i = 0; i < emptySlots; i++) {
    playerLines += '⚪ ??\n';
  }

  // Build the match URL
  const matchUrl = `https://app.playtomic.io/matches/${match.match_id}`;

  return `*MATCH IN ${location_name}*
📅 ${formattedDate}, ${formattedTime} (${match.duration || 60}min)
📍 ${city}
📊 ${levelRange}
${playerLines.trim()}
${matchUrl}`;
}

function generateCompetitiveOpenMatchesSummary(matches: any[], timezone = 'Europe/London', playtomicOffset = 60) {
  // Filter for competitive open matches with 1-3 players
  const competitiveMatches = matches.filter(match => {
    // Check if cancelled
    const cancelled = match.status?.toLowerCase() === 'cancelled';
    if (cancelled) return false;
    
    // Check join requests status is OPEN (case-insensitive)
    const joinStatus = match.join_requests_info?.status?.toLowerCase();
    if (joinStatus !== 'open') return false;
    
    // Check competition_mode is COMPETITIVE (case-insensitive)
    const compMode = match.competition_mode?.toLowerCase();
    if (compMode !== 'competitive') return false;
    
    // Check match_type is COMPETITIVE (case-insensitive)
    const matchType = match.match_type?.toLowerCase();
    if (matchType !== 'competitive') return false;
    
    // Count registered players with names
    const registeredPlayers = match.teams?.reduce((count: number, team: any) => {
      const playersWithNames = team.players?.filter((player: any) => player.name) || [];
      return count + playersWithNames.length;
    }, 0) || 0;
    
    // Check if between 1-3 players
    return registeredPlayers >= 1 && registeredPlayers <= 3;
  }).map(match => {
    // Enrich matches with player data for display
    const registeredPlayers = match.teams?.reduce((count: number, team: any) => {
      const playersWithNames = team.players?.filter((player: any) => player.name) || [];
      return count + playersWithNames.length;
    }, 0) || 0;

    // Calculate max players (usually 4 for doubles)
    const maxPlayersPerTeam = match.max_players_per_team || 2;
    const numberOfTeams = 2; // Standard doubles
    const maxPlayers = maxPlayersPerTeam * numberOfTeams;

    // Get all player info for detailed display with consistent level_value property
    const allPlayers = match.teams?.flatMap((team: any) => 
      team.players?.map((player: any) => ({
        name: player.name || '??',
        level_value: player.level_value || player.level || null
      })) || []
    ) || [];

    return {
      ...match,
      registeredPlayers,
      maxPlayers,
      allPlayers,
      spacesLeft: Math.max(0, maxPlayers - registeredPlayers)
    };
  }).sort((a, b) => {
    if (a.start_date && b.start_date) {
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    }
    return 0;
  });
  
  const headerText = `— COMPETITIVE — OPEN (1–3 PLAYERS) (${competitiveMatches.length}) —`;
  
  if (competitiveMatches.length === 0) {
    return `${headerText}\n\nNo matches found for this criteria.`;
  }

  const matchBlocks = competitiveMatches.map(match => formatMatchWhatsAppBlock(match, timezone, playtomicOffset));
  return `${headerText}\n\n${matchBlocks.join('\n\n')}`;
}

function generateCompetitionsSummary(data: any): string {
  const tournaments = data?.tournaments || []
  const lessons = data?.lessons || []
  const classes = data?.classes || []
  
  const allEvents = [
    ...tournaments.map((e: any) => ({ ...e, type: 'tournament' })),
    ...lessons.map((e: any) => ({ ...e, type: 'lesson' })),
    ...classes.map((e: any) => ({ ...e, type: 'class' }))
  ]
  
  if (allEvents.length === 0) {
    return 'No competitions or academies available'
  }

  // Generate detailed summaries for each event
  const eventSummaries = allEvents.map(event => generateTournamentSummary(event, 60))
  return eventSummaries.join('\n\n---\n\n')
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('=== run-scheduled-sends-v2 STARTED ===')
    console.log('Method:', req.method)
    // Note: This function does not require JWT authentication (disabled in Supabase dashboard)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
    
    console.log('Running scheduled sends v2 at:', new Date().toISOString())
    
    // Fetch due schedules
    const { data: schedules, error: schedulesError } = await supabase
      .from('scheduled_sends_v2')
      .select(`
        *,
        message_templates (id, name, content, summary_variant, linked_event_id),
        organizations (tenant_id, name)
      `)
      .eq('status', 'ACTIVE')
      .lte('next_run_at_utc', new Date().toISOString())
      .order('next_run_at_utc')
      .limit(50)
    
    if (schedulesError) {
      console.error('Error fetching schedules:', schedulesError)
      throw schedulesError
    }
    
    console.log(`Found ${schedules.length} due schedules`)
    
    const results = []
    
    for (const schedule of schedules) {
      console.log(`Processing schedule: ${schedule.id} - ${schedule.name}`)
      
      // Calculate next run time - always calculate for tomorrow (will be updated after successful send for one-off)
      const isOneOff = schedule.is_one_off === true;
      
      // Recurring schedule: same time tomorrow in club timezone
      const [hour, minute] = schedule.time_local.split(':').map(Number);
      const nextLocal = DateTime.now()
        .setZone(schedule.tz)
        .plus({ days: 1 })
        .set({ hour, minute, second: 0, millisecond: 0 });
      const nextRunUtc = nextLocal.toUTC().toISO();
      
      // Update schedule immediately to prevent duplicate processing (but don't mark one-off as COMPLETED yet)
      await supabase
        .from('scheduled_sends_v2')
        .update({
          next_run_at_utc: nextRunUtc,
          last_run_at_utc: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', schedule.id);
      
      const nextLocalDisplay = DateTime.fromISO(nextRunUtc!, { zone: schedule.tz });
      console.log(`Updated next_run_at_utc to: ${nextRunUtc} (${nextLocalDisplay.toFormat('yyyy-MM-dd HH:mm')} ${schedule.tz})${isOneOff ? ' (one-off - will complete after successful send)' : ''}`);
      
      try {
        // Calculate date range based on target or custom date range
        let startDate: string;
        let endDate: string;
        
        // Check if custom date range is provided (for one-off COMPETITIONS_ACADEMIES)
        if (schedule.date_start_utc && schedule.date_end_utc) {
          startDate = schedule.date_start_utc;
          endDate = schedule.date_end_utc;
          console.log(`Using custom date range:`, { startDate, endDate, tz: schedule.tz });
        } else {
          // Use specific time ranges based on target
          const now = DateTime.now().setZone(schedule.tz);
          let targetDate: DateTime;
          
          if (schedule.target === 'TODAY') {
            targetDate = now;
          } else { // TOMORROW
            targetDate = now.plus({ days: 1 });
          }
          
          // Use specific time ranges as per user requirements:
          // TODAY: 08:00 PM yesterday to 07:59:59 PM today
          // TOMORROW: 08:00 PM today to 07:59:59 PM tomorrow
          let startDateTime: DateTime;
          let endDateTime: DateTime;
          
          if (schedule.target === 'TODAY') {
            // TODAY: start from 8PM yesterday, end at 7:59:59 PM today
            startDateTime = targetDate.minus({ days: 1 }).set({ hour: 20, minute: 0, second: 0, millisecond: 0 });
            endDateTime = targetDate.set({ hour: 19, minute: 59, second: 59, millisecond: 999 });
          } else { // TOMORROW
            // TOMORROW: start from 8PM today, end at 7:59:59 PM tomorrow
            startDateTime = now.set({ hour: 20, minute: 0, second: 0, millisecond: 0 }); // 8PM today
            endDateTime = targetDate.set({ hour: 19, minute: 59, second: 59, millisecond: 999 }); // 7:59:59 PM tomorrow
          }
          
        startDate = startDateTime.toUTC().toISO()?.replace(/\.\d{3}Z$/, '') || '';
        endDate = endDateTime.toUTC().toISO()?.replace(/\.\d{3}Z$/, '') || '';
        }
        
        console.log(`Fetching data for ${schedule.target || 'custom'}:`, { startDate, endDate, tz: schedule.tz });
        
        // Determine endpoint and fetch data based on category
        // For Court Availability, we always fetch availability data
        let summary = 'No data available'
        let count_slots = 0
        let date_display_short: string | undefined = undefined
        
        // Default to AVAILABILITY for Court Availability schedules
        const category = schedule.category || 'AVAILABILITY'
        
        if (category === 'AVAILABILITY') {
          try {
            const availabilityData = await fetchAvailabilityData(
              schedule.organizations.tenant_id,
              startDate,
              endDate
            )
            
            // Debug: Log the actual data structure
            console.log(`Availability data for ${schedule.target}:`, JSON.stringify(availabilityData, null, 2))
            
            // Check if we got a 400 error from Playtomic API
            if (availabilityData?.status === 400) {
              console.error(`Playtomic API returned 400 error for ${schedule.target}`)
              console.error(`API URL: ${availabilityData.url}`)
              console.error(`Error details: ${JSON.stringify(availabilityData.raw)}`)
              summary = "Error fetching availability data"
              count_slots = 0
            } else {
              const summaryData = generateSummary(availabilityData, startDate, endDate, schedule.tz)
              summary = summaryData.summary
              count_slots = summaryData.count_slots
              date_display_short = summaryData.date_display_short
            }
            
            console.log(`Generated summary: "${summary}" with ${count_slots} slots`)
          } catch (error) {
            console.error(`Error fetching availability data for ${schedule.target}:`, error)
            summary = "Error fetching availability data"
            count_slots = 0
          }
        } else if (category === 'PARTIAL_MATCHES') {
          try {
            const matchesData = await fetchMatchesData(
              schedule.organizations.tenant_id,
              startDate,
              endDate
            );
            
            // Get raw matches array
            const rawMatches = matchesData?.raw || matchesData || [];
            
            // Filter by summary variant if specified in template
            // Get variant from schedule or template (supports legacy and new formats)
            const rawVariant = schedule.message_templates?.summary_variant || schedule.summary_variant;
            
            // Normalize legacy variants like "competitive-open-3" to new enum-style keys
            let summaryVariant = rawVariant as string | null;
            if (summaryVariant) {
              const variantLower = summaryVariant.toLowerCase();
              if (variantLower === 'competitive-open' || variantLower === 'competitive_open') {
                summaryVariant = '1_3_PLAYERS';
              } else if (variantLower === 'competitive-open-1') {
                summaryVariant = '1_PLAYER';
              } else if (variantLower === 'competitive-open-2') {
                summaryVariant = '2_PLAYERS';
              } else if (variantLower === 'competitive-open-3') {
                summaryVariant = '3_PLAYERS';
              }
            }
            
            let filteredMatches = rawMatches;
            
            if (summaryVariant) {
              // Filter matches based on summary variant
              filteredMatches = rawMatches.filter((match: any) => {
                // Check if cancelled
                const cancelled = match.status?.toLowerCase() === 'cancelled';
                if (cancelled) return false;
                
                // Check join requests status is OPEN
                const joinStatus = match.join_requests_info?.status?.toLowerCase();
                if (joinStatus !== 'open') return false;
                
                // Check competition_mode is COMPETITIVE
                const compMode = match.competition_mode?.toLowerCase();
                if (compMode !== 'competitive') return false;
                
                // Check match_type is COMPETITIVE
                const matchType = match.match_type?.toLowerCase();
                if (matchType !== 'competitive') return false;
                
                // Count registered players
                const registeredPlayers = match.teams?.reduce((count: number, team: any) => {
                  const playersWithNames = team.players?.filter((player: any) => player.name) || [];
                  return count + playersWithNames.length;
                }, 0) || 0;
                
                // Filter by variant
                if (summaryVariant === '1_PLAYER') {
                  return registeredPlayers === 1;
                } else if (summaryVariant === '2_PLAYERS') {
                  return registeredPlayers === 2;
                } else if (summaryVariant === '3_PLAYERS') {
                  return registeredPlayers === 3;
                } else if (summaryVariant === '1_3_PLAYERS') {
                  return registeredPlayers >= 1 && registeredPlayers <= 3;
                }
                
                // If we don't recognise the variant, fall back to allowing the match
                return true;
              }).map((match: any) => {
                // Enrich matches with player data
                const registeredPlayers = match.teams?.reduce((count: number, team: any) => {
                  const playersWithNames = team.players?.filter((player: any) => player.name) || [];
                  return count + playersWithNames.length;
                }, 0) || 0;

                const maxPlayersPerTeam = match.max_players_per_team || 2;
                const numberOfTeams = 2;
                const maxPlayers = maxPlayersPerTeam * numberOfTeams;

                const allPlayers = match.teams?.flatMap((team: any) => 
                  team.players?.map((player: any) => ({
                    name: player.name || '??',
                    level_value: player.level_value || player.level || null
                  })) || []
                ) || [];

                return {
                  ...match,
                  registeredPlayers,
                  maxPlayers,
                  allPlayers,
                  spacesLeft: Math.max(0, maxPlayers - registeredPlayers)
                };
              });
            } else {
              // No variant set – fall back to generic competitive-open (1–3 players)
              filteredMatches = rawMatches.filter((match: any) => {
                const cancelled = match.status?.toLowerCase() === 'cancelled';
                if (cancelled) return false;

                const joinStatus = match.join_requests_info?.status?.toLowerCase();
                if (joinStatus !== 'open') return false;

                const compMode = match.competition_mode?.toLowerCase();
                if (compMode !== 'competitive') return false;

                const matchType = match.match_type?.toLowerCase();
                if (matchType !== 'competitive') return false;

                const registeredPlayers = match.teams?.reduce((count: number, team: any) => {
                  const playersWithNames = team.players?.filter((player: any) => player.name) || [];
                  return count + playersWithNames.length;
                }, 0) || 0;

                return registeredPlayers >= 1 && registeredPlayers <= 3;
              }).map((match: any) => {
                const registeredPlayers = match.teams?.reduce((count: number, team: any) => {
                  const playersWithNames = team.players?.filter((player: any) => player.name) || [];
                  return count + playersWithNames.length;
                }, 0) || 0;

                const maxPlayersPerTeam = match.max_players_per_team || 2;
                const numberOfTeams = 2;
                const maxPlayers = maxPlayersPerTeam * numberOfTeams;

                const allPlayers = match.teams?.flatMap((team: any) => 
                  team.players?.map((player: any) => ({
                    name: player.name || '??',
                    level_value: player.level_value || player.level || null
                  })) || []
                ) || [];

                return {
                  ...match,
                  registeredPlayers,
                  maxPlayers,
                  allPlayers,
                  spacesLeft: Math.max(0, maxPlayers - registeredPlayers)
                };
              });
            }
            
            // Generate summary using detailed format
            if (filteredMatches.length === 0) {
              summary = 'No partial matches available';
              count_slots = 0;
            } else {
              summary = generateCompetitiveOpenMatchesSummary(filteredMatches, schedule.tz, 60);
              count_slots = filteredMatches.length;
            }
          } catch (error) {
            console.error(`Error fetching matches data for ${schedule.target}:`, error);
            summary = "Error fetching matches data";
            count_slots = 0;
          }
        } else if (category === 'COMPETITIONS_ACADEMIES') {
          try {
            console.log(`Fetching COMPETITIONS_ACADEMIES data for schedule ${schedule.name}:`, {
              tenant_id: schedule.organizations.tenant_id,
              startDate,
              endDate,
              target: schedule.target,
              event_id: schedule.message_templates?.linked_event_id || schedule.event_id
            });
            
            const competitionsData = await fetchCompetitionsData(
              schedule.organizations.tenant_id,
              startDate,
              endDate
            );
            
            console.log(`Raw competitions data received:`, {
              tournaments_count: competitionsData.tournaments?.length || 0,
              lessons_count: competitionsData.lessons?.length || 0,
              classes_count: competitionsData.classes?.length || 0,
              tournaments_sample: competitionsData.tournaments?.slice(0, 2) || [],
              lessons_sample: competitionsData.lessons?.slice(0, 2) || [],
              classes_sample: competitionsData.classes?.slice(0, 2) || []
            });
            
            // Combine all events
            const allEvents = [
              ...(competitionsData.tournaments || []).map((e: any) => ({ ...e, type: 'tournament' })),
              ...(competitionsData.lessons || []).map((e: any) => ({ ...e, type: 'lesson' })),
              ...(competitionsData.classes || []).map((e: any) => ({ ...e, type: 'class' }))
            ];
            
            console.log(`Total events found: ${allEvents.length}`);
            
            // Filter out "Untitled" events
            let filteredEvents = allEvents.filter((event: any) => {
              const name = (event.tournament_name || event.name || event.title || '').trim().toLowerCase();
              return name !== 'untitled' && name !== '';
            });
            
            console.log(`Events after filtering Untitled: ${filteredEvents.length} (removed ${allEvents.length - filteredEvents.length})`);
            
            // Filter by event_id if specified
            const eventId = schedule.message_templates?.linked_event_id || schedule.event_id;
            let eligibleEvents: any[] = [];
            
            if (eventId) {
              // First try to find the event in the date-filtered results
              const beforeCount = filteredEvents.length;
              let matchedEvents = filteredEvents.filter((event: any) => {
                const eventIdMatch = event.tournament_id || event.id || event.tournamentId;
                return eventIdMatch === eventId || String(eventIdMatch) === String(eventId);
              });
              console.log(`Events after filtering by event_id (${eventId}): ${matchedEvents.length} (removed ${beforeCount - matchedEvents.length})`);
              
              // If not found in date range, fetch the specific event directly
              if (matchedEvents.length === 0) {
                console.log(`Linked event ${eventId} not found in date range, fetching directly...`);
                const specificEvent = await fetchSpecificEvent(schedule.organizations.tenant_id, eventId);
                
                if (specificEvent) {
                  // Check if the event is not Untitled
                  const name = (specificEvent.tournament_name || specificEvent.name || specificEvent.title || '').trim().toLowerCase();
                  if (name !== 'untitled' && name !== '') {
                    matchedEvents = [specificEvent];
                    console.log(`Using directly fetched event: ${specificEvent.tournament_name || specificEvent.name}`);
                  } else {
                    console.log(`Directly fetched event is Untitled, skipping`);
                  }
                } else {
                  console.log(`Linked event ${eventId} not found even with direct fetch`);
                }
              }
              
              filteredEvents = matchedEvents;
            }
            
            // Check if any events are full and skip them
            eligibleEvents = filteredEvents.filter((event: any) => {
              const capacity = getPlayerCapacity(event);
              return !capacity.full; // Skip full events
            });
            
            // Log skipped full events
            const skippedFull = filteredEvents.length - eligibleEvents.length;
            if (skippedFull > 0) {
              console.log(`Skipped ${skippedFull} full event(s) for schedule ${schedule.name}`);
            }
            
            console.log(`Final eligible events: ${eligibleEvents.length}`);
            if (eligibleEvents.length > 0) {
              console.log(`Sample eligible events:`, eligibleEvents.slice(0, 2).map((e: any) => ({
                name: e.tournament_name || e.name || e.title,
                type: e.type,
                registered: getPlayerCapacity(e).registered,
                max: getPlayerCapacity(e).max
              })));
            }
            
            if (eligibleEvents.length === 0) {
              let reason: string;
              if (eventId) {
                // Specific event was linked but not found or is full/untitled
                reason = skippedFull > 0 
                  ? `Linked event is full (event_id: ${eventId})`
                  : `Linked event not found or is Untitled (event_id: ${eventId})`;
              } else {
                reason = skippedFull > 0 
                  ? 'No competitions or academies available (all full)' 
                  : filteredEvents.length === 0 && allEvents.length > 0
                    ? 'No competitions or academies available (all Untitled)' 
                    : allEvents.length === 0
                      ? 'No competitions or academies available (no events found in date range)'
                      : 'No competitions or academies available';
              }
              console.log(`No eligible events - reason: ${reason}`);
              summary = reason;
              count_slots = 0;
            } else {
              // Generate detailed summaries for each event
              const eventSummaries = eligibleEvents.map((event: any) => generateTournamentSummary(event, 60));
              summary = eventSummaries.join('\n\n---\n\n');
              count_slots = eligibleEvents.length;
              console.log(`Generated summary with ${count_slots} events`);
            }
          } catch (error) {
            console.error(`Error fetching competitions data for ${schedule.target}:`, error);
            summary = "Error fetching competitions data";
            count_slots = 0;
          }
        }
        
        // Prepare tokens for template rendering
        let dateDisplay = date_display_short;
        if (!dateDisplay) {
          // Generate default date display if not available
          try {
            const fromDate = new Date(startDate);
            const toDate = new Date(endDate);
            dateDisplay = toShortDate(fromDate, toDate, schedule.tz);
          } catch (_error) {
            const now = DateTime.now().setZone(schedule.tz);
            dateDisplay = now.toFormat('MMM d');
          }
        }
        
        const tokens = {
          club_name: schedule.organizations.name || 'Club',
          date_display_short: dateDisplay,
          summary,
          count_slots: count_slots.toString(),
          sport: 'Padel'
        }
        
        // Check if we should skip sending (no data or empty summary)
        const shouldSkip = count_slots === 0 || summary === 'No data available' || summary === 'No partial matches available' || summary === 'No competitions or academies available' || summary.includes('all full') || summary.includes('no events found') || summary.includes('all Untitled');
        
        if (shouldSkip) {
          console.log(`Skipping send for schedule ${schedule.name} - reason: ${summary}`);
          
          // Create a more descriptive skip message
          let skipReason = 'No data available to send';
          if (summary.includes('all full')) {
            skipReason = 'All events are full';
          } else if (summary.includes('all Untitled')) {
            skipReason = 'All events are Untitled (filtered out)';
          } else if (summary.includes('no events found')) {
            skipReason = 'No events found in date range';
          } else if (summary.includes('No partial matches')) {
            skipReason = 'No partial matches found';
          } else if (summary.includes('No competitions')) {
            skipReason = 'No competitions or academies found';
          }
          
          // Check if this schedule was already SKIPPED - only log once when status changes
          const wasAlreadySkipped = schedule.last_status === 'SKIPPED';
          
          if (!wasAlreadySkipped) {
            // Only log SKIPPED once (when transitioning to SKIPPED state)
            await supabase.from('send_logs_v2').insert({
              org_id: schedule.org_id,
              schedule_id: schedule.id,
              category: category,
              status: 'SKIPPED',
              response_text: skipReason,
              message_excerpt: `Skipped - ${skipReason}`,
              whatsapp_group: schedule.whatsapp_group
            });
            console.log(`Logged SKIPPED status for schedule ${schedule.name}`);
          } else {
            console.log(`Schedule ${schedule.name} was already SKIPPED, not creating duplicate log`);
          }
          
          // Update schedule - DON'T pause, just update status so it tries again next day
          // next_run_at_utc was already updated at the start of processing
          await supabase
            .from('scheduled_sends_v2')
            .update({
              last_status: 'SKIPPED',
              last_error: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', schedule.id);
          
          console.log(`Schedule ${schedule.name} skipped - will try again at next scheduled time: ${nextRunUtc}`);
          
          results.push({
            schedule_id: schedule.id,
            name: schedule.name,
            status: 'SKIPPED',
            message_preview: `Skipped - ${skipReason}`,
            next_run: nextRunUtc,
            emulator_response: skipReason
          });
          
          continue; // Skip to next schedule
        }
        
        // Render message
        const message = renderTemplate(schedule.message_templates.content, tokens)
        const messagePreview = message.substring(0, 100)
        
        console.log(`Rendered message preview: ${messagePreview}`)
        
        // Send using send-whatsapp-message function with retry logic
        let success = false
        let emulatorBody = 'No response'
        let lastError = null
        
        // Log the data being sent for debugging
        console.log(`Sending data for ${schedule.name}:`, {
          tenant_id: schedule.organizations.tenant_id,
          category: category,
          whatsapp_group: schedule.whatsapp_group,
          message_length: message.length,
          template_id: schedule.template_id
        })
        
        // Retry up to 3 times
        for (let attempt = 1; attempt <= 3; attempt++) {
          console.log(`Send attempt ${attempt}/3 for schedule ${schedule.name}`)
          
          const { data: sendResult, error: sendError } = await supabase.functions.invoke('send-whatsapp-message', {
            body: {
              tenant_id: schedule.organizations.tenant_id,
              category: category,
              whatsapp_group: schedule.whatsapp_group,
              message: message,
              template_id: schedule.template_id
            }
          })
          
          success = !sendError && sendResult?.status === 'OK'
          emulatorBody = sendError ? sendError.message : JSON.stringify(sendResult?.result || 'No response')
          lastError = sendError
          
          console.log(`Send attempt ${attempt}/3 result: ${success ? 'SUCCESS' : 'FAILED'} - ${emulatorBody}`)
          
          if (success) {
            console.log(`Send succeeded on attempt ${attempt}`)
            break
          }
          
          if (attempt < 3) {
            console.log(`Send failed on attempt ${attempt}, retrying...`)
            // Wait 2 seconds before retry
            await new Promise(resolve => setTimeout(resolve, 2000))
          } else {
            console.log(`Send failed after ${attempt} attempts, giving up`)
          }
        }
        
        // Log the send
        console.log(`Inserting log with org_id: ${schedule.org_id}, schedule_id: ${schedule.id}, category: ${category}, status: ${success ? 'OK' : 'ERROR'}`)
        const { data: logResult, error: logError } = await supabase.from('send_logs_v2').insert({
          org_id: schedule.org_id,
          schedule_id: schedule.id,
          category: category,
          status: success ? 'OK' : 'ERROR',
          response_text: emulatorBody,
          message_excerpt: messagePreview, // Keep excerpt for list view
          whatsapp_group: schedule.whatsapp_group
        }).select()
        
        if (logError) {
          console.error('Failed to insert log:', logError)
        } else {
          console.log('Successfully inserted log:', logResult)
        }
        
        // Update schedule with last_status and last_error only (status and next_run_at_utc are handled elsewhere)
        const { error: updateError } = await supabase
          .from('scheduled_sends_v2')
          .update({
            last_status: success ? 'OK' : 'ERROR',
            last_error: success ? null : emulatorBody,
            updated_at: new Date().toISOString()
          })
          .eq('id', schedule.id)
        
        if (updateError) {
          console.error(`Failed to update schedule ${schedule.id}:`, updateError)
        } else {
          console.log(`Updated schedule ${schedule.id} with last_status: ${success ? 'OK' : 'ERROR'}`)
        }
        
        results.push({
          schedule_id: schedule.id,
          name: schedule.name,
          status: success ? 'OK' : 'ERROR',
          message_preview: messagePreview,
          next_run: nextRunUtc,
          emulator_response: emulatorBody
        })
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Error processing schedule ${schedule.id}:`, error)
        
        // Log the error
        await supabase.from('send_logs_v2').insert({
          org_id: schedule.org_id,
          schedule_id: schedule.id,
          category: 'AVAILABILITY',
          status: 'ERROR',
          response_text: errorMessage,
          message_excerpt: 'Failed to process',
          whatsapp_group: schedule.whatsapp_group
        })
        
        // Update schedule with error
        await supabase
          .from('scheduled_sends_v2')
          .update({
            last_run_at_utc: new Date().toISOString(),
            last_status: 'ERROR',
            last_error: errorMessage,
            updated_at: new Date().toISOString()
          })
          .eq('id', schedule.id)
        
        results.push({
          schedule_id: schedule.id,
          name: schedule.name,
          status: 'ERROR',
          error: errorMessage
        })
      }
    }
    
    console.log(`Processed ${results.length} schedules`)
    
    return new Response(JSON.stringify({
      processed: results.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in run-scheduled-sends-v2:', error)
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

