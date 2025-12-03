import { format, addMinutes } from 'date-fns';

// Helper functions for wall-time math and formatting (from admin)
export const hhmmToMinutes = (timeStr: string): number => {
  const parts = timeStr.split(':').map(n => parseInt(n));
  return parts[0] * 60 + (parts[1] || 0);
};

export const minutesToHHMM = (minutes: number): string => {
  const totalMins = minutes % 1440; // Wrap to 0-1439
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

export const addMinutesLocal = (timeStr: string, offsetMins: number): string => {
  const baseMins = hhmmToMinutes(timeStr);
  const adjustedMins = (baseMins + offsetMins + 1440) % 1440; // Handle negatives
  return minutesToHHMM(adjustedMins);
};

export const formatCompactAmPm = (minutes: number): string => {
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
};

// Non-overlapping day-part boundaries (in minutes) - from admin
export const DAY_PART_BOUNDARIES = {
  morning: { start: 360, end: 720 }, // 06:00 - 12:00
  afternoon: { start: 720, end: 1020 }, // 12:00 - 17:00  
  evening: { start: 1020, end: 1380 } // 17:00 - 23:00
};

// Extract slots directly from raw JSON (from admin)
export const extractRawSlots = (data: any[]) => {
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
};

// Parse time from raw slot data with Playtomic offset (from admin)
export const parseSlotTime = (slot: any, playtomicOffsetMinutes = 60) => {
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
};

// Generate enhanced summary using admin logic - day-parts time ranges
export const generateDirectDayPartsTimeRangesSummary = (slots: any[]) => {
  const ranges = {
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
};

// Generate summary using admin logic for court availability
export const generateAvailabilitySummary = (data: any[], playtomicOffsetMinutes = 60) => {
  if (!Array.isArray(data) || data.length === 0) {
    return '0 slots available for this day';
  }

  // Extract raw slots and parse times directly
  const rawSlots = extractRawSlots(data);
  const validSlots = rawSlots
    .map(slot => ({ ...slot, timeData: parseSlotTime(slot, playtomicOffsetMinutes) }))
    .filter(slot => slot.timeData !== null);
  
  if (validSlots.length === 0) {
    return '0 slots available for this day';
  }
  
  return generateDirectDayPartsTimeRangesSummary(validSlots);
};

// Helper function to check if a match is cancelled
export const isCancelled = (match: any) => {
  return match.is_cancelled === true || 
         match.status === 'CANCELED' || 
         match.status === 'CANCELLED' ||
         match.game_status === 'CANCELED' ||
         match.game_status === 'CANCELLED';
};

// Format match as WhatsApp block (from admin)
export const formatMatchWhatsAppBlock = (match: any, timezone = 'Europe/London', playtomicOffset = 60) => {
  // Parse and format date/time
  let formattedDate = 'Date: Unknown';
  let formattedTime = 'Time: Unknown';
  
  if (match.start_date) {
    try {
      const startDate = new Date(match.start_date);
      
      // Apply Playtomic offset
      const offsetDate = new Date(startDate.getTime() + playtomicOffset * 60000);
      
      // Format date 
      formattedDate = format(offsetDate, 'MMM d');
      
      // Handle duration and end time
      const duration = match.duration || 60; // Default 60 minutes
      const endDate = addMinutes(offsetDate, duration);
      
      // Convert to 12-hour format without dots
      const startTime12 = format(offsetDate, 'h:mma').toLowerCase().replace('.', '');
      const endTime12 = format(endDate, 'h:mma').toLowerCase().replace('.', '');
      formattedTime = `${startTime12} – ${endTime12}`;
    } catch (error) {
      console.error('Error formatting match date:', error);
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
};

// Generate matches summary for "competitive-open" variant (admin logic)
export const generateCompetitiveOpenMatchesSummary = (matches: any[], timezone = 'Europe/London', playtomicOffset = 60) => {
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
};

// Format tournament date and time with offset (from admin)
export const formatTournamentDateTime = (tournament: any, playtomicOffsetMinutes = 60) => {
  try {
    const startDate = new Date(tournament.start_date);
    const endDate = new Date(tournament.end_date);
    
    // Apply Playtomic offset
    const adjustedStart = new Date(startDate.getTime() + playtomicOffsetMinutes * 60000);
    const adjustedEnd = new Date(endDate.getTime() + playtomicOffsetMinutes * 60000);
    
    const dateStr = format(adjustedStart, 'MMM d');
    const startTimeStr = format(adjustedStart, 'HH:mm');
    const endTimeStr = format(adjustedEnd, 'HH:mm');
    const startTime = formatCompactAmPm(hhmmToMinutes(startTimeStr));
    const endTime = formatCompactAmPm(hhmmToMinutes(endTimeStr));
    
    return {
      date: dateStr,
      time: `${startTime} – ${endTime}`
    };
  } catch (error) {
    return {
      date: 'Invalid date',
      time: 'Invalid time'
    };
  }
};

// Get player capacity info for tournaments, lessons, and classes
export const getPlayerCapacity = (event: any) => {
  let registered = 0;
  let max = 0;
  
  // Handle different event types
  if (event.type === 'tournament' || event.tournament_name) {
    // Tournament data structure
    registered = event.registered_players?.length || 0;
    max = event.max_players || 0;
  } else if (event.type === 'lesson' || event.lesson_name || event.name) {
    // Lesson/class data structure - check various possible fields
    registered = event.registered_students?.length || 
                event.participants?.length || 
                event.bookings?.length || 0;
    max = event.max_participants || 
          event.max_students || 
          event.capacity || 
          event.max_players || 0;
  } else if (event.type === 'class') {
    // Class data structure
    registered = event.registered_students?.length || 
                event.participants?.length || 
                event.bookings?.length || 0;
    max = event.max_participants || 
          event.max_students || 
          event.capacity || 0;
  }
  
  const spacesLeft = Math.max(0, max - registered);
  
  return {
    registered,
    max,
    spacesLeft,
    display: max > 0 ? `${registered}/${max}` : '',
    full: max > 0 && registered >= max
  };
};

// Helper function to extract tournament ID (from admin)
export const getTournamentId = (tournament: any) => {
  return tournament.tournament_id || tournament.id || tournament.tournamentId || null;
};

// Helper function to generate tournament join URL (from admin)
export const getTournamentJoinUrl = (tournament: any) => {
  const tournamentId = getTournamentId(tournament);
  return tournamentId ? `https://app.playtomic.io/lessons/${tournamentId}` : null;
};

// Generate enhanced tournament summary (from admin)
export const generateTournamentSummary = (tournament: any, playtomicOffsetMinutes = 60) => {
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
};