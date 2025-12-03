import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper functions for time formatting (from run-scheduled-sends-v2)
function hhmmToMinutes(timeStr: string): number {
  const parts = timeStr.split(':').map(n => parseInt(n));
  return parts[0] * 60 + (parts[1] || 0);
}

function minutesToHHMM(minutes: number): string {
  const totalMins = minutes % 1440;
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function addMinutesLocal(timeStr: string, offsetMins: number): string {
  const baseMins = hhmmToMinutes(timeStr);
  const adjustedMins = (baseMins + offsetMins + 1440) % 1440;
  return minutesToHHMM(adjustedMins);
}

function formatCompactAmPm(minutes: number): string {
  const totalMins = ((minutes % 1440) + 1440) % 1440;
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

const DAY_PART_BOUNDARIES = {
  morning: { start: 360, end: 720 },
  afternoon: { start: 720, end: 1020 },
  evening: { start: 1020, end: 1380 }
};

function extractRawSlots(data: any[]) {
  if (!Array.isArray(data) || data.length === 0) return [];
  
  const slots = [];
  for (const item of data) {
    if (item.slots && Array.isArray(item.slots)) {
      for (const slot of item.slots) {
        slots.push({
          ...slot,
          start_date: item.start_date ?? slot.start_date,
          resource_id: item.resource_id || item.id,
          resource_name: item.name || item.resource_name
        });
      }
    } else {
      slots.push(item);
    }
  }
  return slots;
}

function parseSlotTime(slot: any, playtomicOffsetMinutes = 60) {
  let startTime = null;
  if (slot.start_date && slot.start_time) {
    startTime = slot.start_time;
  } else if (slot.start_time) {
    startTime = slot.start_time;
  } else if (slot.startTime) {
    startTime = slot.startTime;
  }
  
  if (!startTime) return null;
  
  const baseTime = startTime.split(':').slice(0, 2).join(':');
  const duration = slot.duration || slot.duration_minutes || slot.length || 90;
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

    ranges[dayPart].count++;
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

function formatTournamentDateTime(tournament: any, playtomicOffsetMinutes = 60) {
  try {
    const startDate = new Date(tournament.start_date);
    const endDate = new Date(tournament.end_date);
    const adjustedStart = new Date(startDate.getTime() + playtomicOffsetMinutes * 60000);
    const adjustedEnd = new Date(endDate.getTime() + playtomicOffsetMinutes * 60000);
    const dateStr = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(adjustedStart);
    const startTimeStr = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(adjustedStart);
    const endTimeStr = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(adjustedEnd);
    const startTime = formatCompactAmPm(hhmmToMinutes(startTimeStr));
    const endTime = formatCompactAmPm(hhmmToMinutes(endTimeStr));
    return { date: dateStr, time: `${startTime} – ${endTime}` };
  } catch (_error) {
    return { date: 'Invalid date', time: 'Invalid time' };
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

function generateTournamentSummary(tournament: any, playtomicOffsetMinutes = 60) {
  if (!tournament) return '';
  const name = (tournament.tournament_name || tournament.name || tournament.title || 'Untitled').trim();
  const dateTime = formatTournamentDateTime(tournament, playtomicOffsetMinutes);
  const capacity = getPlayerCapacity(tournament);
  const tournamentId = tournament.tournament_id || tournament.id || tournament.tournamentId;
  const joinUrl = tournamentId ? `https://app.playtomic.io/lessons/${tournamentId}` : null;
  const isCancelled = tournament.is_cancelled === true || tournament.tournament_status === 'CANCELLED';
  const spacesText = isCancelled ? 'Spaces left = 0 (Cancelled)' : `Spaces left = ${capacity.spacesLeft}`;
  
  let summary = `${name}\nDate: ${dateTime.date}\nTime: ${dateTime.time}\n${spacesText}`;
  if (joinUrl) {
    summary += `\nJoin URL: ${joinUrl}`;
  }
  return summary;
}

function formatMatchWhatsAppBlock(match: any, timezone = 'Europe/London', playtomicOffset = 60) {
  let formattedDate = 'Date: Unknown';
  let formattedTime = 'Time: Unknown';
  
  if (match.start_date) {
    try {
      const startDate = new Date(match.start_date);
      const offsetDate = new Date(startDate.getTime() + playtomicOffset * 60000);
      formattedDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(offsetDate);
      const duration = match.duration || 60;
      const endDate = new Date(offsetDate.getTime() + duration * 60000);
      const fmt12 = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const startTime12 = fmt12.format(offsetDate).toLowerCase().replace(/\s/g, '');
      const endTime12 = fmt12.format(endDate).toLowerCase().replace(/\s/g, '');
      formattedTime = `${startTime12} – ${endTime12}`;
    } catch (_error) {
      console.error('Error formatting match date');
    }
  }

  const location_name = match.location || match.tenant?.tenant_name || 'Unknown Location';
  const city = match.tenant?.address?.city || match.location_info?.address?.city || 'Unknown City';
  
  let levelRange = 'Level N/A';
  if (match.min_level != null && match.max_level != null) {
    levelRange = `Level ${match.min_level.toFixed(2)} - ${match.max_level.toFixed(2)}`;
  } else if (match.allPlayers && match.allPlayers.length > 0) {
    const levels = match.allPlayers.map((player: any) => player.level_value).filter((level: any) => typeof level === 'number');
    if (levels.length > 0) {
      levelRange = `Level ${Math.min(...levels).toFixed(1)} - ${Math.max(...levels).toFixed(1)}`;
    }
  }

  let playerLines = '';
  if (match.allPlayers) {
    match.allPlayers.forEach((player: any) => {
      const level = player.level_value ? `(${player.level_value.toFixed(2)})` : '(N/A)';
      playerLines += `✅ ${player.name} ${level}\n`;
    });
  }
  
  const emptySlots = match.spacesLeft || 0;
  for (let i = 0; i < emptySlots; i++) {
    playerLines += '⚪ ??\n';
  }

  const matchUrl = `https://app.playtomic.io/matches/${match.match_id}`;
  return `*MATCH IN ${location_name}*\n📅 ${formattedDate}, ${formattedTime} (${match.duration || 60}min)\n📍 ${city}\n📊 ${levelRange}\n${playerLines.trim()}\n${matchUrl}`;
}

function generateCompetitiveOpenMatchesSummary(matches: any[], timezone = 'Europe/London', playtomicOffset = 60) {
  const competitiveMatches = matches.filter(match => {
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
  }).map(match => {
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

async function fetchCompetitionsData(tenantId: string, startDate: string, endDate: string) {
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
  ]);
  
  const tournaments = tournamentsResp.data?.raw || tournamentsResp.data || [];
  const lessons = lessonsResp.data?.raw || lessonsResp.data || [];
  const classes = classesResp.data?.raw || classesResp.data || [];
  
  return { tournaments, lessons, classes };
}

async function fetchMatchesData(tenantId: string, startDate: string, endDate: string, variant: string) {
  const { data } = await supabase.functions.invoke('playtomic-fetch', {
    body: { 
      endpoint: 'matches', 
      tenant_id: tenantId, 
      sport_id: 'PADEL', 
      start_min: startDate, 
      start_max: endDate, 
      has_players: 'TRUE' 
    }
  });
  return data?.raw || data || [];
}

function generateAvailabilitySummary(availabilityData: any) {
  let actualData = availabilityData;
  if (availabilityData?.raw) {
    actualData = availabilityData.raw;
  }
  
  if (!Array.isArray(actualData) || actualData.length === 0) {
    return { summary: "No courts available", count_slots: 0 };
  }

  const rawSlots = extractRawSlots(actualData);
  const validSlots = rawSlots
    .map(slot => ({ ...slot, timeData: parseSlotTime(slot, 60) }))
    .filter(slot => slot.timeData !== null);
  
  if (validSlots.length === 0) {
    return { summary: "No courts available", count_slots: 0 };
  }
  
  const summary = generateDirectDayPartsTimeRangesSummary(validSlots);
  return { summary, count_slots: validSlots.length };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for specific scheduleId to run immediately (for "Run Now" feature)
    let specificScheduleId: string | null = null;
    try {
      const body = await req.json();
      specificScheduleId = body?.scheduleId || null;
    } catch {
      // No body or invalid JSON - that's fine, run all due schedules
    }

    console.log('Running social post schedules...', specificScheduleId ? `(specific: ${specificScheduleId})` : '(all due)');

    // Build query - fetch schedules with templates only (no direct FK to organizations)
    let query = supabase
      .from('social_post_schedules')
      .select(`
        *,
        social_templates (
          id,
          name,
          bg_url,
          canvas_w,
          canvas_h,
          layers,
          event_id,
          summary_variant,
          source_category
        )
      `);

    if (specificScheduleId) {
      // Run specific schedule immediately (bypass time check)
      query = query.eq('id', specificScheduleId);
    } else {
      // Get all due schedules
      query = query
        .eq('status', 'ACTIVE')
        .lte('next_run_at_utc', new Date().toISOString())
        .limit(25);
    }

    const { data: schedules, error: schedulesError } = await query;

    if (schedulesError) {
      console.error('Error fetching schedules:', schedulesError);
      throw schedulesError;
    }

    console.log(`Found ${schedules?.length || 0} schedules to process`);

    const results: any[] = [];

    if (schedules && schedules.length > 0) {
      // Process each schedule
      for (const schedule of schedules) {
        try {
          console.log(`Processing schedule ${schedule.id}`);

          const template = schedule.social_templates;
          
          if (!template) {
            console.error(`Template not found for schedule ${schedule.id}`);
            continue;
          }

          // Fetch organization data separately (no FK relationship)
          const { data: organization, error: orgError } = await supabase
            .from('organizations')
            .select('tenant_id, name, club_name')
            .eq('id', schedule.org_id)
            .maybeSingle();
          
          if (orgError || !organization?.tenant_id) {
            console.error(`Organization not found for schedule ${schedule.id}:`, orgError);
            continue;
          }

          // Use locked event_id and summary_variant from template if available, otherwise use schedule values
          // Also check compiled_payload as fallback for existing schedules
          const compiledPayload = schedule.compiled_payload as Record<string, any> || {};
          const lockedEventId = template.event_id || schedule.event_id || compiledPayload.event_id || null;
          const lockedVariant = template.summary_variant || compiledPayload.summary_variant || 'basic';
          const sourceCategory = template.source_category || schedule.category || 'COURT_AVAILABILITY';
          const source = (schedule.category || sourceCategory).toUpperCase();
          const tz = schedule.tz || 'Europe/London';
          
          console.log(`Schedule ${schedule.id}:`, {
            category: schedule.category,
            source,
            sourceCategory,
            lockedEventId,
            lockedVariant,
            tenantId: organization.tenant_id,
            tz
          });

          // Calculate date range
          const today = new Date();
          const startIso = today.toISOString();
          // For locked events (COMPETITIONS), extend range to 30 days to ensure we find the specific event
          // For regular queries, use 1 day range
          const hasLockedEvent = lockedEventId && (source === 'COMPETITIONS' || source === 'COMPETITIONS_ACADEMIES' || sourceCategory === 'COMPETITIONS_ACADEMIES');
          const daysToSearch = hasLockedEvent ? 30 : 1;
          const endIso = new Date(today.getTime() + daysToSearch * 24 * 60 * 60 * 1000).toISOString();
          
          console.log(`Date range: ${startIso} to ${endIso} (${daysToSearch} days, lockedEventId: ${lockedEventId})`);
          
          // Use custom date range if available (for RANGE_DAILY)
          const startDate = schedule.range_start_utc || startIso;
          const endDate = schedule.range_end_utc || endIso;

          let context: any = {
            club_name: organization.club_name || organization.name || 'Club',
            date_display_short: new Date().toISOString().slice(0, 10),
            sport: 'Padel',
            count_slots: 0,
            summary: ''
          };

          // Fetch data and generate summary based on source
          if (source === 'COURT_AVAILABILITY' || source === 'AVAILABILITY' || sourceCategory === 'COURT_AVAILABILITY' || sourceCategory === 'AVAILABILITY') {
            const { data: availData } = await supabase.functions.invoke('playtomic-fetch', {
              body: { endpoint: 'availability', tenant_id: organization.tenant_id, sport_id: 'PADEL', start_min: startDate, start_max: endDate }
            });
            const summaryResult = generateAvailabilitySummary(availData);
            context.summary = summaryResult.summary;
            context.count_slots = summaryResult.count_slots;
          } else if (source === 'PARTIAL_MATCHES' || sourceCategory === 'PARTIAL_MATCHES') {
            const matches = await fetchMatchesData(organization.tenant_id, startDate, endDate, lockedVariant);
            
            // Normalize legacy variants to new enum-style keys (same as run-scheduled-sends-v2)
            let summaryVariant = lockedVariant;
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
            
            // Filter by variant with proper competitive match filtering
            let filteredMatches = matches.filter((match: any) => {
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
              
              // If no variant specified or unrecognized, default to 1-3 players
              return registeredPlayers >= 1 && registeredPlayers <= 3;
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
            
            if (filteredMatches.length === 0) {
              context.summary = 'No partial matches available';
              context.count_slots = 0;
            } else {
              context.summary = generateCompetitiveOpenMatchesSummary(filteredMatches, tz, 60);
              context.count_slots = filteredMatches.length;
            }
          } else if (source === 'COMPETITIONS' || source === 'COMPETITIONS_ACADEMIES' || sourceCategory === 'COMPETITIONS_ACADEMIES') {
            const competitionsData = await fetchCompetitionsData(organization.tenant_id, startDate, endDate);
            
            // Combine all events
            const allEvents = [
              ...(competitionsData.tournaments || []).map((e: any) => ({ ...e, type: 'tournament' })),
              ...(competitionsData.lessons || []).map((e: any) => ({ ...e, type: 'lesson' })),
              ...(competitionsData.classes || []).map((e: any) => ({ ...e, type: 'class' }))
            ];
            
            // Filter out "Untitled" events
            let filteredEvents = allEvents.filter((event: any) => {
              const name = (event.tournament_name || event.name || event.title || '').trim().toLowerCase();
              return name !== 'untitled' && name !== '';
            });
            
            // Filter by locked event_id if specified
            if (lockedEventId) {
              filteredEvents = filteredEvents.filter((event: any) => {
                const eventIdMatch = event.tournament_id || event.id || event.tournamentId;
                return eventIdMatch === lockedEventId || String(eventIdMatch) === String(lockedEventId);
              });
              console.log(`Filtered to event_id ${lockedEventId}: ${filteredEvents.length} events (before dedup)`);
              
              // Deduplicate events by ID - same event can appear in tournaments, lessons, AND classes
              const seenIds = new Set<string>();
              filteredEvents = filteredEvents.filter((event: any) => {
                const eventId = String(event.tournament_id || event.id || event.tournamentId);
                if (seenIds.has(eventId)) {
                  return false;
                }
                seenIds.add(eventId);
                return true;
              });
              console.log(`After dedup: ${filteredEvents.length} unique events`);
            }
            
            // Filter out full events
            const eligibleEvents = filteredEvents.filter((event: any) => {
              const capacity = getPlayerCapacity(event);
              return !capacity.full;
            });
            
            if (eligibleEvents.length === 0) {
              context.summary = 'No competitions or academies available';
              context.count_slots = 0;
            } else {
              // Generate detailed summaries for each event
              const eventSummaries = eligibleEvents.map((event: any) => generateTournamentSummary(event, 60));
              context.summary = eventSummaries.join('\n\n---\n\n');
              context.count_slots = eligibleEvents.length;
            }
          }

          // Helper: transform template layers to render format
          // Template layers store style in nested object and use 'binding' instead of 'content'
          const compileLayers = (layers: any[], replacements: Record<string,string>, contextData: any) => {
            return (layers || []).map((layer: any) => {
              const style = layer.style || {};
              
              // Flatten style properties to layer level
              const flattenedLayer = {
                ...layer,
                // Position: style uses left/top, render expects x/y
                x: layer.x ?? style.left ?? style.x ?? 50,
                y: layer.y ?? style.top ?? style.y ?? 50,
                width: layer.width ?? style.width ?? 200,
                height: layer.height ?? style.height ?? 100,
                // Text styling
                fontSize: layer.fontSize ?? style.fontSize ?? 32,
                color: layer.color ?? style.fill ?? style.color ?? '#000000',
                fontFamily: layer.fontFamily ?? style.fontFamily ?? 'Roboto',
                fontWeight: layer.fontWeight ?? style.fontWeight ?? 'normal',
                fontStyle: layer.fontStyle ?? style.fontStyle ?? 'normal',
                textAlign: layer.textAlign ?? style.textAlign ?? 'left',
                lineHeight: layer.lineHeight ?? style.lineHeight ?? 1.2,
                visible: layer.visible !== false
              };
              
              if (layer.type === 'text') {
                // Determine text content from 'content' or 'binding'
                let textContent = layer.content || '';
                
                // If layer uses binding, get content from context
                if (!textContent && layer.binding) {
                  if (layer.binding === 'message_content' || layer.binding === 'summary') {
                    textContent = contextData.summary || '';
                  } else if (layer.binding === 'club_name') {
                    textContent = contextData.club_name || '';
                  } else if (layer.binding === 'date_display_short') {
                    textContent = contextData.date_display_short || '';
                  } else if (layer.binding === 'count_slots') {
                    textContent = String(contextData.count_slots || 0);
                  } else if (layer.binding === 'sport') {
                    textContent = 'Padel';
                  }
                }
                
                // If still no content, check for token placeholders like {{summary}}
                if (!textContent && layer.content) {
                  textContent = layer.content;
                }
                
                // Replace tokens in content
                let compiled = textContent;
                for (const [k, v] of Object.entries(replacements)) {
                  const token = `{{${k}}}`;
                  compiled = compiled.replace(new RegExp(token.replace(/[{}]/g, '\\$&'), 'g'), v);
                }
                
                return { ...flattenedLayer, content: compiled };
              }
              
              return flattenedLayer;
            });
          };

          const replacements = {
            summary: context.summary || '',
            club_name: context.club_name || 'Club',
            date_display_short: context.date_display_short || new Date().toISOString().slice(0, 10),
            sport: 'Padel',
            count_slots: String(context.count_slots || 0),
            message_content: context.summary || '' // Add as fallback for message_content token
          };

          const compiledLayers = compileLayers(template.layers || [], replacements, context);

          // Call render function
          const renderResponse = await fetch(`${supabaseUrl}/functions/v1/render-social-post`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              org_id: schedule.org_id,
              template_id: schedule.template_id,
              source,
              summary_variant: lockedVariant,
              message_content_raw: context.summary || '',
              context,
              layers: compiledLayers
            })
          });

          const renderResult = await renderResponse.json();

          if (renderResult.success) {
            console.log(`Successfully rendered for schedule ${schedule.id}`);
            
            // Update schedule based on frequency
            let nextRunAt: string | null = null;
            let status = schedule.status;

            if (schedule.frequency === 'DAILY') {
              const nextRun = new Date(schedule.next_run_at_utc || schedule.run_at_utc);
              nextRun.setDate(nextRun.getDate() + 1);
              nextRunAt = nextRun.toISOString();
            } else if (schedule.frequency === 'RANGE_DAILY') {
              const nextRun = new Date(schedule.next_run_at_utc || schedule.range_start_utc);
              nextRun.setDate(nextRun.getDate() + 1);
              if (schedule.range_end_utc && nextRun > new Date(schedule.range_end_utc)) {
                status = 'COMPLETED';
                nextRunAt = null;
              } else {
                nextRunAt = nextRun.toISOString();
              }
            } else {
              status = 'COMPLETED';
            }

            // Update schedule
            const { error: updateError } = await supabase
              .from('social_post_schedules')
              .update({
                last_run_at_utc: new Date().toISOString(),
                next_run_at_utc: nextRunAt,
                status,
                updated_at: new Date().toISOString()
              })
              .eq('id', schedule.id);

            if (updateError) {
              console.error(`Error updating schedule ${schedule.id}:`, updateError);
            }

            results.push({
              schedule_id: schedule.id,
              status: 'SUCCESS',
              render_id: renderResult.render_id,
              next_run_at: nextRunAt
            });
          } else {
            console.error(`Render failed for schedule ${schedule.id}:`, renderResult.error);
            results.push({
              schedule_id: schedule.id,
              status: 'FAILED',
              error: renderResult.error
            });
          }
        } catch (error) {
          console.error(`Error processing schedule ${schedule.id}:`, error);
          results.push({
            schedule_id: schedule.id,
            status: 'FAILED',
            error: error.message
          });
        }
      }
    }

    console.log(`Processed ${results.length} schedules`);

    return new Response(JSON.stringify({
      success: true,
      processed_count: results.length,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in run-social-post-schedules function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
