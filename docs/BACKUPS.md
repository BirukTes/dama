# Backup and restore

Open Settings → Backup & restore → Download backup. The versioned JSON contains normal and puzzle saves, all six Journey records, puzzle records, settings, the chosen icon, Home choices and guided-lesson completion. It contains no account, server data or service-worker cache. Keep the file to transfer between devices or Safari and an installed app.

Choose a file on the destination device, read the dated preview and select Replace data & restore. Restore is allowed only on Home. Close other DA’MA tabs/windows first so they cannot later overwrite imported data with an older in-memory match. Cancel and invalid files leave data unchanged. This is a replacement, not a merge; absent DA’MA keys are reset. Unrelated storage keys are never changed. The app reloads after success.

The parser rejects unsupported versions, unknown keys, invalid sessions/progress/preferences and files above 2MB. A failed storage write attempts to restore every previous value and reports whether recovery succeeded. Download a current backup before replacing valuable progress. Backups are local files and are not uploaded.

Unit tests cover round trips, validation and rollback. The solo-improvements browser check covers the actual download, file picker, rejection, preview/cancel, Home-only control and restored match/preferences.
