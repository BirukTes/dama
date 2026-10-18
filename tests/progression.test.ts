import { afterEach, describe, expect, it, vi } from 'vitest';
import { maps } from '../src/game/maps';
import { initialState } from '../src/game/rules';
import {
  emptyProgress,
  loadProgress,
  saveProgress,
  recordResult,
  unlocked,
  isJourney,
  nextChallenge,
} from '../src/persistence/progress';
import { loadSession, saveSession, type Session } from '../src/persistence/save';
afterEach(() => vi.unstubAllGlobals());
it('chooses unbeaten rivals before other maps and finishes without a circular next goal', () => {
  const all = Object.fromEntries(Object.keys(maps).map((id) => [id, emptyProgress()])) as Record<
    keyof typeof maps,
    ReturnType<typeof emptyProgress>
  >;
  expect(nextChallenge(all, 'islands')).toEqual({ map: 'islands', opponent: 'coral' });
  all.islands.wins.coral = 1;
  expect(nextChallenge(all, 'islands')).toEqual({ map: 'islands', opponent: 'runner' });
  for (const p of Object.values(all)) p.wins = { coral: 1, runner: 1, guardian: 1 };
  expect(nextChallenge(all, 'islands')).toBeNull();
  all.crossroads.wins.guardian = 0;
  expect(nextChallenge(all, 'islands')).toEqual({ map: 'crossroads', opponent: 'guardian' });
});
function storage() {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => data.set(k, v),
  });
  return data;
}
const match = (map: keyof typeof maps = 'classic'): Session => ({
  state: { ...initialState('blue', map), result: { winner: 'blue' } },
  mode: 'solo',
  track: 'journey',
  starter: 'blue',
  difficulty: 'standard',
  undo: [],
  opponent: 'coral',
  matchId: 'match-1',
});
describe('map journeys and free play', () => {
  it('preserves Classic records and keeps every other map isolated through reload', () => {
    const data = storage();
    const classic = {
      ...emptyProgress(),
      wins: { coral: 7, runner: 3, guardian: 1 },
      recorded: ['old-classic'],
    };
    data.set('dama-progress-v1', JSON.stringify(classic));
    for (const map of Object.values(maps)) {
      const before = loadProgress(map.id),
        result = recordResult(before, match(map.id));
      expect(result.wins.coral).toBe(before.wins.coral + 1);
      expect(unlocked(result, 'runner')).toBe(true);
      saveProgress(result, map.id);
      expect(loadProgress(map.id)).toEqual(result);
      expect(recordResult(loadProgress(map.id), match(map.id))).toEqual(result);
      for (const untouched of Object.values(maps).slice(Object.keys(maps).indexOf(map.id) + 1))
        expect(loadProgress(untouched.id)).toEqual(emptyProgress());
    }
    expect(loadProgress().wins.coral).toBe(8);
    expect(loadProgress().recorded).toContain('old-classic');
  });
  it.each(Object.keys(maps) as (keyof typeof maps)[])(
    '%s unlocks rivals in order and ignores losses/draws for unlocks',
    (map) => {
      const s = match(map),
        empty = emptyProgress();
      expect(unlocked(empty, 'runner')).toBe(false);
      const loss = recordResult(empty, {
        ...s,
        state: { ...s.state, result: { winner: 'coral' } },
      });
      expect(loss.losses.coral).toBe(1);
      expect(unlocked(loss, 'runner')).toBe(false);
      const draw = recordResult(empty, {
        ...s,
        state: { ...s.state, result: { draw: 'repetition' } },
      });
      expect(draw.draws.coral).toBe(1);
      expect(unlocked(draw, 'runner')).toBe(false);
      const coral = recordResult(empty, s);
      expect(unlocked(coral, 'runner')).toBe(true);
      expect(unlocked(coral, 'guardian')).toBe(false);
      const runner = recordResult(coral, { ...s, opponent: 'runner', matchId: 'runner' });
      expect(unlocked(runner, 'guardian')).toBe(true);
      const guardian = recordResult(runner, { ...s, opponent: 'guardian', matchId: 'guardian' });
      expect(guardian.wins.guardian).toBe(1);
      for (const excluded of [
        { ...s, track: 'free-play' as const },
        { ...s, mode: 'local' as const },
        { ...s, puzzleId: 'last-step' },
      ])
        expect(recordResult(empty, excluded)).toBe(empty);
    },
  );
  it('recognises legacy Classic as Journey and legacy alternatives as untracked Free play', () => {
    const classic = { ...match(), track: undefined };
    expect(isJourney(classic)).toBe(true);
    expect(recordResult(emptyProgress(), classic).wins.coral).toBe(1);
    for (const map of Object.values(maps).filter((m) => m.id !== 'classic')) {
      const legacy = { ...match(map.id), track: undefined },
        p = emptyProgress();
      expect(isJourney(legacy)).toBe(false);
      expect(recordResult(p, legacy)).toBe(p);
    }
  });
  it('retains match type in saves and rejects unsupported types', () => {
    const data = storage();
    for (const track of ['journey', 'free-play'] as const) {
      const s = { ...match('long-crossing'), state: initialState('blue', 'long-crossing'), track };
      saveSession(s);
      expect(loadSession()?.track).toBe(track);
    }
    const raw = JSON.parse(data.get('dama-session-v1')!);
    raw.track = 'unknown';
    data.set('dama-session-v1', JSON.stringify(raw));
    expect(loadSession()).toBeNull();
  });
});
