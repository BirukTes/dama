import { describe, it, expect, afterEach, vi } from 'vitest';
import { applyMove, initialState, legalMoves, key, type State } from '../src/game/rules';
import { chooseMove } from '../src/ai/search';
import {
  emptyProgress,
  recordResult,
  unlocked,
  loadProgress,
  saveProgress,
} from '../src/persistence/progress';
import { loadSession, type Session } from '../src/persistence/save';
import { opponents } from '../src/game/opponents';
import { createMatchId } from '../src/persistence/match-id';

afterEach(() => vi.unstubAllGlobals());
function storage() {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
  });
  return data;
}
function won(): Session {
  const state: State = {
    board: [null, null, null, null, 'blue', null, null, 'coral', null],
    delivered: { blue: 2, coral: 2 },
    turn: 'blue',
    turns: 0,
    history: [],
    result: null,
  };
  state.history = [key(state)];
  return {
    state: applyMove(state, { from: 4, to: 0 }),
    mode: 'solo',
    difficulty: 'standard',
    starter: 'blue',
    undo: [],
    opponent: 'coral',
    matchId: 'first-win',
  };
}
describe('opponent journey', () => {
  it('creates distinct match IDs when HTTP previews have no randomUUID', () => {
    let sequence = 0;
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(++sequence);
        return bytes;
      },
    });
    const first = createMatchId();
    expect(first).toMatch(/^match-[0-9a-f]{32}$/);
    expect(createMatchId()).not.toBe(first);
  });
  it('unlocks in order, counts a finished match once, and persists across reload', () => {
    storage();
    const empty = emptyProgress();
    expect(unlocked(empty, 'runner')).toBe(false);
    const first = recordResult(empty, won());
    expect(first.wins.coral).toBe(1);
    expect(unlocked(first, 'runner')).toBe(true);
    expect(unlocked(first, 'guardian')).toBe(false);
    expect(saveProgress(first)).toBe(true);
    expect(recordResult(loadProgress(), won()).wins.coral).toBe(1);
    const second = recordResult(first, { ...won(), opponent: 'runner', matchId: 'runner-win' });
    expect(unlocked(second, 'guardian')).toBe(true);
    expect(recordResult(second, { ...won(), mode: 'local', matchId: 'local' })).toBe(second);
    expect(recordResult(second, { ...won(), state: initialState(), matchId: 'unfinished' })).toBe(
      second,
    );
  });
  it('counts losses and draws without unlocking rivals', () => {
    const s = won();
    const loss = recordResult(emptyProgress(), {
      ...s,
      state: { ...s.state, result: { winner: 'coral' } },
    });
    expect(loss.losses.coral).toBe(1);
    expect(unlocked(loss, 'runner')).toBe(false);
    const draw = recordResult(loss, {
      ...s,
      matchId: 'draw',
      state: { ...s.state, result: { draw: 'repetition' } },
    });
    expect(draw.draws.coral).toBe(1);
  });
  it('loads old sessions and safely handles malformed progress or blocked storage', () => {
    const data = storage();
    data.set(
      'dama-session-v1',
      JSON.stringify({
        version: 1,
        state: initialState(),
        mode: 'solo',
        difficulty: 'standard',
        starter: 'blue',
        undo: [],
      }),
    );
    expect(loadSession()?.state).toEqual(initialState());
    data.set('dama-progress-v1', '{"wins":{"coral":-5}}');
    expect(loadProgress()).toEqual(emptyProgress());
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(loadSession()).toBeNull();
    expect(loadProgress()).toEqual(emptyProgress());
    expect(saveProgress(emptyProgress())).toBe(false);
  });
});
describe('rival decisions', () => {
  it('all rivals return legal moves and recognise an immediate win', () => {
    const win: State = {
      board: [null, 'blue', null, null, 'coral', null, null, null, null],
      delivered: { blue: 2, coral: 2 },
      turn: 'coral',
      turns: 0,
      history: [],
      result: null,
    };
    win.history = [key(win)];
    for (const { id } of opponents) {
      const start = initialState('coral');
      expect(legalMoves(start)).toContainEqual(chooseMove(start, 'standard', () => 0.5, id));
      expect(
        applyMove(
          win,
          chooseMove(win, 'standard', () => 0.5, id)!,
        ).result,
      ).toEqual({ winner: 'coral' });
    }
  });
  it('racing and defensive opponents choose different plans in a reachable position', () => {
    const state = applyMove(initialState(), { from: 8, to: 7 });
    const runner = chooseMove(state, 'standard', () => 0.5, 'runner');
    const guardian = chooseMove(state, 'standard', () => 0.5, 'guardian');
    expect(runner).not.toEqual(guardian);
  });
});
