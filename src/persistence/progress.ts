import { opponents, type OpponentId } from '../game/opponents';
import type { Session } from './save';

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
export function loadProgress(): Progress {
  try {
    const p = JSON.parse(localStorage.getItem('dama-progress-v1') ?? 'null');
    if (
      !p ||
      !['wins', 'losses', 'draws'].every((field) =>
        opponents.every(({ id }) => Number.isSafeInteger(p[field]?.[id]) && p[field][id] >= 0),
      ) ||
      !Array.isArray(p.recorded) ||
      !p.recorded.every((id: unknown) => typeof id === 'string')
    )
      return emptyProgress();
    return p;
  } catch {
    return emptyProgress();
  }
}
export function unlocked(p: Progress, id: OpponentId): boolean {
  const index = opponents.findIndex((o) => o.id === id);
  return index === 0 || p.wins[opponents[index - 1].id] > 0;
}
export function recordResult(p: Progress, session: Session): Progress {
  if (
    session.mode !== 'solo' ||
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
export function saveProgress(p: Progress): boolean {
  try {
    localStorage.setItem('dama-progress-v1', JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}
