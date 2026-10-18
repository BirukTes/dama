import { opponents, type OpponentId } from '../game/opponents';
import type { Session } from './save';
import { maps, type MapId } from '../game/maps';

const storageKey = (map: MapId) =>
  map === 'classic' ? 'dama-progress-v1' : `dama-progress-${map}-v1`;
// Older alternative-board matches were untracked practice. Keep them that way.
export const isJourney = (s: Session) =>
  s.mode === 'solo' &&
  !s.puzzleId &&
  (s.track === 'journey' || (s.track === undefined && (s.state.map ?? 'classic') === 'classic'));
export const allowsUndo = (s: Session) => !isJourney(s);
export function nextChallenge(journeys: Record<MapId, Progress>, preferred: MapId) {
  const order = [maps[preferred], ...Object.values(maps).filter((m) => m.id !== preferred)];
  for (const map of order) {
    const rival = opponents.find(
      (o) => journeys[map.id].wins[o.id] === 0 && unlocked(journeys[map.id], o.id),
    );
    if (rival) return { map: map.id, opponent: rival.id };
  }
  return null;
}

export interface Progress {
  wins: Record<OpponentId, number>;
  losses: Record<OpponentId, number>;
  draws: Record<OpponentId, number>;
  recorded: string[];
}
export function emptyProgress(): Progress {
  return {
    wins: { coral: 0, runner: 0, guardian: 0 },
    losses: { coral: 0, runner: 0, guardian: 0 },
    draws: { coral: 0, runner: 0, guardian: 0 },
    recorded: [],
  };
}
export function loadProgress(map: MapId = 'classic'): Progress {
  try {
    return parseProgress(localStorage.getItem(storageKey(map)) ?? 'null') ?? emptyProgress();
  } catch {
    return emptyProgress();
  }
}
export function parseProgress(raw: string): Progress | null {
  try {
    const p = JSON.parse(raw);
    if (
      !p ||
      !['wins', 'losses', 'draws'].every((field) =>
        opponents.every(({ id }) => Number.isSafeInteger(p[field]?.[id]) && p[field][id] >= 0),
      ) ||
      !Array.isArray(p.recorded) ||
      !p.recorded.every((id: unknown) => typeof id === 'string')
    )
      return null;
    return p;
  } catch {
    return null;
  }
}
export function unlocked(p: Progress, id: OpponentId): boolean {
  const index = opponents.findIndex((o) => o.id === id);
  return index === 0 || p.wins[opponents[index - 1].id] > 0;
}
export function recordResult(p: Progress, session: Session): Progress {
  if (
    !isJourney(session) ||
    !session.state.result ||
    !session.matchId ||
    p.recorded.includes(session.matchId)
  )
    return p;
  const result = session.state.result;
  const field = 'winner' in result ? (result.winner === 'blue' ? 'wins' : 'losses') : 'draws';
  const id = session.opponent ?? 'coral';
  return {
    ...p,
    [field]: { ...p[field], [id]: p[field][id] + 1 },
    recorded: [...p.recorded.slice(-255), session.matchId],
  };
}
export function saveProgress(p: Progress, map: MapId = 'classic'): boolean {
  try {
    localStorage.setItem(storageKey(map), JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}
