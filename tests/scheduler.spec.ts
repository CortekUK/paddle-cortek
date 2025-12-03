import { describe, it, expect } from 'vitest'
import { filterCompetitiveOpen, filterByVariant, isUntitled, isFull } from '@/lib/schedulerTestables'

describe('schedulerTestables', () => {
  it('filters competitive open matches correctly', () => {
    const matches = [
      { status: 'active', join_requests_info: { status: 'OPEN' }, competition_mode: 'COMPETITIVE', match_type: 'COMPETITIVE', teams: [{ players: [{ name: 'A' }] }] },
      { status: 'cancelled', join_requests_info: { status: 'OPEN' }, competition_mode: 'COMPETITIVE', match_type: 'COMPETITIVE' },
      { status: 'active', join_requests_info: { status: 'closed' }, competition_mode: 'COMPETITIVE', match_type: 'COMPETITIVE' },
      { status: 'active', join_requests_info: { status: 'OPEN' }, competition_mode: 'friendly', match_type: 'COMPETITIVE' },
    ] as any
    const filtered = filterCompetitiveOpen(matches)
    expect(filtered.length).toBe(1)
    expect((filtered as any)[0].registeredPlayers).toBe(1)
  })

  it('applies variant filters 1/2/3 players', () => {
    const base = [
      { registeredPlayers: 1 },
      { registeredPlayers: 2 },
      { registeredPlayers: 3 },
      { registeredPlayers: 4 },
    ] as any
    expect(filterByVariant(base, 'competitive-open-1').length).toBe(1)
    expect(filterByVariant(base, 'competitive-open-2').length).toBe(1)
    expect(filterByVariant(base, 'competitive-open-3').length).toBe(1)
    expect(filterByVariant(base, 'competitive-open').length).toBe(4)
  })

  it('detects untitled and full events', () => {
    expect(isUntitled({ title: 'Untitled' } as any)).toBe(true)
    expect(isUntitled({ name: 'My Event' } as any)).toBe(false)
    expect(isFull({ registered_players: Array(5).fill({}), max_players: 5 } as any)).toBe(true)
    expect(isFull({ registered_players: Array(4).fill({}), max_players: 5 } as any)).toBe(false)
  })
})


