import { load, save } from "./storage.js";
import { ELAB_DEPTHS, OUTPUT_PRESET_OPTIONS, TONE_LEVELS } from "../constants/index.js";

export const OUTPUT_HISTORY_KEY = "output-history-v2";
export const OUTPUT_HISTORY_VERSION = 2;
export const OUTPUT_HISTORY_UNSAVED_LIMIT = 50;

const PRESET_LABEL_BY_VALUE = OUTPUT_PRESET_OPTIONS.reduce((map, option) => {
  if (!option?.value) return map;
  map[option.value] = option.label;
  return map;
}, {});

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeSourceText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

export function buildSessionThreadKey({ profileId, mode, sourceText }) {
  return [profileId || "unknown"].join("::");
}

export function buildHistoryTitle(sourceText, outputText) {
  const sample = normalizeSourceText(outputText) || normalizeSourceText(sourceText);
  return sample ? sample.slice(0, 72) : "Untitled output";
}

export function buildHistoryUserSegments(entry) {
  if (!entry || typeof entry !== "object") {
    return {
      sourceText: "",
      extraDirection: "",
      regenerateFeedback: "",
    };
  }

  return {
    sourceText: typeof entry.sourceText === "string" ? entry.sourceText.trim() : "",
    extraDirection: typeof entry.extraDirection === "string"
      ? entry.extraDirection.trim()
      : (typeof entry.oneOffInstruction === "string" ? entry.oneOffInstruction.trim() : ""),
    regenerateFeedback: typeof entry.regenerateFeedback === "string" ? entry.regenerateFeedback.trim() : "",
  };
}

export function buildHistorySearchText(entry) {
  const presetLabel = getHistoryPresetLabel(entry);
  const depthLabel = getHistoryDepthLabel(entry);
  const toneLabel = getHistoryToneLabel(entry);
  const generationTypeLabel = getHistoryGenerationTypeLabel(entry);
  return [
    entry.title,
    buildHistoryUserText(entry),
    entry.baseOutputText,
    entry.currentOutputText,
    entry.oneOffInstruction,
    entry.extraDirection,
    entry.regenerateFeedback,
    entry.formatPreset,
    entry.toneLevel,
    presetLabel,
    depthLabel,
    toneLabel,
    generationTypeLabel,
    entry.model,
    entry.mode,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

export function getHistoryPresetLabel(entry) {
  const value = typeof entry?.formatPreset === "string" ? entry.formatPreset : "none";
  return PRESET_LABEL_BY_VALUE[value] || PRESET_LABEL_BY_VALUE.none || "No preset";
}

export function getHistoryDepthLabel(entry) {
  const fallbackIndex = 2;
  const rawDepth = Number.isFinite(entry?.elabDepth) ? Number(entry.elabDepth) : fallbackIndex;
  const clampedDepth = Math.max(0, Math.min(rawDepth, ELAB_DEPTHS.length - 1));
  return ELAB_DEPTHS[clampedDepth]?.label || ELAB_DEPTHS[fallbackIndex]?.label || "Standard";
}

export function getHistoryToneLabel(entry) {
  const fallbackIndex = 2;
  const rawTone = Number.isFinite(entry?.toneLevel) ? Number(entry.toneLevel) : fallbackIndex;
  const clampedTone = Math.max(0, Math.min(rawTone, TONE_LEVELS.length - 1));
  return TONE_LEVELS[clampedTone]?.label || TONE_LEVELS[fallbackIndex]?.label || "Balanced";
}

export function getHistoryGenerationTypeLabel(entry) {
  return entry?.mode === "elaborate" ? "Elaborate" : "Humanize";
}

export function createEmptyOutputHistory() {
  return {
    version: OUTPUT_HISTORY_VERSION,
    entriesById: {},
    sessionsById: {},
    globalEntryOrder: [],
  };
}

function normalizeEntry(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = typeof raw.id === "string" && raw.id ? raw.id : createId("entry");
  return {
    id,
    sessionId: typeof raw.sessionId === "string" ? raw.sessionId : "",
    profileId: typeof raw.profileId === "string" ? raw.profileId : "",
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : (typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString()),
    mode: raw.mode === "elaborate" ? "elaborate" : "humanize",
    model: typeof raw.model === "string" ? raw.model : "",
    sourceText: typeof raw.sourceText === "string" ? raw.sourceText : "",
    extraDirection: typeof raw.extraDirection === "string" ? raw.extraDirection : "",
    regenerateFeedback: typeof raw.regenerateFeedback === "string" ? raw.regenerateFeedback : "",
    baseOutputText: typeof raw.baseOutputText === "string" ? raw.baseOutputText : "",
    currentOutputText: typeof raw.currentOutputText === "string" ? raw.currentOutputText : "",
    oneOffInstruction: typeof raw.oneOffInstruction === "string" ? raw.oneOffInstruction : "",
    formatPreset: typeof raw.formatPreset === "string" ? raw.formatPreset : "none",
    toneLevel: Number.isFinite(raw.toneLevel) ? raw.toneLevel : 2,
    stripCliches: typeof raw.stripCliches === "boolean" ? raw.stripCliches : true,
    elabDepth: Number.isFinite(raw.elabDepth) ? raw.elabDepth : 2,
    status: typeof raw.status === "string" ? raw.status : "ready",
    title: typeof raw.title === "string" && raw.title.trim()
      ? raw.title.trim()
      : buildHistoryTitle(raw.sourceText, raw.currentOutputText || raw.baseOutputText),
    searchText: typeof raw.searchText === "string" ? raw.searchText : "",
    isSaved: typeof raw.isSaved === "boolean" ? raw.isSaved : false,
    savedAt: typeof raw.savedAt === "string" ? raw.savedAt : null,
  };
}

export function buildHistoryUserText(entry) {
  const { sourceText, extraDirection, regenerateFeedback } = buildHistoryUserSegments(entry);
  const parts = [sourceText];
  if (extraDirection) parts.push(`Extra direction:\n${extraDirection}`);
  if (regenerateFeedback) parts.push(`Regeneration feedback:\n${regenerateFeedback}`);
  return parts.filter(Boolean).join("\n\n").trim();
}

function normalizeSession(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = typeof raw.id === "string" && raw.id ? raw.id : createId("session");
  return {
    id,
    profileId: typeof raw.profileId === "string" ? raw.profileId : "",
    startedAt: typeof raw.startedAt === "string" ? raw.startedAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : (typeof raw.startedAt === "string" ? raw.startedAt : new Date().toISOString()),
    mode: raw.mode === "elaborate" ? "elaborate" : "humanize",
    sourceTextSnapshot: typeof raw.sourceTextSnapshot === "string" ? raw.sourceTextSnapshot : "",
    threadKey: typeof raw.threadKey === "string" ? raw.threadKey : buildSessionThreadKey({
      profileId: raw.profileId,
      mode: raw.mode,
      sourceText: raw.sourceTextSnapshot,
    }),
    entryIds: Array.isArray(raw.entryIds) ? raw.entryIds.filter((item) => typeof item === "string") : [],
    activeEntryId: typeof raw.activeEntryId === "string" ? raw.activeEntryId : null,
  };
}

export function normalizeOutputHistory(raw) {
  const base = createEmptyOutputHistory();
  if (!raw || typeof raw !== "object") return base;

  const entriesById = {};
  Object.entries(raw.entriesById || {}).forEach(([id, value]) => {
    const normalized = normalizeEntry({ ...value, id });
    if (!normalized) return;
    normalized.searchText = buildHistorySearchText(normalized);
    entriesById[normalized.id] = normalized;
  });

  const sessionsById = {};
  Object.entries(raw.sessionsById || {}).forEach(([id, value]) => {
    const normalized = normalizeSession({ ...value, id });
    if (!normalized) return;
    normalized.entryIds = normalized.entryIds.filter((entryId) => entriesById[entryId]);
    if (normalized.activeEntryId && !entriesById[normalized.activeEntryId]) {
      normalized.activeEntryId = normalized.entryIds[normalized.entryIds.length - 1] || null;
    }
    sessionsById[normalized.id] = normalized;
  });

  const globalEntryOrder = Array.isArray(raw.globalEntryOrder)
    ? raw.globalEntryOrder.filter((entryId) => entriesById[entryId])
    : Object.keys(entriesById).sort((a, b) => {
      return new Date(entriesById[b].createdAt).getTime() - new Date(entriesById[a].createdAt).getTime();
    });

  return {
    version: OUTPUT_HISTORY_VERSION,
    entriesById,
    sessionsById,
    globalEntryOrder,
  };
}

export async function loadOutputHistory() {
  return normalizeOutputHistory(await load(OUTPUT_HISTORY_KEY));
}

export async function saveOutputHistory(state) {
  const normalized = normalizeOutputHistory(state);
  await save(OUTPUT_HISTORY_KEY, normalized);
  return normalized;
}

export function getOrCreateActiveSession(historyState, profileId, sessionSeed, currentSessionId = null, options = {}) {
  const state = normalizeOutputHistory(historyState);
  if (options?.forceCreate) {
    const now = new Date().toISOString();
    const forcedSession = {
      id: createId("session"),
      profileId,
      startedAt: now,
      updatedAt: now,
      mode: sessionSeed.mode,
      sourceTextSnapshot: sessionSeed.sourceTextSnapshot,
      threadKey: sessionSeed.threadKey,
      entryIds: [],
      activeEntryId: null,
    };

    return {
      state: {
        ...state,
        sessionsById: {
          ...state.sessionsById,
          [forcedSession.id]: forcedSession,
        },
      },
      session: forcedSession,
      created: true,
    };
  }

  const currentSession = currentSessionId ? state.sessionsById[currentSessionId] : null;
  if (
    currentSession &&
    currentSession.profileId === profileId
  ) {
    return { state, session: currentSession, created: false };
  }

  const matchingSession = Object.values(state.sessionsById)
    .filter((session) => session.profileId === profileId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

  if (matchingSession) {
    return { state, session: matchingSession, created: false };
  }

  const now = new Date().toISOString();
  const session = {
    id: createId("session"),
    profileId,
    startedAt: now,
    updatedAt: now,
    mode: sessionSeed.mode,
    sourceTextSnapshot: sessionSeed.sourceTextSnapshot,
    threadKey: sessionSeed.threadKey,
    entryIds: [],
    activeEntryId: null,
  };

  return {
    state: {
      ...state,
      sessionsById: {
        ...state.sessionsById,
        [session.id]: session,
      },
    },
    session,
    created: true,
  };
}

export function appendHistoryEntry(historyState, sessionId, payload) {
  const state = normalizeOutputHistory(historyState);
  const session = state.sessionsById[sessionId];
  if (!session) return { state, entry: null };

  const now = new Date().toISOString();
  const entry = normalizeEntry({
    ...payload,
    id: createId("entry"),
    sessionId,
    createdAt: now,
    updatedAt: now,
    title: payload.title || buildHistoryTitle(payload.sourceText, payload.currentOutputText || payload.baseOutputText),
  });
  entry.searchText = buildHistorySearchText(entry);

  return {
    state: {
      ...state,
      entriesById: {
        ...state.entriesById,
        [entry.id]: entry,
      },
      sessionsById: {
        ...state.sessionsById,
        [sessionId]: {
          ...session,
          updatedAt: now,
          entryIds: [...session.entryIds, entry.id],
          activeEntryId: entry.id,
        },
      },
      globalEntryOrder: [entry.id, ...state.globalEntryOrder],
    },
    entry,
  };
}

export function updateHistoryEntry(historyState, entryId, patch) {
  const state = normalizeOutputHistory(historyState);
  const current = state.entriesById[entryId];
  if (!current) return state;

  const next = normalizeEntry({
    ...current,
    ...patch,
    id: current.id,
    updatedAt: new Date().toISOString(),
  });
  next.searchText = buildHistorySearchText(next);

  return {
    ...state,
    entriesById: {
      ...state.entriesById,
      [entryId]: next,
    },
  };
}

export function deleteHistoryEntry(historyState, entryId) {
  const state = normalizeOutputHistory(historyState);
  if (!state.entriesById[entryId]) return state;

  const nextEntriesById = { ...state.entriesById };
  const sessionId = nextEntriesById[entryId].sessionId;
  delete nextEntriesById[entryId];

  const nextSessionsById = { ...state.sessionsById };
  if (sessionId && nextSessionsById[sessionId]) {
    const session = nextSessionsById[sessionId];
    const entryIds = session.entryIds.filter((id) => id !== entryId);
    if (entryIds.length) {
      nextSessionsById[sessionId] = {
        ...session,
        updatedAt: new Date().toISOString(),
        entryIds,
        activeEntryId: session.activeEntryId === entryId ? entryIds[entryIds.length - 1] : session.activeEntryId,
      };
    } else {
      delete nextSessionsById[sessionId];
    }
  }

  return {
    ...state,
    entriesById: nextEntriesById,
    sessionsById: nextSessionsById,
    globalEntryOrder: state.globalEntryOrder.filter((id) => id !== entryId),
  };
}

export function deleteHistoryEntriesForProfile(historyState, profileId) {
  let state = normalizeOutputHistory(historyState);
  const entryIds = Object.values(state.entriesById)
    .filter((entry) => entry.profileId === profileId)
    .map((entry) => entry.id);

  entryIds.forEach((entryId) => {
    state = deleteHistoryEntry(state, entryId);
  });

  return state;
}

export function toggleSavedHistoryEntry(historyState, entryId, isSaved) {
  return updateHistoryEntry(historyState, entryId, {
    isSaved,
    savedAt: isSaved ? new Date().toISOString() : null,
  });
}

export function pruneUnsavedEntries(historyState, limit = OUTPUT_HISTORY_UNSAVED_LIMIT) {
  let state = normalizeOutputHistory(historyState);
  Object.values(state.sessionsById).forEach((session) => {
    const unsavedEntryIds = session.entryIds.filter((entryId) => !state.entriesById[entryId]?.isSaved);
    if (unsavedEntryIds.length <= limit) return;
    const toDelete = unsavedEntryIds.slice(0, unsavedEntryIds.length - limit);
    toDelete.forEach((entryId) => {
      state = deleteHistoryEntry(state, entryId);
    });
  });
  return state;
}

function entryMatchesFilters(entry, filters = {}) {
  if (filters.profileId && entry.profileId !== filters.profileId) return false;
  if (filters.mode && entry.mode !== filters.mode) return false;
  if (filters.model && entry.model !== filters.model) return false;
  if (filters.savedOnly && !entry.isSaved) return false;
  if (filters.dateFrom && new Date(entry.createdAt).getTime() < new Date(filters.dateFrom).getTime()) return false;
  if (filters.dateTo && new Date(entry.createdAt).getTime() > new Date(filters.dateTo).getTime()) return false;
  return true;
}

export function searchHistoryEntries(historyState, query = "", filters = {}) {
  const state = normalizeOutputHistory(historyState);
  const normalizedQuery = String(query || "").trim().toLowerCase();
  return state.globalEntryOrder
    .map((entryId) => state.entriesById[entryId])
    .filter(Boolean)
    .filter((entry) => entryMatchesFilters(entry, filters))
    .filter((entry) => !normalizedQuery || entry.searchText.includes(normalizedQuery));
}

export function listSessionEntries(historyState, sessionId) {
  const state = normalizeOutputHistory(historyState);
  const session = state.sessionsById[sessionId];
  if (!session) return [];
  return session.entryIds
    .map((entryId) => state.entriesById[entryId])
    .filter(Boolean);
}
