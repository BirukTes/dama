import { goalsFor, key, type State } from '../game/rules';
import type { Difficulty } from '../ai/search';
import { isOpponent, type OpponentId } from '../game/opponents';
import { puzzleFor } from '../game/puzzles';
import { isMapId, mapFor } from '../game/maps';
export interface Session {
  state: State;
  mode: 'solo' | 'local';
  difficulty: Difficulty;
  undo: State[];
  starter: 'blue' | 'coral';
  opponent?: OpponentId;
  matchId?: string;
  puzzleId?: string;
  puzzleHinted?: boolean;
}
const storageKey = 'dama-session-v1';
export function validState(value: unknown): value is State {
  if (!value || typeof value !== 'object') return false;
  const s = value as State;
  if (s.map !== undefined && !isMapId(s.map)) return false;
  if (
    !Array.isArray(s.board) ||
    s.board.length !== mapFor(s.map).points.length ||
    !s.board.every((p) => p === null || p === 'blue' || p === 'coral')
  )
    return false;
  if (s.turn !== 'blue' && s.turn !== 'coral') return false;
  if (!s.delivered || !Number.isInteger(s.turns) || s.turns < 0 || s.turns > 101) return false;
  for (const side of ['blue', 'coral'] as const) {
    if (
      !Number.isInteger(s.delivered[side]) ||
      s.delivered[side] < 0 ||
      s.delivered[side] > 3 ||
      s.board.filter((p) => p === side).length + s.delivered[side] !== 3
    )
      return false;
    if (goalsFor(s)[side].some((n) => s.board[n] === side)) return false;
  }
  if (
    !Array.isArray(s.history) ||
    s.history.length < 1 ||
    s.history.length > 102 ||
    !s.history.every(
      (k) =>
        typeof k === 'string' &&
        k.startsWith(s.map && s.map !== 'classic' ? `${s.map}|` : '') &&
        new RegExp(`^[bc.]{${s.board.length}}:[0-3]:[0-3]:(blue|coral)$`).test(
          k.slice(s.map && s.map !== 'classic' ? s.map.length + 1 : 0),
        ),
    ) ||
    s.history.at(-1) !== key(s)
  )
    return false;
  if (s.result !== null) {
    if (!s.result || typeof s.result !== 'object') return false;
    if ('winner' in s.result) {
      if (!['blue', 'coral'].includes(s.result.winner) || s.delivered[s.result.winner] !== 3)
        return false;
    } else if (
      !('draw' in s.result) ||
      !['repetition', 'blocked', 'turn-limit'].includes(s.result.draw)
    )
      return false;
  } else if (s.delivered.blue === 3 || s.delivered.coral === 3) return false;
  return true;
}
export function loadSession(key = storageKey): Session | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (
      data.version !== 1 ||
      !validState(data.state) ||
      !['solo', 'local'].includes(data.mode) ||
      !['gentle', 'standard'].includes(data.difficulty) ||
      !['blue', 'coral'].includes(data.starter) ||
      (data.opponent !== undefined && !isOpponent(data.opponent)) ||
      (data.matchId !== undefined && typeof data.matchId !== 'string') ||
      (data.puzzleId !== undefined && (!puzzleFor(data.puzzleId) || data.mode !== 'solo')) ||
      (data.puzzleId !== undefined && (data.state.map ?? 'classic') !== 'classic') ||
      (data.puzzleHinted !== undefined && typeof data.puzzleHinted !== 'boolean') ||
      !Array.isArray(data.undo) ||
      data.undo.length > 100 ||
      !data.undo.every(
        (s: unknown) => validState(s) && (s.map ?? 'classic') === (data.state.map ?? 'classic'),
      )
    )
      return null;
    return data;
  } catch {
    return null;
  }
}
export function saveSession(session: Session): boolean {
  try {
    localStorage.setItem(
      session.puzzleId ? 'dama-puzzle-session-v1' : storageKey,
      JSON.stringify({ version: 1, ...session }),
    );
    return true;
  } catch {
    return false;
  }
}
