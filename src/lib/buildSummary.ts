import { 
  generateAvailabilitySummary, 
  generateCompetitiveOpenMatchesSummary,
  generateTournamentSummary
} from '@/utils/playtomicAdminUtils';

export interface BuildSummaryContext {
  category: 'COURT_AVAILABILITY' | 'PARTIAL_MATCHES' | 'COMPETITIONS';
  data: any[];
  variant: string;
  target: 'TODAY' | 'TOMORROW';
  tz: string;
  playtomicOffset?: number;
  clubName?: string;
  dateDisplayShort?: string;
  sport?: string;
  countSlots?: number;
  eventId?: string | null; // Optional event ID to filter competitions by specific event
}

/**
 * Centralized summary generation used by:
 * - Admin/WhatsApp Message Template live preview
 * - Court Availability Summary Preview  
 * - Social Post Builder compile step
 * - Partial Matches (with selected variant)
 */
export function buildSummary(context: BuildSummaryContext): string {
  const { category, data, variant, tz, playtomicOffset = 60, eventId } = context;

  if (!Array.isArray(data) || data.length === 0) {
    return getDefaultEmptyMessage(category);
  }

  switch (category) {
    case 'COURT_AVAILABILITY':
      return generateAvailabilitySummary(data, playtomicOffset);
    
    case 'PARTIAL_MATCHES':
      return generatePartialMatchesSummary(data, variant, tz, playtomicOffset);
    
    case 'COMPETITIONS':
      return generateCompetitionsSummary(data, playtomicOffset, eventId);
    
    default:
      return 'No summary available';
  }
}

function getDefaultEmptyMessage(category: string): string {
  switch (category) {
    case 'COURT_AVAILABILITY':
      return '0 slots available for this day';
    case 'PARTIAL_MATCHES':
      return 'No matches found for this criteria.';
    case 'COMPETITIONS':
      return 'No tournaments or competitions available.';
    default:
      return 'No data available';
  }
}

function generatePartialMatchesSummary(data: any[], variant: string, tz: string, playtomicOffset: number): string {
  // Filter competitive open matches first
  const competitiveMatches = filterCompetitiveOpenMatches(data);
  
  // Apply player count filter based on variant
  let filteredMatches = competitiveMatches;
  let headerText = `— COMPETITIVE — OPEN (1–3 PLAYERS) (${competitiveMatches.length}) —`;
  
  const variantLower = variant.toLowerCase();
  if (variantLower === 'competitive-open-1' || variantLower === 'competitive_open_1') {
    filteredMatches = competitiveMatches.filter(m => m.registeredPlayers === 1);
    headerText = `— COMPETITIVE — OPEN (1 PLAYER) (${filteredMatches.length}) —`;
  } else if (variantLower === 'competitive-open-2' || variantLower === 'competitive_open_2') {
    filteredMatches = competitiveMatches.filter(m => m.registeredPlayers === 2);
    headerText = `— COMPETITIVE — OPEN (2 PLAYERS) (${filteredMatches.length}) —`;
  } else if (variantLower === 'competitive-open-3' || variantLower === 'competitive_open_3') {
    filteredMatches = competitiveMatches.filter(m => m.registeredPlayers === 3);
    headerText = `— COMPETITIVE — OPEN (3 PLAYERS) (${filteredMatches.length}) —`;
  }
  
  if (filteredMatches.length === 0) {
    return 'No matches found for this criteria.';
  }
  
  // Generate summary using the filtered matches
  return generateCompetitiveOpenMatchesSummary(filteredMatches, tz, playtomicOffset);
}

// Helper to filter and enrich competitive open matches with player count
function filterCompetitiveOpenMatches(matches: any[]) {
  return matches.filter(match => {
    const cancelled = match.status?.toLowerCase() === 'cancelled';
    if (cancelled) return false;
    
    const joinStatus = match.join_requests_info?.status?.toLowerCase();
    if (joinStatus !== 'open') return false;
    
    const compMode = match.competition_mode?.toLowerCase();
    if (compMode !== 'competitive') return false;
    
    const matchType = match.match_type?.toLowerCase();
    if (matchType !== 'competitive') return false;
    
    // Count registered players
    const registeredPlayers = match.teams?.reduce((count: number, team: any) => {
      const playersWithNames = team.players?.filter((p: any) => p.name) || [];
      return count + playersWithNames.length;
    }, 0) || 0;
    
    return registeredPlayers >= 1 && registeredPlayers <= 3;
  }).map(match => {
    // Enrich with player count
    const registeredPlayers = match.teams?.reduce((count: number, team: any) => {
      const playersWithNames = team.players?.filter((p: any) => p.name) || [];
      return count + playersWithNames.length;
    }, 0) || 0;
    
    return { ...match, registeredPlayers };
  });
}

function generateCompetitionsSummary(data: any[], playtomicOffset: number, eventId?: string | null): string {
  if (data.length === 0) {
    return 'No tournaments or competitions available.';
  }

  // Filter by eventId if provided
  let filteredData = data;
  if (eventId) {
    filteredData = data.filter((event: any) => {
      const eventIdMatch = event.tournament_id || event.id || event.tournamentId;
      return eventIdMatch === eventId || String(eventIdMatch) === String(eventId);
    });
    
    if (filteredData.length === 0) {
      return 'No tournaments or competitions available for the selected event.';
    }
  }

  // Deduplicate events by ID to avoid duplicates in summary
  const dedupedData = filteredData.filter((event, index, self) => {
    const eventIdMatch = event.tournament_id || event.id || event.tournamentId;
    return self.findIndex(other => {
      const otherId = other.tournament_id || other.id || other.tournamentId;
      return String(otherId) === String(eventIdMatch);
    }) === index;
  });

  // For competitions, generate a summary of tournaments/lessons
  const summaries = dedupedData.map(tournament => 
    generateTournamentSummary(tournament, playtomicOffset)
  ).filter(summary => summary.trim() !== '');

  if (summaries.length === 0) {
    return 'No tournaments or competitions available.';
  }

  return summaries.join('\n\n');
}

/**
 * Helper function to get token replacement values for message compilation
 */
export function getTokenReplacements(context: {
  summary: string;
  clubName: string;
  dateDisplayShort: string;
  sport?: string;
  countSlots?: number;
  messageContent?: string;
}): Record<string, string> {
  return {
    '{{summary}}': context.summary,
    '{{club_name}}': context.clubName,
    '{{date_display_short}}': context.dateDisplayShort,
    '{{sport}}': context.sport || 'Padel',
    '{{count_slots}}': (context.countSlots || 0).toString(),
    '{{message_content}}': context.messageContent || ''
  };
}

/**
 * Compile message content by replacing tokens with actual values
 */
export function compileMessage(template: string | undefined | null, replacements: Record<string, string>): string {
  if (!template) {
    return '';
  }
  
  let compiled = template;
  
  for (const [token, value] of Object.entries(replacements)) {
    compiled = compiled.replace(new RegExp(token.replace(/[{}]/g, '\\$&'), 'g'), value);
  }
  
  return compiled;
}