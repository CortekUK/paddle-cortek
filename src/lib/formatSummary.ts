import { 
  generateAvailabilitySummary, 
  generateCompetitiveOpenMatchesSummary,
  generateTournamentSummary
} from '@/utils/playtomicAdminUtils';

export interface FormatSummaryParams {
  category: 'COURT_AVAILABILITY' | 'PARTIAL_MATCHES' | 'COMPETITIONS';
  data: any[];
  variant: string;
  target: 'TODAY' | 'TOMORROW';
  tz: string;
  playtomicOffset?: number;
}

/**
 * Unified summary formatter used by both WhatsApp Message Builder and Social Post Builder
 * to ensure consistent summary generation across all features
 */
export function formatSummary({
  category,
  data,
  variant,
  target,
  tz,
  playtomicOffset = 60
}: FormatSummaryParams): string {
  if (!Array.isArray(data) || data.length === 0) {
    return getDefaultEmptyMessage(category);
  }

  switch (category) {
    case 'COURT_AVAILABILITY':
      return formatAvailabilitySummary(data, variant, playtomicOffset);
    
    case 'PARTIAL_MATCHES':
      return formatPartialMatchesSummary(data, variant, tz, playtomicOffset);
    
    case 'COMPETITIONS':
      return formatCompetitionsSummary(data, variant, playtomicOffset);
    
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

function formatAvailabilitySummary(data: any[], variant: string, playtomicOffset: number): string {
  // Use the same logic as admin for court availability
  return generateAvailabilitySummary(data, playtomicOffset);
}

function formatPartialMatchesSummary(data: any[], variant: string, tz: string, playtomicOffset: number): string {
  // Handle different variants for partial matches
  switch (variant.toLowerCase()) {
    case 'competitive-open':
    case 'competitive_open':
      return generateCompetitiveOpenMatchesSummary(data, tz, playtomicOffset);
    
    default:
      // Default to competitive open format
      return generateCompetitiveOpenMatchesSummary(data, tz, playtomicOffset);
  }
}

function formatCompetitionsSummary(data: any[], variant: string, playtomicOffset: number): string {
  if (data.length === 0) {
    return 'No tournaments or competitions available.';
  }

  // For competitions, generate a summary of tournaments/lessons
  const summaries = data.map(tournament => 
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
export function getTokenReplacements({
  summary,
  clubName,
  dateDisplayShort,
  sport = 'Padel',
  countSlots = 0,
  messageContent = ''
}: {
  summary: string;
  clubName: string;
  dateDisplayShort: string;
  sport?: string;
  countSlots?: number;
  messageContent?: string;
}): Record<string, string> {
  return {
    '{{summary}}': summary,
    '{{club_name}}': clubName,
    '{{date_display_short}}': dateDisplayShort,
    '{{sport}}': sport,
    '{{count_slots}}': countSlots.toString(),
    '{{message_content}}': messageContent
  };
}

/**
 * Compile message content by replacing tokens with actual values
 */
export function compileMessage(template: string, replacements: Record<string, string>): string {
  let compiled = template;
  
  for (const [token, value] of Object.entries(replacements)) {
    compiled = compiled.replace(new RegExp(token.replace(/[{}]/g, '\\$&'), 'g'), value);
  }
  
  return compiled;
}