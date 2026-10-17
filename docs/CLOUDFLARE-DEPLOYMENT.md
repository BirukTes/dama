# Cloudflare Pages deployment

DA’MA is a static Vite application. GitHub stores the code; Cloudflare Pages builds and serves it. There is no server function, database, API key, or paid AI dependency to configure.

## First deployment

In Cloudflare’s dashboard, open **Workers & Pages**, choose **Create application**, then **Pages → Connect to Git**. Authorise the GitHub integration for `BirukTes/dama`, select that repository, and begin setup.

Use the following configuration:

| Setting                | Value                                |
| ---------------------- | ------------------------------------ |
| Project name           | `dama`, or an available alternative  |
| Production branch      | `main`                               |
| Framework preset       | `None`                               |
| Build command          | `npm run build`                      |
| Build output directory | `dist`                               |
| Root directory         | Leave blank; use the repository root |
| Node version           | `24.21.0`, pinned by `.node-version` |

Pages installs dependencies automatically before running the build. If you have set a conflicting `NODE_VERSION` environment variable, remove it or set it to `24.21.0` for both Production and Preview. No other environment variables are needed for this prototype.

Use the **Pages** flow above. This application does not need a Worker deploy command, Wrangler configuration, or a Direct Upload project for the Git-connected workflow.

Choose **Save and Deploy**. Read the build log if it fails. On success, Cloudflare displays the actual HTTPS production URL. The exact hostname depends on the available project name; do not assume that `dama.pages.dev` has been assigned before deployment succeeds.

## Verification

On the returned production URL:

1. Open Home and start a computer match.
2. Move a Blue pawn and confirm that Coral replies.
3. Open Pause, resume, and reload to verify the saved match.
4. Check Light/Dark, rules, and Focus view on a phone in both orientations.
5. Follow Source on GitHub and the MIT licence link.
6. In Settings → Install & offline play, wait for readiness. Install on a phone, open the installed app online once, then check airplane-mode launch and saved-game resume.

Local verification against the production bundle:

```powershell
npm.cmd ci
npm.cmd run format:check
npm.cmd test
npm.cmd run build
npm.cmd run preview -- --port 4173
```

In another terminal:

```powershell
npm.cmd run test:production
```

The production smoke check uses installed Microsoft Edge and verifies Home, computer play, the built worker, static asset loading, saved reload, source attribution, and bundled licences. Unlike development-only tests, it does not import source modules through Vite.

To run that smoke check against the deployed site, set `DAMA_TEST_URL` to the exact returned HTTPS URL for that terminal session before running the command. It opens a fresh browser context and does not affect existing player saves.

## Updates and caching

Pushing to `main` triggers a new production build after Git integration is configured. Other enabled branches can receive preview deployments. Cloudflare’s preview deployments carry `noindex` by default; the production site can be indexed when publicly accessible and not otherwise blocked.

`public/_headers` asks browsers to revalidate the entry HTML, service worker and installation metadata, and gives Vite’s hashed assets a long immutable cache lifetime. The build generates the offline release automatically. Serve those files unchanged so their integrity hashes remain valid. Vite’s local preview does not simulate Cloudflare’s response-header rules; verify the live headers after deployment. See [offline installation and update testing](OFFLINE-INSTALLATION.md).

Saved progress belongs to a particular origin. A save from the Wi-Fi development URL will not automatically appear on the Cloudflare URL. Clearing browser data can also remove progress.

## Remaining work

The manifest, four icon choices, service worker and safe update flow are implemented locally. Deploy this revision, then verify real installation, airplane-mode relaunch and updates on iPhone and Android. Automated browser checks do not replace those physical-device checks.

After the actual production URL is known, add it to the GitHub repository’s website field and README. Use that stable URL for any canonical/share metadata and search-engine submission.

## References

- [Cloudflare Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Build image and Node version selection](https://developers.cloudflare.com/pages/configuration/build-image/)
- [Static response headers](https://developers.cloudflare.com/pages/configuration/headers/)
