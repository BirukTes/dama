import { maps, isMapId } from '../game/maps';
import { isOpponent } from '../game/opponents';
import { puzzleFor } from '../game/puzzles';
import { parseSession } from './save';
import { parseProgress } from './progress';

const progressKeys = Object.values(maps).map((m) =>
  m.id === 'classic' ? 'dama-progress-v1' : `dama-progress-${m.id}-v1`,
);
export const backupKeys = [
  'dama-puzzle-pack-v1',
  'dama-session-v1',
  'dama-puzzle-session-v1',
  'dama-puzzles-v1',
  'dama-settings-v1',
  'dama-home-choice-v1',
  'dama-app-icon-v1',
  'dama-tutorial-v1',
  ...progressKeys,
];
export interface Backup {
  format: 'dama-backup';
  version: 1;
  createdAt: string;
  entries: Record<string, string>;
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
function validEntry(key: string, raw: string): boolean {
  if (key === 'dama-puzzle-pack-v1') return isMapId(raw);
  if (key === 'dama-app-icon-v1')
    return ['board-light', 'board-dark', 'monogram-light', 'monogram-dark'].includes(raw);
  const data: unknown = JSON.parse(raw);
  if (!object(data)) return false;
  if (key === 'dama-session-v1' || key === 'dama-puzzle-session-v1') {
    const session = parseSession(raw);
    return !!session && (key === 'dama-puzzle-session-v1' ? !!session.puzzleId : !session.puzzleId);
  }
  if (progressKeys.includes(key)) return !!parseProgress(raw);
  if (key === 'dama-puzzles-v1')
    return Object.entries(data).every(([id, v]) => {
      const p = puzzleFor(id);
      return (
        p &&
        object(v) &&
        Number.isInteger(v.bestMoves) &&
        Number(v.bestMoves) > 0 &&
        Number(v.bestMoves) <= p.moves &&
        typeof v.unassisted === 'boolean'
      );
    });
  if (key === 'dama-settings-v1')
    return Object.entries(data).every(([k, v]) =>
      k === 'theme'
        ? ['light', 'dark', 'system'].includes(String(v))
        : ['motion', 'sound', 'contrast', 'immersive', 'soundPreferenceSet'].includes(k) &&
          typeof v === 'boolean',
    );
  if (key === 'dama-home-choice-v1')
    return Object.entries(data).every(([k, v]) =>
      k === 'track'
        ? ['journey', 'puzzles', 'free-play'].includes(String(v))
        : k === 'map'
          ? isMapId(v)
          : k === 'opponent'
            ? isOpponent(v)
            : k === 'difficulty' && ['gentle', 'standard'].includes(String(v)),
    );
  if (key === 'dama-tutorial-v1')
    return Object.keys(data).length === 1 && typeof data.completed === 'boolean';
  return false;
}
export function parseBackup(text: string): Backup {
  if (text.length > 2_000_000) throw new Error('This file is too large to be a DA’MA backup.');
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('This is not a readable JSON backup.');
  }
  if (
    !object(data) ||
    data.format !== 'dama-backup' ||
    data.version !== 1 ||
    typeof data.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(data.createdAt)) ||
    !object(data.entries) ||
    !Object.keys(data.entries).length
  )
    throw new Error('This is not a supported DA’MA backup.');
  for (const [key, value] of Object.entries(data.entries)) {
    let valid = false;
    try {
      valid = backupKeys.includes(key) && typeof value === 'string' && validEntry(key, value);
    } catch {
      /* Invalid entries are rejected together. */
    }
    if (!valid)
      throw new Error(
        `The backup contains invalid or unsupported data (${key.slice(0, 80)}). Nothing was restored.`,
      );
  }
  return data as unknown as Backup;
}
export function createBackup(storage: Pick<Storage, 'getItem'> = localStorage): Backup {
  const entries = Object.fromEntries(
    backupKeys.flatMap((key) => {
      const value = storage.getItem(key);
      return value === null ? [] : [[key, value]];
    }),
  );
  return parseBackup(
    JSON.stringify({
      format: 'dama-backup',
      version: 1,
      createdAt: new Date().toISOString(),
      entries,
    }),
  );
}
export function backupSummary(b: Backup): string {
  const sessions = ['dama-session-v1', 'dama-puzzle-session-v1'].filter(
    (k) => k in b.entries,
  ).length;
  const beaten = progressKeys.reduce(
    (sum, k) =>
      sum +
      (k in b.entries
        ? Object.values(parseProgress(b.entries[k])!.wins).filter((n) => n > 0).length
        : 0),
    0,
  );
  const solved = Object.keys(JSON.parse(b.entries['dama-puzzles-v1'] ?? '{}')).length;
  return `${sessions} saved games · ${beaten} rivals beaten · ${solved} puzzles solved. Replaces matches, progress and preferences on this device; items absent from the backup are reset. Download a backup first if you want to keep the current data.`;
}
export function restoreBackup(
  b: Backup,
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage,
): void {
  const valid = parseBackup(JSON.stringify(b));
  const previous = new Map(backupKeys.map((key) => [key, storage.getItem(key)]));
  try {
    // Write incoming values first; quota failures can then roll back without deleting saves.
    for (const [key, value] of Object.entries(valid.entries)) storage.setItem(key, value);
    for (const key of backupKeys) if (!(key in valid.entries)) storage.removeItem(key);
  } catch {
    let recovered = true;
    for (const [key, value] of previous) {
      try {
        if (value === null) storage.removeItem(key);
        else if (storage.getItem(key) !== value) storage.setItem(key, value);
      } catch {
        recovered = false;
      }
    }
    throw new Error(
      recovered
        ? 'Restore failed. Your previous data was kept. Check available storage and try again.'
        : 'Restore failed and could not fully recover storage. Keep your backup file and retry before playing.',
    );
  }
}
