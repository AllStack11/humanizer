# Voice Humanizer — Local Setup

Desktop-only app via Tauri (macOS/Windows). No browser app entrypoint.

---

## Requirements

- [Rust](https://www.rust-lang.org/tools/install) (for Tauri desktop build/dev)
- Node.js + npm
- An OpenRouter API key

---

## Setup

```bash
# 1. Install deps
npm install

# 2. Create .env from the template and set your key
cp .env.example .env
# then edit .env and set OPENROUTER_API_KEY
# optional: OPENROUTER_CATEGORIES

# 3. Start desktop app
npm run dev
```

Build desktop app bundle:
```bash
npm run build
```

---

## How it works

Tauri frontend calls Rust commands directly. Rust handles OpenRouter requests, local backup storage, and request logs.
In desktop mode, your OpenRouter API key is saved in the OS keychain (first run prompts for key).
`.env` key loading is only used as a local debug fallback.

---

## Data

Your writing data is kept locally in:
- App `localStorage` (primary runtime store)
- On-device backup file in the Tauri app data directory (`writer-style-backup.json`)

On startup, if `localStorage` has no styles, the app restores from the backup file automatically.
Nothing leaves your machine except API calls to OpenRouter.

---

## Files

```
humanizer/
├── src-tauri/        ← Tauri Rust backend
├── vite.config.js    ← frontend build/test config
├── index.html
└── src/
    ├── main.jsx      ← React entry
    └── App.jsx       ← Full application
```
