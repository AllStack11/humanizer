import { useState, useEffect, useRef, useCallback } from "react";

// Constants
import {
  MODEL_OPTIONS, BASE_CLICHES, CLICHE_PROMPT,
  TONE_LEVELS, ELAB_DEPTHS,
  WRITER_DRAFT_KEY, STYLE_MODAL_DRAFT_KEY, PRIMARY_PROFILE_ID, MODEL_PREF_KEY, CUSTOM_MODELS_KEY,
  WRITING_SAMPLE_TYPES, DEFAULT_SAMPLE_TYPE, PROFILE_OPTIONS, DEFAULT_SLOTS,
  OUTPUT_PRESET_OPTIONS, APP_THEME_OPTIONS,
} from './constants/index.js';

// Lib
import { isTauriRuntime } from './lib/tauri.js';
import { llm, llmStream } from './lib/api.js';
import {
  load, save, loadStylesBackup, saveStylesBackupRaw,
  loadRequestLogs, clearRequestLogs,
  getApiKeyStatus, storeApiKey, clearStoredApiKey,
  logDiagnosticEvent,
} from './lib/storage.js';
import { STYLE_ANALYZE_SYS, STYLE_MERGE_SYS, HUMANIZE_SYS, ELABORATE_SYS, SPELLCHECK_SYS } from './lib/prompts.js';

// Utils
import {
  countWords, splitSentences, computeReadabilityScore, computeWordCharDelta,
  buildClicheRanges,
  normalizeSampleSlot, normalizeStoredStyles, getFilledSlots, formatSampleForPrompt,
  collectCoverageGaps, computeProfileHealth, hasTrainedProfile,
  getFormatPresetInstruction, formatRelativeTime,
} from './utils/index.js';

// Styles
import { S } from './styles/index.js';

// Components
import GlobalStyles from './components/GlobalStyles.jsx';
import Topbar from './components/Topbar.jsx';
import ControlsBar from './components/ControlsBar.jsx';
import WriterPanel from './components/WriterPanel.jsx';
import OutputPanel from './components/OutputPanel.jsx';
import SpellResultsBar from './components/SpellResultsBar.jsx';
import DiagnosticsPanel from './components/DiagnosticsPanel.jsx';
import StyleModal from './components/StyleModal.jsx';
import ApiKeyModal from './components/ApiKeyModal.jsx';
import LoadingOverlay from './components/LoadingOverlay.jsx';

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  function getErrorMessage(error, fallback = "Unexpected error.") {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === "string" && error.trim()) return error;
    if (error && typeof error === "object") {
      const message = error.message || error.error || error.reason;
      if (typeof message === "string" && message.trim()) return message;
      try { return JSON.stringify(error); } catch {}
    }
    return fallback;
  }

  // Core
  const [styles, setStyles]                     = useState({});
  const [activeProfileId, setActiveProfileId]   = useState(PROFILE_OPTIONS[0].id);
  const [cliches, setCliches]                   = useState(BASE_CLICHES);
  const [clichesUpdatedAt, setClichesUpdatedAt] = useState(null);
  const [clicheFetching, setClicheFetching]     = useState(false);

  // Writer state (unified)
  const [mode, setMode]             = useState("humanize");
  const [inputText, setInputText]   = useState("");
  const [outputText, setOutputText] = useState("");
  const [outputCopied, setOutputCopied] = useState(false);
  const [toneLevel, setToneLevel]   = useState(2);
  const [stripCliches, setStripCliches] = useState(true);
  const [elabDepth, setElabDepth]   = useState(2);
  const [oneOffInstruction, setOneOffInstruction] = useState("");
  const [formatPreset, setFormatPreset] = useState("none");
  const [themeKey, setThemeKey] = useState(APP_THEME_OPTIONS[0].value);
  const [modelOptions, setModelOptions] = useState(MODEL_OPTIONS);
  const [selectedModel, setSelectedModel] = useState(MODEL_OPTIONS[0].value);
  const [logsOpen, setLogsOpen] = useState(false);
  const [requestLogs, setRequestLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [outputHistory, setOutputHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [variants, setVariants] = useState([]);
  const [selectedSentenceIndex, setSelectedSentenceIndex] = useState(null);
  const [showDiff, setShowDiff] = useState(true);

  // Spell check
  const [spellResult, setSpellResult]     = useState(null);
  const [spellLoading, setSpellLoading]   = useState(false);
  const [expandedErrorPill, setExpandedErrorPill] = useState(null);
  const [troubleWords, setTroubleWords]   = useState({});
  const [grammarMode, setGrammarMode] = useState(false);

  // Modals / dropdowns
  const [styleModalOpen, setStyleModalOpen]   = useState(false);
  const backupSyncReadyRef = useRef(false);

  // Backup status
  const [backupStatus, setBackupStatus]         = useState("idle");
  const [backupLastSavedAt, setBackupLastSavedAt] = useState(null);
  const [backupError, setBackupError]           = useState("");
  const [, forceTickRender]                     = useState(0);

  // Async feedback
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState("");
  const [error, setError]     = useState("");
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [apiKeyRequired, setApiKeyRequired] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeySaving, setApiKeySaving] = useState(false);

  // Load persisted data
  useEffect(() => {
    (async () => {
      try {
        logDiagnosticEvent("app:init:start", {
          runtime: isTauriRuntime() ? "tauri" : "web",
          defaultActiveProfileId: PROFILE_OPTIONS[0].id,
          defaultTheme: APP_THEME_OPTIONS[0].value,
          defaultModel: MODEL_OPTIONS[0].value,
        }).catch(() => {});

        const storedStyles  = await load("styles-v3");
        const storedCliches = await load("cliches-v3");
        const storedTs      = await load("cliches-ts-v3");
        const storedTrouble = await load("trouble-words-v1");
        const storedWriterDraft = await load(WRITER_DRAFT_KEY);
        const storedModel = await load(MODEL_PREF_KEY);
        const storedCustomModels = await load(CUSTOM_MODELS_KEY);
        let stylesSource = "localStorage";
        let resolvedStyles = storedStyles ? normalizeStoredStyles(storedStyles) : {};
        if (!Object.keys(resolvedStyles).length) {
          stylesSource = "backup";
          const backupStyles = await loadStylesBackup();
          if (backupStyles) {
            resolvedStyles = normalizeStoredStyles(backupStyles);
            if (Object.keys(resolvedStyles).length) await save("styles-v3", resolvedStyles);
          }
          if (!Object.keys(resolvedStyles).length) stylesSource = "empty";
        }

        setStyles(resolvedStyles);
        const trainedProfiles = Object.values(resolvedStyles).filter((profile) => hasTrainedProfile(profile));
        if (!trainedProfiles.length) {
          setStyleModalOpen(true);
        } else if (!resolvedStyles[activeProfileId]) {
          setActiveProfileId(trainedProfiles[0]?.id || PROFILE_OPTIONS[0].id);
        }

        logDiagnosticEvent("app:init:profiles_loaded", {
          source: stylesSource,
          activeProfileId,
          profileIds: Object.keys(resolvedStyles),
          profileCount: Object.keys(resolvedStyles).length,
          trainedProfileCount: trainedProfiles.length,
          untrainedProfileCount: Object.keys(resolvedStyles).length - trainedProfiles.length,
        }).catch(() => {});

        if (storedCliches) setCliches(storedCliches);
        if (storedTs)      setClichesUpdatedAt(new Date(storedTs));
        if (storedTrouble) setTroubleWords(storedTrouble);
        if (typeof storedWriterDraft === "string") setInputText(storedWriterDraft);
        const validCustomModels = Array.isArray(storedCustomModels)
          ? storedCustomModels
            .filter((item) => item && typeof item.value === "string" && item.value.trim())
            .map((item) => ({ value: item.value.trim(), label: typeof item.label === "string" && item.label.trim() ? item.label.trim() : item.value.trim() }))
          : [];

        const mergedModelOptions = [...MODEL_OPTIONS];
        validCustomModels.forEach((custom) => {
          if (!mergedModelOptions.some((entry) => entry.value === custom.value)) {
            mergedModelOptions.push(custom);
          }
        });

        if (typeof storedModel === "string" && storedModel.trim() && !mergedModelOptions.some((item) => item.value === storedModel.trim())) {
          mergedModelOptions.push({ value: storedModel.trim(), label: `${storedModel.trim()} (custom)` });
        }

        setModelOptions(mergedModelOptions);
        if (typeof storedModel === "string" && storedModel.trim()) setSelectedModel(storedModel.trim());

        const stale = !storedTs || (Date.now() - new Date(storedTs)) > 3 * 86400000;
        if (stale) refreshCliches();

        let hasKey = null;
        let apiKeySource = isTauriRuntime() ? "missing" : "web";
        if (isTauriRuntime()) {
          try {
            const keyStatus = await getApiKeyStatus();
            hasKey = keyStatus.hasKey;
            apiKeySource = keyStatus.source;
            if (!hasKey) {
              setApiKeyRequired(true);
              setApiKeyModalOpen(true);
            }
          } catch {}
        }

        logDiagnosticEvent("app:init:config_loaded", {
          selectedModel: (typeof storedModel === "string" && storedModel.trim()) ? storedModel : MODEL_OPTIONS[0].value,
          clichesLoaded: Array.isArray(storedCliches) ? storedCliches.length : 0,
          clichesUpdatedAt: storedTs || null,
          writerDraftChars: typeof storedWriterDraft === "string" ? storedWriterDraft.length : 0,
          troubleWordsCount: storedTrouble ? Object.keys(storedTrouble).length : 0,
          apiKeyPresent: hasKey,
          apiKeySource,
          clichesRefreshTriggered: stale,
        }).catch(() => {});
      } catch (error) {
        logDiagnosticEvent("app:init:failed", {}, "failed", {
          error: getErrorMessage(error),
        }).catch(() => {});
        setError(`Initialization failed: ${getErrorMessage(error)}`);
      } finally {
        backupSyncReadyRef.current = true;
      }
    })();
  }, []);

  useEffect(() => {
    if (!styles || typeof styles !== "object") return;
    const ids = Object.keys(styles);
    if (!ids.length) return;
    logDiagnosticEvent("app:profile:active_changed", {
      activeProfileId,
      availableProfileIds: ids,
      hasActiveProfileData: !!styles[activeProfileId],
    }).catch(() => {});
  }, [activeProfileId, styles]);

  async function saveStylesBackupWithRetry(stylesData) {
    const DELAYS = [1000, 2000, 4000];
    setBackupStatus("saving");
    setBackupError("");
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        setBackupStatus("retrying");
        await new Promise(r => setTimeout(r, DELAYS[attempt - 1]));
      }
      try {
        await saveStylesBackupRaw(stylesData);
        setBackupStatus("ok");
        setBackupLastSavedAt(new Date());
        setBackupError("");
        return;
      } catch (err) {
        if (attempt === 2) {
          setBackupStatus("error");
          setBackupError(getErrorMessage(err, "Backup failed"));
        }
      }
    }
  }

  useEffect(() => {
    save("styles-v3", styles);
    if (!backupSyncReadyRef.current) return;
    saveStylesBackupWithRetry(styles);
  }, [styles]);

  useEffect(() => {
    if (backupStatus !== "ok") return;
    const id = setInterval(() => forceTickRender(n => n + 1), 30000);
    return () => clearInterval(id);
  }, [backupStatus, backupLastSavedAt]);
  useEffect(() => { save(MODEL_PREF_KEY, selectedModel); }, [selectedModel]);
  useEffect(() => {
    const customOnly = modelOptions.filter((entry) => !MODEL_OPTIONS.some((base) => base.value === entry.value));
    save(CUSTOM_MODELS_KEY, customOnly);
  }, [modelOptions]);
  useEffect(() => { save(WRITER_DRAFT_KEY, inputText); }, [inputText]);
  useEffect(() => { if (Object.keys(troubleWords).length) save("trouble-words-v1", troubleWords); }, [troubleWords]);

  function addCustomModelFromDropdown() {
    const raw = window.prompt("Enter OpenRouter model id (example: openai/gpt-4o-mini)");
    const value = raw?.trim();
    if (!value) return;

    if (modelOptions.some((entry) => entry.value === value)) {
      setSelectedModel(value);
      setStatus("Model already exists. Switched to it.");
      setTimeout(() => setStatus(""), 1200);
      return;
    }

    const labelRaw = window.prompt("Optional display name for this model", value);
    const label = labelRaw?.trim() || value;
    const next = [...modelOptions, { value, label }];
    setModelOptions(next);
    setSelectedModel(value);
    setStatus("Custom model added.");
    setTimeout(() => setStatus(""), 1200);
  }

  useEffect(() => {
    if (!logsOpen) return;
    let cancelled = false;
    let timer = null;
    const tick = async () => {
      if (cancelled) return;
      setLogsLoading(true);
      const logs = await loadRequestLogs();
      if (!cancelled) {
        setRequestLogs(logs);
        setLogsLoading(false);
      }
      if (!cancelled) timer = setTimeout(tick, 2500);
    };
    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [logsOpen]);

  // ── Profile export / import ──
  function exportProfile() {
    const blob = new Blob(
      [JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), styles }, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: "writing-profile-backup.json" });
    a.click();
    URL.revokeObjectURL(url);
  }

  function importProfile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        const rawStyles = parsed?.styles || parsed;
        const normalized = normalizeStoredStyles(rawStyles);
        if (!Object.keys(normalized).length) { setError("Import failed: no valid profile found."); return; }
        setStyles(normalized);
      } catch { setError("Import failed: invalid JSON file."); }
    };
    reader.readAsText(file);
  }

  async function saveApiKey() {
    const key = apiKeyInput.trim();
    if (!key) {
      setError("Enter your OpenRouter API key.");
      return;
    }
    setApiKeySaving(true);
    setError("");
    try {
      await storeApiKey(key);
      setApiKeyRequired(false);
      setApiKeyModalOpen(false);
      setApiKeyInput("");
      setStatus("API key saved.");
      setTimeout(() => setStatus(""), 1200);
    } catch (e) {
      setError("Failed to save API key: " + getErrorMessage(e));
    } finally {
      setApiKeySaving(false);
    }
  }

  async function removeApiKey() {
    setApiKeySaving(true);
    setError("");
    try {
      await clearStoredApiKey();
      setApiKeyRequired(true);
      setApiKeyModalOpen(true);
      setStatus("API key removed.");
      setTimeout(() => setStatus(""), 1200);
    } catch (e) {
      setError("Failed to clear API key: " + getErrorMessage(e));
    } finally {
      setApiKeySaving(false);
    }
  }

  // ── Clichés ──
  async function refreshCliches() {
    setClicheFetching(true);
    try {
      const raw = await llm("", CLICHE_PROMPT, 800, selectedModel);
      const fresh = JSON.parse(raw.replace(/```json|```/g,"").trim());
      if (Array.isArray(fresh) && fresh.length > 20) {
        const merged = [...new Set([...BASE_CLICHES, ...fresh])];
        setCliches(merged); const now = new Date(); setClichesUpdatedAt(now);
        await save("cliches-v3", merged); await save("cliches-ts-v3", now.toISOString());
      }
    } catch {}
    setClicheFetching(false);
  }

  // ── Profile onboarding / evolution ──
  async function trainProfile(slots) {
    const filled = getFilledSlots(slots);
    if (!filled.length) { setError("Add writing samples (50+ chars each)."); return false; }

    const existing = styles[activeProfileId];
    const selectedProfile = PROFILE_OPTIONS.find((profile) => profile.id === activeProfileId);
    const profileName = selectedProfile?.label || "Custom";
    setError("");
    setLoading(true);
    setStatus(existing ? `Merging new samples into ${profileName} profile…` : `Analyzing ${profileName} profile…`);

    try {
      const formatted = filled.map((sample, i) => formatSampleForPrompt(sample, i)).join("\n\n");
      const raw = existing
        ? await llm(STYLE_MERGE_SYS, `Existing profile:\n${JSON.stringify(existing.profile, null, 2)}\n\nNew samples:\n${formatted}`, 1400, selectedModel)
        : await llm(STYLE_ANALYZE_SYS, `Analyze:\n\n${formatted}`, 1400, selectedModel);
      const profile = JSON.parse(raw.replace(/```json|```/g,"").trim());

      setStyles(prev => {
        const existingProfile = prev[activeProfileId];
        const existingSamples = existingProfile
          ? (Array.isArray(existingProfile.sampleEntries)
              ? existingProfile.sampleEntries.map((sample, i) => normalizeSampleSlot(sample, i + 1))
              : (Array.isArray(existingProfile.samples) ? existingProfile.samples : []).map((text, i) => normalizeSampleSlot({ id: i + 1, text }, i + 1)))
          : [];
        const sampleEntries = [...existingSamples, ...filled];
        const createdAt = existingProfile?.createdAt || new Date().toISOString();

        return {
          ...prev,
          [activeProfileId]: {
            id: activeProfileId,
            name: profileName,
            profile,
            sampleEntries,
            samples: sampleEntries.map(sample => sample.text),
            sampleCount: sampleEntries.length,
            createdAt,
            updatedAt: new Date().toISOString(),
          }
        };
      });

      setStatus(existing ? "Profile updated!" : "Profile created!");
      setTimeout(() => { setStatus(""); setStyleModalOpen(false); }, 900);
      return true;
    } catch (e) {
      setError("Failed: " + getErrorMessage(e));
      return false;
    } finally {
      setLoading(false);
    }
  }

  function applyPromptDecorators(systemPrompt) {
    const presetInstruction = getFormatPresetInstruction(formatPreset);
    const extras = [presetInstruction, oneOffInstruction.trim()].filter(Boolean);
    if (!extras.length) return systemPrompt;
    return `${systemPrompt}\n\nExtra constraints:\n- ${extras.join("\n- ")}`;
  }

  function commitOutput(nextOutput) {
    setOutputText(nextOutput);
    setVariants([]);
    setSelectedSentenceIndex(null);
    setOutputHistory((prev) => {
      const nextHistory = [...prev, nextOutput];
      setHistoryIndex(nextHistory.length - 1);
      return nextHistory;
    });
  }

  // ── Humanize ──
  async function humanize() {
    const activeProfile = styles[activeProfileId];
    if (!activeProfile) { setError("Onboard your writing profile first."); return; }
    if (inputText.trim().length < 20) { setError("Paste some text to humanize (20+ chars)."); return; }
    setError(""); setLoading(true); setStatus("Rewriting in your voice…");
    try {
      setOutputText("");
      setVariants([]);
      const out = await llmStream(
        applyPromptDecorators(HUMANIZE_SYS(activeProfile.profile, toneLevel, stripCliches ? cliches : BASE_CLICHES.slice(0,10))),
        `Rewrite:\n\n${inputText}`,
        (_, full) => setOutputText(full),
        1400,
        selectedModel
      );
      commitOutput(out);
      setStatus("");
    } catch (e) { setError("Failed: " + getErrorMessage(e)); }
    finally { setLoading(false); }
  }

  // ── Elaborate ──
  async function elaborate() {
    const activeProfile = styles[activeProfileId];
    if (!activeProfile) { setError("Onboard your writing profile first."); return; }
    if (inputText.trim().length < 10) { setError("Write something to elaborate on."); return; }
    setError(""); setLoading(true); setStatus("Expanding your writing…");
    try {
      setOutputText("");
      setVariants([]);
      const out = await llmStream(
        applyPromptDecorators(ELABORATE_SYS(activeProfile.profile, toneLevel, elabDepth)),
        `Elaborate on:\n\n${inputText}`,
        (_, full) => setOutputText(full),
        1400,
        selectedModel
      );
      commitOutput(out);
      setStatus("");
    } catch (e) { setError("Failed: " + getErrorMessage(e)); }
    finally { setLoading(false); }
  }

  async function generateVariants() {
    const activeProfile = styles[activeProfileId];
    if (!activeProfile || !outputText.trim()) return;
    setError("");
    setLoading(true);
    setStatus("Generating variants…");
    try {
      const raw = await llm(
        applyPromptDecorators(HUMANIZE_SYS(activeProfile.profile, toneLevel, stripCliches ? cliches : BASE_CLICHES.slice(0, 10))),
        `Create exactly 3 rewrite variants of this text.\nReturn ONLY JSON array of strings.\n\nText:\n${inputText}`,
        1600,
        selectedModel
      );
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      const cleaned = Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string" && item.trim()) : [];
      setVariants(cleaned.slice(0, 3));
      setStatus("");
    } catch (e) {
      setError(`Failed to generate variants: ${getErrorMessage(e)}`);
    } finally {
      setLoading(false);
    }
  }

  async function rewriteSentence() {
    const activeProfile = styles[activeProfileId];
    const sentences = splitSentences(outputText);
    if (!activeProfile || selectedSentenceIndex == null || !sentences[selectedSentenceIndex]) return;
    setLoading(true);
    setStatus("Rewriting selected sentence…");
    setError("");
    try {
      const target = sentences[selectedSentenceIndex];
      const rewritten = await llm(
        applyPromptDecorators(HUMANIZE_SYS(activeProfile.profile, toneLevel, stripCliches ? cliches : BASE_CLICHES.slice(0, 10))),
        `Rewrite only this sentence while preserving meaning:\n${target}`,
        400,
        selectedModel
      );
      sentences[selectedSentenceIndex] = rewritten.trim();
      commitOutput(sentences.join(" "));
      setStatus("");
    } catch (e) {
      setError(`Failed to rewrite sentence: ${getErrorMessage(e)}`);
    } finally {
      setLoading(false);
    }
  }

  function applyVariant(variantText) {
    if (!variantText) return;
    commitOutput(variantText);
  }

  // ── Spell Check ──
  async function checkSpelling() {
    if (inputText.trim().length < 3) { setError("Type some text to check."); return; }
    setError(""); setSpellLoading(true); setSpellResult(null); setExpandedErrorPill(null);
    try {
      const raw = await llm(SPELLCHECK_SYS(grammarMode), `Check this text:\n\n${inputText}`, 1400, selectedModel);
      const parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());
      setSpellResult(parsed);
      if (parsed.errors?.length) {
        setTroubleWords(prev => {
          const updated = { ...prev };
          parsed.errors.forEach(e => {
            const key = e.wrong.toLowerCase();
            updated[key] = { correct: e.correct, wrong: e.wrong, rule: e.rule, trick: e.trick, etymology: e.etymology, category: e.category, count: (prev[key]?.count || 0) + 1, lastSeen: new Date().toISOString() };
          });
          return updated;
        });
      }
    } catch (e) { setError("Spell check failed: " + getErrorMessage(e)); }
    finally { setSpellLoading(false); }
  }

  function copy(text, setFn) { navigator.clipboard.writeText(text); setFn(true); setTimeout(() => setFn(false), 2000); }

  const activeProfile = styles[activeProfileId] || null;
  const hasProfile = hasTrainedProfile(activeProfile);
  const health = computeProfileHealth(activeProfile);
  const clicheRanges = buildClicheRanges(inputText, cliches);
  const words = countWords(inputText);
  const sentenceOptions = splitSentences(outputText);

  const handleInputChange = (val) => {
    setInputText(val);
    setOutputText("");
    setVariants([]);
    setSelectedSentenceIndex(null);
    setSpellResult(null);
    setExpandedErrorPill(null);
  };

  const handleModeChange = (m) => {
    setMode(m);
    setOutputText("");
    setVariants([]);
    setSelectedSentenceIndex(null);
    setSpellResult(null);
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.metaKey && event.key === "Enter") {
        event.preventDefault();
        if (mode === "humanize") humanize();
        else elaborate();
      }
      if (event.metaKey && event.shiftKey && event.key.toLowerCase() === "c" && outputText) {
        event.preventDefault();
        copy(outputText, setOutputCopied);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, outputText, inputText, styles, activeProfileId, toneLevel, stripCliches, cliches, selectedModel, elabDepth, oneOffInstruction, formatPreset]);

  function goHistory(offset) {
    const nextIndex = historyIndex + offset;
    if (nextIndex < 0 || nextIndex >= outputHistory.length) return;
    setHistoryIndex(nextIndex);
    setOutputText(outputHistory[nextIndex]);
    setSelectedSentenceIndex(null);
  }

  const activeTheme = APP_THEME_OPTIONS.find((theme) => theme.value === themeKey) || APP_THEME_OPTIONS[0];

  return (
    <div style={{ ...S.root, "--accent": activeTheme.accent }} data-theme={activeTheme.value}>
      <GlobalStyles accent={activeTheme.accent} />

      <Topbar
        activeProfileId={activeProfileId}
        onProfileChange={setActiveProfileId}
        themeKey={themeKey}
        onThemeChange={setThemeKey}
        hasProfile={hasProfile}
        activeProfile={activeProfile}
        health={health}
        backupStatus={backupStatus}
        backupLastSavedAt={backupLastSavedAt}
        backupError={backupError}
        onRetryBackup={() => saveStylesBackupWithRetry(styles)}
        clichesUpdatedAt={clichesUpdatedAt}
        cliches={cliches}
        onRefreshCliches={refreshCliches}
        clicheFetching={clicheFetching}
        onOpenStyleModal={() => setStyleModalOpen(true)}
        onExportProfile={exportProfile}
        onImportProfile={importProfile}
        onOpenApiKey={() => setApiKeyModalOpen(true)}
      />

      <main style={S.main}>

        {/* Toasts */}
        {error && (
          <div style={{ ...S.toast, ...S.toastError }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span style={{ flex: 1 }}>{error}</span>
            <button onClick={() => setError("")} style={S.toastClose}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}
        {status && !loading && (
          <div style={{ ...S.toast, ...S.toastSuccess }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            {status}
          </div>
        )}

        <ControlsBar
          mode={mode}
          onModeChange={handleModeChange}
          modelOptions={modelOptions}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          onAddModel={addCustomModelFromDropdown}
          toneLevel={toneLevel}
          onToneLevelChange={setToneLevel}
          stripCliches={stripCliches}
          onStripClichesChange={setStripCliches}
          elabDepth={elabDepth}
          onElabDepthChange={setElabDepth}
          formatPreset={formatPreset}
          onFormatPresetChange={setFormatPreset}
          oneOffInstruction={oneOffInstruction}
          onOneOffInstructionChange={setOneOffInstruction}
        />

        {!!health.missingTypes.length && (
          <div style={{ ...S.ctrlLabel, marginBottom: 12 }}>
            Coverage gaps: {health.missingTypes.join(", ")}
          </div>
        )}

        <WriterPanel
          inputText={inputText}
          onChange={handleInputChange}
          mode={mode}
          spellErrors={spellResult?.errors || []}
          loading={loading}
          spellLoading={spellLoading}
          grammarMode={grammarMode}
          onGrammarModeChange={setGrammarMode}
          hasStyle={hasProfile}
          words={words}
          clicheRanges={clicheRanges}
          onCheckSpelling={checkSpelling}
          onSubmit={mode === "humanize" ? humanize : elaborate}
        />

        {spellResult && (
          <SpellResultsBar
            spellResult={spellResult}
            expandedPill={expandedErrorPill}
            onExpandPill={setExpandedErrorPill}
            onUseCorrection={() => { setInputText(spellResult.correctedText); setSpellResult(null); setExpandedErrorPill(null); }}
            onDismiss={() => { setSpellResult(null); setExpandedErrorPill(null); }}
          />
        )}

        {outputText && (
          <OutputPanel
            mode={mode}
            originalText={inputText}
            outputText={outputText}
            elabDepth={elabDepth}
            copied={outputCopied}
            variants={variants}
            sentenceOptions={sentenceOptions}
            selectedSentenceIndex={selectedSentenceIndex}
            onSelectSentence={setSelectedSentenceIndex}
            onRewriteSentence={rewriteSentence}
            onGenerateVariants={generateVariants}
            onApplyVariant={applyVariant}
            showDiff={showDiff}
            onToggleDiff={() => setShowDiff((value) => !value)}
            readabilityBefore={computeReadabilityScore(inputText)}
            readabilityAfter={computeReadabilityScore(outputText)}
            delta={computeWordCharDelta(inputText, outputText)}
            historyIndex={historyIndex}
            historySize={outputHistory.length}
            onHistoryPrev={() => goHistory(-1)}
            onHistoryNext={() => goHistory(1)}
            onCopy={() => copy(outputText, setOutputCopied)}
            onAppend={() => { setInputText(inputText + " " + outputText); setOutputText(""); }}
            onDiscard={() => setOutputText("")}
          />
        )}

        <DiagnosticsPanel
          logsOpen={logsOpen}
          onToggle={(e) => setLogsOpen(e.currentTarget.open)}
          requestLogs={requestLogs}
          logsLoading={logsLoading}
          onRefresh={async () => setRequestLogs(await loadRequestLogs())}
          onClear={async () => { await clearRequestLogs(); setRequestLogs([]); }}
        />

      </main>

      {styleModalOpen && (
        <StyleModal
          hasProfile={hasProfile}
          loading={loading}
          onTrainProfile={trainProfile}
          onClose={() => setStyleModalOpen(false)}
        />
      )}

      {apiKeyModalOpen && isTauriRuntime() && (
        <ApiKeyModal
          required={apiKeyRequired}
          value={apiKeyInput}
          loading={apiKeySaving}
          onChange={setApiKeyInput}
          onSave={saveApiKey}
          onClear={removeApiKey}
          onClose={() => { if (!apiKeyRequired) setApiKeyModalOpen(false); }}
        />
      )}

      {loading && <LoadingOverlay status={status} />}
    </div>
  );
}

// ─── Re-exports for test compatibility ────────────────────────────────────────
export {
  buildClicheRanges,
  buildDiffSegments,
  buildMirrorSegments,
  collectCoverageGaps,
  computeProfileHealth,
  computeReadabilityScore,
  computeWordCharDelta,
  countWords,
  formatSampleForPrompt,
  getFormatPresetInstruction,
  getFilledSlots,
  normalizeSampleSlot,
  normalizeStoredStyles,
  splitSentences,
} from './utils/index.js';

export { extractStreamTextChunk } from './lib/api.js';
