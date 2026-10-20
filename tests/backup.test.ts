import { expect, it } from 'vitest';
import { createBackup, parseBackup, restoreBackup, backupSummary } from '../src/persistence/backup';
import { initialState } from '../src/game/rules';
import { emptyProgress } from '../src/persistence/progress';
const session = JSON.stringify({
  version: 1,
  state: initialState(),
  mode: 'solo',
  difficulty: 'standard',
  starter: 'blue',
  undo: [],
});
function storage() {
  const values = new Map<string, string>([
    ['dama-session-v1', session],
    ['other-app', 'keep'],
  ]);
  return {
    values,
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
    removeItem: (k: string) => {
      values.delete(k);
    },
  };
}
it('round trips saves and per-map progress while preserving other app keys', () => {
  const s = storage(),
    p = emptyProgress();
  p.wins.coral = 1;
  s.setItem('dama-progress-islands-v1', JSON.stringify(p));
  const b = parseBackup(JSON.stringify(createBackup(s)));
  expect(backupSummary(b)).toContain('1 rivals beaten');
  s.setItem('dama-settings-v1', '{"theme":"dark"}');
  s.removeItem('dama-session-v1');
  restoreBackup(b, s);
  expect(s.getItem('dama-session-v1')).toBe(session);
  expect(s.getItem('dama-settings-v1')).toBeNull();
  expect(s.getItem('other-app')).toBe('keep');
});
it('rejects invalid sessions, unsupported keys, malformed JSON and unknown versions before writing', () => {
  const s = storage(),
    b = createBackup(s),
    before = [...s.values];
  for (const text of [
    'broken',
    JSON.stringify({ ...b, version: 2 }),
    JSON.stringify({ ...b, entries: { ...b.entries, 'other-app': 'overwrite' } }),
    JSON.stringify({ ...b, entries: { 'dama-session-v1': '{"version":1}' } }),
    JSON.stringify({
      ...b,
      entries: { 'dama-puzzles-v1': '{"last-step":{"bestMoves":999,"unassisted":false}}' },
    }),
  ]) {
    expect(() => restoreBackup(JSON.parse(text), s)).toThrow();
    expect([...s.values]).toEqual(before);
  }
});
it('rolls back earlier writes if storage rejects a later write', () => {
  const s = storage(),
    b = createBackup(s),
    before = [...s.values];
  b.entries['dama-session-v1'] = JSON.stringify({ ...JSON.parse(session), difficulty: 'gentle' });
  b.entries['dama-settings-v1'] = '{"theme":"dark"}';
  const write = s.setItem;
  s.setItem = (k, v) => {
    if (k === 'dama-settings-v1') throw new Error('quota');
    write(k, v);
  };
  expect(() => restoreBackup(b, s)).toThrow('previous data was kept');
  expect([...s.values]).toEqual(before);
});
it('explains how to recover a newer backup without exposing internal storage keys', () => {
  const b = createBackup(storage());
  expect(() => parseBackup(JSON.stringify({ ...b, version: 2 }))).toThrow('Update the app');
  expect(() => parseBackup(JSON.stringify({ ...b, entries: { 'dama-session-v1': '{}' } }))).toThrow(
    'Your current data is unchanged',
  );
});
