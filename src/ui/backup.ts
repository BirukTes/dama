import {
  createBackup,
  parseBackup,
  restoreBackup,
  backupSummary,
  type Backup,
} from '../persistence/backup';
export const backupMarkup = `<details id="backup-settings"><summary>Backup &amp; restore</summary>
<p class="dialog-note">Keep a copy of your progress or move it to another device. Backups include matches, puzzle records, journeys and preferences.</p>
<button class="quiet" id="backup-export">Download backup</button>
<label class="backup-file">Choose backup file<input id="backup-file" type="file" accept=".json,application/json" /></label>
<p class="dialog-note" id="backup-status" role="status"></p>
<div id="backup-preview" hidden><p class="dialog-note" id="backup-summary"></p><button class="primary" id="backup-restore">Replace data &amp; restore</button><button class="quiet" id="backup-cancel">Cancel</button></div>
<p class="dialog-note" id="backup-home-note">Return Home before restoring. Other open DA’MA tabs should be closed first.</p></details>`;
export function initBackup(options: { canRestore: () => boolean; onRestored: () => void }) {
  const get = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
  let candidate: Backup | undefined,
    read = 0;
  const status = (text: string) => {
    get('backup-status').textContent = text;
  };
  function refresh() {
    get<HTMLButtonElement>('backup-restore').disabled = !options.canRestore() || !candidate;
  }
  function clear() {
    candidate = undefined;
    get('backup-preview').hidden = true;
    get<HTMLInputElement>('backup-file').value = '';
    refresh();
  }
  get('backup-cancel').addEventListener('click', () => {
    read++;
    clear();
    status('Restore cancelled. Your data is unchanged.');
  });
  get('backup-export').addEventListener('click', () => {
    try {
      const backup = createBackup();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = `dama-backup-${backup.createdAt.slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status('Backup downloaded. Keep the file somewhere safe.');
    } catch (e) {
      status(e instanceof Error ? e.message : 'Backup could not be created.');
    }
  });
  get('backup-file').addEventListener('change', async () => {
    const file = get<HTMLInputElement>('backup-file').files?.[0],
      attempt = ++read;
    candidate = undefined;
    get('backup-preview').hidden = true;
    refresh();
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error('This file is too large to be a DA’MA backup.');
      const parsed = parseBackup(await file.text());
      if (attempt !== read) return;
      candidate = parsed;
      get('backup-summary').textContent =
        `Created ${new Date(parsed.createdAt).toLocaleString()}. ${backupSummary(parsed)}`;
      get('backup-preview').hidden = false;
      status('Backup checked. Review before replacing your data.');
      refresh();
    } catch (e) {
      if (attempt === read) status(e instanceof Error ? e.message : 'Backup could not be read.');
    }
  });
  get('backup-restore').addEventListener('click', () => {
    if (!candidate || !options.canRestore()) return;
    try {
      restoreBackup(candidate);
      options.onRestored();
    } catch (e) {
      status(e instanceof Error ? e.message : 'Restore failed.');
    }
  });
  refresh();
  return { refresh };
}
