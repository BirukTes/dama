# Initial commit plan

This document records the initial three-commit series for a repository that began without commits. Commit 1 establishes the toolchain; the application becomes playable with commit 2. The file groups and commands below are retained as a reference for the series.

## 1. Development tooling

Suggested message: `chore: configure TypeScript development and formatting`

Include package metadata and lockfile, TypeScript configuration, ignored build/test outputs, editor settings, line endings, and Prettier configuration. The scripts for application checks are completed by the files in commit 2.

```powershell
git add .gitignore .gitattributes .editorconfig .prettierignore .prettierrc.json package.json package-lock.json tsconfig.json
git diff --cached --stat
git diff --cached --check
git commit -m "chore: configure TypeScript development and formatting"
```

## 2. Playable prototype and verification

Suggested message: `feat: add the playable DA'MA browser prototype`

Include the entry HTML, all source files, bundled font licence, and all tests. This is one coherent implementation: original rules and board analysis, local computer and two-player matches, saved sessions, Home/Play navigation, accessible modal menus, themes, Focus view, illustrated rules, scoring feedback, and browser verification.

The interface and its refinements currently share the same application files. Keeping them together gives this commit a complete, testable game without reconstructing intermediate versions.

```powershell
git add index.html src public tests
git diff --cached --stat
git diff --cached --check
git commit -m "feat: add the playable DA'MA browser prototype"
```

## 3. Design and development documentation

Suggested message: `docs: describe gameplay development and release roadmap`

Include the README, original development plan, and this commit plan. Document the provisional draw rules, local-only saves, heuristic opponent, baseline analysis limits, phone testing, and remaining offline/hosting work.

```powershell
git add README.md DA-MA-Development-Plan.md docs
git diff --cached --stat
git diff --cached --check
git commit -m "docs: describe gameplay development and release roadmap"
```

## Validation before committing

```powershell
npm.cmd run format:check
npm.cmd test
npm.cmd run build
npm.cmd run analyze
```

With the development server running in another terminal:

```powershell
npm.cmd run test:browser
npm.cmd run test:appearance
```

Review the staged diff and final `git status` after each commit. Local inspection files, downloaded inspection dependencies, node_modules, dist, browser screenshots, and release ZIPs stay ignored. No credentials, production URL, source presentation, or video are part of this initial series.

## Subsequent commits

Keep future changes focused and include relevant checks with each feature:

- `feat: add an interactive first-match tutorial`
- `feat: support home-screen installation and offline play`
- `feat: offer safe application updates between matches`
- `build: configure Cloudflare Pages deployment`

Tutorials, PWA support, and hosting remain separate work. Cloudflare publishing will use the selected account and a verified repository; the current prototype is local.
