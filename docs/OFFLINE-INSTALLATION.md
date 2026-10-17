# Offline installation and updates

The production build automatically downloads the game for offline use. **Settings → Install & offline play** reports readiness, offers a retry if files are missing, and provides either the browser's install prompt or platform instructions. Installation is optional for offline play in a normal browser tab.

Choose an icon in **Settings → App icon** before installing. The four static install previews retain their matching manifest and Apple touch icon. Open the game once online before relying on offline use. After adding it to the home screen, open that installed app online too and check its own readiness. Safari and an installed app can have separate storage; installing is not a save-transfer feature.

## Cached content

`npm.cmd run build` runs TypeScript, Vite, then `scripts/build-offline.mjs`. The last step fingerprints the built files and writes `dist/sw.js` from `src/pwa/service-worker.js`. It requires no new dependency. The release includes the HTML, scripts, styles, bundled fonts, both game workers, icons, manifests and install previews. Generated sounds need no network files. Original icon masters under `design/` are not shipped.

Each release has a `dama-shell-<hash>` cache. Downloads use per-file SHA-256 integrity, so a failed download or mismatched deployment cannot install a broken shell. Known release files are served from that cache, including the root page with an icon launch parameter. Cache readiness checks every expected file. **Prepare offline play** downloads missing files again when connected.

Game saves remain in their existing localStorage keys. The worker never clears or migrates them. Activation removes only older DA’MA shell caches, retaining the current and previous release; unrelated caches are preserved. Browser data clearing or storage eviction can still remove offline files and/or saves. Reconnect and prepare again if readiness is lost. Export/import is a separate remaining feature.

## Updates

A newly downloaded version waits while the current one is open. There is no forced mid-game refresh. On Home, an **Update & reload** notice and the Settings action become available. The action writes the current normal match and puzzle attempt before requesting activation. If saving fails, it leaves the current version open. Other DA’MA windows, tabs and install previews must close first to avoid interrupting another game. The requesting page reloads after the new worker takes control.

The browser may activate a waiting release naturally when every old app window has closed. Updates are also checked when returning to the page or reconnecting. Keeping a previous cache allows old hashed assets to load during the handover. This is a single-origin static app intended for deployment at `/`.

## Local and Cloudflare testing

The Vite development server deliberately does not register a service worker. To exercise offline mode locally:

```powershell
npm.cmd run build
npm.cmd run preview
```

Open `http://localhost:4173`, wait for **Ready for offline play**, then disable the network and reload. A phone's ordinary `http://192.168…` Wi-Fi address is not a secure context for this feature. Use the HTTPS Cloudflare deployment for phone installation and offline checks.

Cloudflare Pages keeps the existing build command `npm run build` and output folder `dist`. The committed `_headers` revalidates the service worker and entry metadata; hashed assets retain long-lived caching. Deploy the generated output together, without rewriting/minifying its contents after the integrity hashes are generated. No paid service or backend is required by this implementation.

`npm.cmd run test:offline` starts an isolated local server from the current build. It verifies an actual offline reload, computer moves on every map, the exact puzzle-defence worker, icon previews, simulated install events, active-match/multiple-tab update guards, a complete version handover, byte-for-byte save preservation, missing-file recovery, unrelated-cache preservation and rejection of a corrupt release. Screenshots and temporary releases stay in ignored `.inspection/`. These checks use desktop Edge; they do not verify an OS installation.

## Remaining physical-device checks

On iPhone Safari and Android Chrome, install from the HTTPS deployment with the selected icon. Launch it online, confirm readiness, then close it, enable airplane mode and reopen. Exercise a rival match, puzzle, undo, sound after a gesture, rotation and saved-game resume. Deploy a later build and check the waiting update from Home. Confirm that the chosen icon is used and that controls fit around system safe areas. Test browser and installed-app saves separately rather than assuming they are shared.

Sources: [MDN service worker lifecycle and secure contexts](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers), [WebKit storage policy and eviction](https://webkit.org/blog/14403/updates-to-storage-policy/), [WebKit home-screen storage isolation](https://webkit.org/blog/14787/webkit-features-in-safari-17-2/).
