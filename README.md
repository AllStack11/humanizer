# Voice Humanizer — Local Setup

Desktop-only app via Tauri (macOS/Windows). No browser app entrypoint.

---

## Requirements

- [Rust](https://www.rust-lang.org/tools/install) (for Tauri desktop build/dev)
- Node.js + npm
- An OpenRouter API key (only for hosted endpoints)

---

## Setup

```bash
# 1. Install deps
npm install

# 2. Create .env from the template and set your key
cp .env.example .env
# then edit .env and set OPENROUTER_API_KEY (for hosted endpoints)
# optional: OPENROUTER_CATEGORIES
# optional: OPENROUTER_API_KEY_FILE for custom secret file location

# 3. Start desktop app
npm run dev
```

Use local Ollama (no API key):
```bash
# Start Ollama separately and pull a model first, e.g.:
# ollama pull qwen2.5:7b

# In .env:
OPENROUTER_API_URL=http://localhost:11434/v1/chat/completions
OPENROUTER_APP_URL=http://localhost:5173
OPENROUTER_APP_NAME=Voice Humanizer
# OPENROUTER_API_KEY can be empty when using localhost endpoint
```

OpenRouter integration smoke test (non-stream + streaming):
```bash
npm run test:openrouter
# optional override:
# OPENROUTER_TEST_MODEL=meta-llama/llama-3.2-3b-instruct:free npm run test:openrouter
```

Build desktop app bundle:
```bash
npm run build
```

---

## How it works

Tauri frontend calls Rust commands directly. Rust handles OpenRouter requests, local backup storage, and request logs.
In desktop mode, your OpenRouter API key is saved in a local secret file (configurable with `OPENROUTER_API_KEY_FILE`).
`.env` loading is also supported for local/dev workflows.
Provider URL and key-file path are also configurable in-app via the `API Key` modal.

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
