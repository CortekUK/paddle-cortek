export type Match = {
  status?: string;
  join_requests_info?: { status?: string };
  competition_mode?: string;
  match_type?: string;
  teams?: Array<{ players?: Array<{ name?: string; level_value?: number }> }>;
};

export function filterCompetitiveOpen(matches: Match[]) {
  const safe = Array.isArray(matches) ? matches : [];
  return safe
    .filter((match) => {
      const cancelled = match.status?.toLowerCase() === 'cancelled';
      if (cancelled) return false;
      const joinStatus = match.join_requests_info?.status?.toLowerCase();
      if (joinStatus !== 'open') return false;
      const compMode = match.competition_mode?.toLowerCase();
      if (compMode !== 'competitive') return false;
      const matchType = match.match_type?.toLowerCase();
      if (matchType !== 'competitive') return false;
      return true;
    })
    .map((m) => {
      const registeredPlayers =
        m.teams?.reduce((count: number, team: any) => {
          const playersWithNames = team.players?.filter((p: any) => p.name) || [];
          return count + playersWithNames.length;
        }, 0) || 0;
      return { ...m, registeredPlayers } as Match & { registeredPlayers: number };
    });
}

export function filterByVariant(
  matches: Array<Match & { registeredPlayers: number }>,
  variant?: string
) {
  if (!variant || variant === 'competitive-open') return matches;
  if (variant === 'competitive-open-1') return matches.filter((m) => m.registeredPlayers === 1);
  if (variant === 'competitive-open-2') return matches.filter((m) => m.registeredPlayers === 2);
  if (variant === 'competitive-open-3') return matches.filter((m) => m.registeredPlayers === 3);
  return matches;
}

export type EventLike = {
  name?: string;
  title?: string;
  tournament_name?: string;
  registered_players?: any[];
  max_players?: number;
};

export function isUntitled(event: EventLike) {
  const name = event.tournament_name || event.name || event.title || '';
  return !name || /untitled/i.test(name);
}

export function isFull(event: EventLike) {
  const registered = event.registered_players?.length || 0;
  const max = event.max_players || 0;
  return max > 0 && registered >= max;
}


