# App icons and pre-install testing

Four generated families are available through **Settings → App icon**: Monogram Dark (default), Monogram Light, Board Light and Board Dark. The picker uses native radios with previews, persists `dama-app-icon-v1`, updates the favicon and Apple touch link, and chooses a matching manifest. Game theme and icon preference are separate. Game/puzzle/Journey saves are untouched.

## Install preview

**Open install preview** opens `/install/<variant>.html`. Each static page declares its matching manifest, 180px Apple touch icon, favicon and colour metadata in the initial HTML. This avoids relying on last-second dynamic icon replacement during installation. It shows a native Install button only when the browser supplies `beforeinstallprompt`; otherwise browser-menu and iPhone Share/Add to Home Screen instructions remain. Standalone mode changes the instructions; it is not treated as universal installed-status detection. Ordinary HTTP Wi-Fi previews explain the HTTPS requirement for reliable installation testing.

All four manifests have `id: /`, `scope: /` and the same DA’MA name. Each has a stable URL under `/manifests/` and an icon-specific `start_url` such as `/?app-icon=board-light`. The launch parameter carries the chosen icon into a newly installed browsing context, is saved if storage is available and is removed from the visible URL so later picker changes survive reload. These variants represent one app, rather than four separately named apps.

The early `icon-bootstrap.js` reads that launch choice or the saved preference before app startup and declares only the selected metadata. If that optional file fails, the main app creates the links itself and remains playable. Invalid preferences fall back to Monogram Dark. Cloudflare serves manifests, install pages and bootstrap code with revalidation.

## Assets

Each family exports opaque 32px favicon, 180px Apple touch icon, 192/512px `any` icons, plus a separately padded 512px `maskable` icon. Original generated masters and prompt briefs are committed under `design/app-icons/`. The Python/Pillow exporter resizes masters, adds safe padding for the maskable output, and produces static manifests/preview pages. The normal Node build only copies these committed assets.

## Limits and verification

This milestone enables icon choice and installation previews. It does not register a service worker, provide offline play, guarantee browser install eligibility, or immediately replace an already-installed icon. Browsers may recognise DA’MA as already installed because all variants share its identity. Physical iPhone/Android checks of the actual installed icon remain necessary; a fresh testing profile is useful for comparing choices.

`npm.cmd run test:icons` verifies all four families and PNG sizes, default/invalid/saved selections, game-theme independence, launch parameters, static preview metadata, Chromium manifest parsing, prompt/dismissal/install event handling and bootstrap fallback. Set `DAMA_TEST_URL=http://localhost:4173` for the built preview. Native prompt behaviour is simulated by this test; it does not claim to verify a real OS installation.

Sources: [Web app manifests](https://web.dev/articles/add-manifest), [PWA metadata updates](https://web.dev/learn/pwa/update#updating_metadata), [WebKit home-screen icon support](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/). The UI makes no promise of automatic light/dark icon switching.

Next: offline caching, safe app updates and physical-device installation checks.
