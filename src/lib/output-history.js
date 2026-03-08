import { load, save } from "./storage.js";

export const OUTPUT_HISTORY_KEY = "output-history-v2";
export const OUTPUT_HISTORY_VERSION = 2;
export const OUTPUT_HISTORY_UNSAVED_LIMIT = 50;

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeSourceText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

export function buildSessionThreadKey({ profileId, mode, sourceText }) {
  return [profileId || "unknown", mode || "unknown", normalizeSourceText(sourceText)].join("::");
}

export function buildHistoryTitle(sourceText, outputText) {
  const sample = normalizeSourceText(outputText) || normalizeSourceText(sourceText);
  return sample ? sample.slice(0, 72) : "Untitled output";
}

export function buildHistorySearchText(entry) {
  return [
    entry.title,
    entry.sourceText,
    entry.baseOutputText,
    entry.currentOutputText,
    entry.model,
    entry.mode,
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
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

export function getOrCreateActiveSession(historyState, profileId, sessionSeed, currentSessionId = null) {
  const state = normalizeOutputHistory(historyState);
  const currentSession = currentSessionId ? state.sessionsById[currentSessionId] : null;
  if (
    currentSession &&
    currentSession.profileId === profileId &&
    currentSession.threadKey === sessionSeed.threadKey
  ) {
    return { state, session: currentSession, created: false };
  }

  const matchingSession = Object.values(state.sessionsById)
    .filter((session) => session.profileId === profileId && session.threadKey === sessionSeed.threadKey)
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
