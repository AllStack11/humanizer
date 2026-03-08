# Roadmap

Last updated: 2026-03-08

## Recently Shipped

- Added local writing-metric engine with before/after scoring for:
  - readability
  - FKGL / Gunning Fog / SMOG / Coleman-Liau / ARI
  - lexical diversity
  - sentence complexity (average length + variance)
  - passive voice ratio
  - filler density
  - repetition score
  - concreteness score
- Added a consolidated collapsible metrics panel directly under LLM output.
- Added per-metric hover tooltips, metric icons, and trend color coding.

## Near Term

- Add production CSP policy in `src-tauri/tauri.conf.json` (replace `csp: null`).
- Reduce frontend initial bundle size through lazy loading and chunking.
- Expand CI to include Rust/native validation (`cargo check`) on every PR.

## Product Enhancements

- Add richer profile controls (more granular tone and domain presets).
- Add user-configurable output presets (create, edit, save, and reuse custom presets).
- Add user-configurable profile save location (choose where profile data is stored/backed up).
- Add optional export/import tooling for local user data portability.
- Add in-place partial regeneration: highlight selected output text and regenerate only that span.
- Add first-class diff checking so users can inspect exact changes between source and generated output.
- Add global availability support (localization, region-aware defaults, and timezone/locale-safe formatting).

## Reliability and Observability

- Harden provider error handling and retry diagnostics.
- Add structured logging controls for debug vs production builds.
- Add release smoke-test automation for packaged app startup and generation flow.
