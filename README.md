# Voice Humanizer

Voice Humanizer is a desktop-first writing assistant built with **Tauri + React**.
It helps rewrite and elaborate text in your preferred writing voice, with profile-aware style memory, streaming output, and local-first data persistence.

Current release: **v1.0.0**

## What It Does

- Rewrites and elaborates user text with adjustable tone and output preset controls.
- Supports multiple writing profiles (personal/work/etc.) with onboarding samples.
- Streams model output live and keeps generation/session history.
- Computes local writing metrics for source/output text (readability, grade-level indexes, lexical diversity, sentence complexity, passive voice, filler density, repetition, and concreteness).
- Shows a consolidated, collapsible metrics panel directly under each LLM response with tooltips, icons, and trend color-coding.
- Stores user data locally with backup/restore support via Tauri backend.
- Supports hosted OpenRouter models and localhost-compatible providers (for example Ollama-style endpoints).

## Tech Stack

- Frontend: React 19, Vite 5, Mantine UI, TipTap
- Desktop runtime: Tauri 2
- Backend (desktop commands): Rust
- Testing: Vitest + Testing Library + jsdom

## Requirements

- Node.js 20+
- npm 10+
- Rust toolchain (stable)
- Tauri prerequisites for your OS

## Quick Start

```bash
# 1) Install dependencies
npm install

# 2) Configure environment
cp .env.example .env

# 3) Run desktop app in development mode
npm run dev
```

`npm run dev` starts Vite on `http://127.0.0.1:1420` and launches Tauri against it.

## Environment Variables

Reference values are in `.env.example`.

Required for hosted OpenRouter usage:

- `OPENROUTER_API_KEY`: your OpenRouter API key

Optional:

- `OPENROUTER_API_KEY_FILE`: custom secret-file path used by desktop backend
- `OPENROUTER_API_URL`: override provider URL (example localhost endpoint)
- `OPENROUTER_APP_URL`: referer URL sent to provider
- `OPENROUTER_APP_NAME`: app title sent to provider
- `OPENROUTER_CATEGORIES`: comma-separated provider categories

Example localhost provider configuration:

```env
OPENROUTER_API_URL=http://localhost:11434/v1/chat/completions
OPENROUTER_APP_URL=http://localhost:5173
OPENROUTER_APP_NAME=Voice Humanizer
# OPENROUTER_API_KEY can be empty for local endpoints
```

## Scripts

### Development and Build

- `npm run dev`: run Tauri desktop app in dev mode
- `npm run dev:web`: run only Vite frontend server
- `npm run build`: build desktop app via Tauri
- `npm run build:web`: build frontend assets only

### Quality

- `npm run test`: run all tests once
- `npm run test:watch`: run tests in watch mode
- `npm run ci`: run test suite + frontend production build
- `npm run test:openrouter`: OpenRouter non-stream + stream integration smoke test

### Versioning

- `npm run version:sync`: syncs `package.json` version into:
  - `src-tauri/Cargo.toml`
  - `src-tauri/tauri.conf.json`
  - `src/constants/version.js`
- `npm run version:bump:patch`
- `npm run version:bump:minor`
- `npm run version:bump:major`

These bump scripts use `npm version --no-git-tag-version` and then run `version:sync`.

## Production Release Workflow (v1)

1. Confirm branch is clean and on release target.
2. Run checks:

```bash
npm run test
npm run build:web
cargo check --manifest-path src-tauri/Cargo.toml
```

3. Bump version:

```bash
npm run version:bump:patch
# or :minor / :major
```

4. Build desktop bundle:

```bash
npm run build
```

5. Validate app startup and basic generation flow in the packaged app.

## Repository Layout

```text
humanizer/
├── index.html
├── package.json
├── scripts/
│   ├── tauri-runner.mjs
│   ├── openrouter-integration.mjs
│   └── sync-version.mjs
├── src/
│   ├── App.jsx
│   ├── components/
│   ├── constants/
│   ├── lib/
│   ├── styles/
│   ├── test/
│   └── utils/
└── src-tauri/
    ├── src/
    ├── Cargo.toml
    └── tauri.conf.json
```

## Data and Storage

- Frontend state is persisted in browser-like local storage within the desktop webview context.
- Style and history data are backed up through Tauri backend commands.
- Runtime logs and generated local runtime artifacts are ignored via `.gitignore`.

## Security and Operational Notes

- Current Tauri config sets `app.security.csp` to `null`; define a production CSP before hardened enterprise deployment.
- Keep API keys out of git. `.env` and secret artifacts are ignored.
- Do not commit runtime logs or local debug output.

## Testing Status

As of **2026-03-08**:

- `npm run test`: passed (`68/68`)
- `npm run build:web`: passed
- `cargo check`: passed

See [`SYSTEM_AUDIT_REPORT.md`](./SYSTEM_AUDIT_REPORT.md) for release audit details.

## Troubleshooting

### Rust or Tauri command not found

- Ensure Rust is installed and `cargo` is on `PATH`.
- The `scripts/tauri-runner.mjs` script attempts to include `~/.cargo/bin` automatically.

### Desktop app opens but generation fails

- Verify `OPENROUTER_API_KEY` in `.env` for hosted endpoints.
- If using localhost provider, ensure provider is running and `OPENROUTER_API_URL` is correct.
- Run `npm run test:openrouter` to isolate provider connectivity.

### Version mismatch between UI and native app

- Run `npm run version:sync` and commit all versioned files together.

## Contributing

### Workflow

1. Create a feature branch from your main integration branch.
2. Implement changes with focused commits.
3. Run quality checks before opening a PR:

```bash
npm run test
npm run build:web
cargo check --manifest-path src-tauri/Cargo.toml
```

4. If you changed the release version, use the version scripts and commit all synced version files.
5. Open a PR with:
   - summary of behavior changes
   - testing evidence (commands + outcomes)
   - any migration notes

### Code Guidelines

- Keep secrets and local runtime artifacts out of git (`.env`, logs, local data).
- Prefer small, testable units in `src/lib` and `src/utils`.
- Add tests for behavior changes in `src/App.test.jsx` or closest unit test file.
- Preserve desktop-first behavior (Tauri command path and webview constraints).

### PR Checklist

- [ ] Tests pass locally
- [ ] Frontend production build passes
- [ ] Rust/Tauri check passes
- [ ] No secrets or generated runtime files included
- [ ] Version files are synchronized if version changed

## Roadmap

See also: [`ROADMAP.md`](./ROADMAP.md)

### Near Term (Post-v1)

- Add production CSP policy in `src-tauri/tauri.conf.json` (replace `csp: null`).
- Reduce frontend initial bundle size through lazy loading and chunking.
- Expand CI to include Rust/native validation (`cargo check`) on every PR.

### Recently Shipped

- Added local writing-metric engine and before/after scoring across readability and quality metrics.
- Added a consolidated collapsible metrics panel below LLM output.
- Added per-metric hover tooltips, metric icons, and trend-aware color coding.

### Product Enhancements

- Add richer profile controls (more granular tone and domain presets).
- Add user-configurable output presets (create, edit, save, and reuse custom presets).
- Add user-configurable profile save location (choose where profile data is stored/backed up).
- Add optional export/import tooling for local user data portability.
- Add in-place partial regeneration: highlight selected output text and regenerate only that span.
- Add first-class diff checking so users can inspect exact changes between source and generated output.
- Add global availability support (localization, region-aware defaults, and timezone/locale-safe formatting).

### Reliability and Observability

- Harden provider error handling and retry diagnostics.
- Add structured logging controls for debug vs production builds.
- Add release smoke-test automation for packaged app startup and generation flow.

## License

No license file is currently defined in this repository.
