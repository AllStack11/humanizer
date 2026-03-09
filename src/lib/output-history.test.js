import { beforeEach, describe, expect, test, vi } from "vitest";

const loadMock = vi.fn();
const saveMock = vi.fn();

vi.mock("./storage.js", () => ({
  load: (...args) => loadMock(...args),
  save: (...args) => saveMock(...args),
}));

import {
  appendHistoryEntry,
  buildHistorySearchText,
  buildHistoryTitle,
  buildSessionThreadKey,
  createEmptyOutputHistory,
  deleteHistoryEntry,
  deleteHistoryEntriesForProfile,
  getOrCreateActiveSession,
  listSessionEntries,
  loadOutputHistory,
  normalizeOutputHistory,
  normalizeSourceText,
  pruneUnsavedEntries,
  saveOutputHistory,
  searchHistoryEntries,
  toggleSavedHistoryEntry,
  updateHistoryEntry,
} from "./output-history.js";

function makePayload(overrides = {}) {
  return {
    profileId: "personal",
    mode: "humanize",
    model: "writer/palmyra-x5",
    sourceText: "Original source text",
    baseOutputText: "First generated draft",
    currentOutputText: "First generated draft",
    oneOffInstruction: "",
    formatPreset: "none",
    toneLevel: 2,
    stripCliches: true,
    elabDepth: 2,
    status: "ready",
    isSaved: false,
    savedAt: null,
    ...overrides,
  };
}

function createSessionState({
  profileId = "personal",
  mode = "humanize",
  sourceText = "Original source text",
  payloads = [makePayload()],
} = {}) {
  const sessionSeed = {
    mode,
    sourceTextSnapshot: sourceText,
    threadKey: buildSessionThreadKey({ profileId, mode, sourceText }),
  };
  const { state: withSession, session } = getOrCreateActiveSession(createEmptyOutputHistory(), profileId, sessionSeed);

  return payloads.reduce(
    (acc, payload) => appendHistoryEntry(acc.state, session.id, payload),
    { state: withSession }
  );
}

describe("output-history store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadMock.mockResolvedValue(null);
    saveMock.mockResolvedValue(undefined);
  });

  test("normalizes source text and builds profile-stable thread keys", () => {
    expect(normalizeSourceText("  hello \n world  ")).toBe("hello world");
    expect(
      buildSessionThreadKey({ profileId: "personal", mode: "humanize", sourceText: "hello   world" })
    ).toBe("personal");
  });

  test("builds titles and search text from entry content", () => {
    const title = buildHistoryTitle("Source fallback", "Output wins");
    expect(title).toBe("Output wins");

    const search = buildHistorySearchText(makePayload({ title: "Named draft" }));
    expect(search).toContain("named draft");
    expect(search).toContain("original source text");
  });

  test("loads empty history when storage is blank", async () => {
    const state = await loadOutputHistory();
    expect(state.entriesById).toEqual({});
    expect(state.sessionsById).toEqual({});
    expect(state.globalEntryOrder).toEqual([]);
  });

  test("normalizes malformed stored history and removes dangling references", () => {
    const state = normalizeOutputHistory({
      entriesById: {
        entryA: makePayload({ id: "entryA", sessionId: "sessionA" }),
      },
      sessionsById: {
        sessionA: {
          id: "sessionA",
          profileId: "personal",
          mode: "humanize",
          sourceTextSnapshot: "Original source text",
          entryIds: ["entryA", "missing"],
          activeEntryId: "missing",
        },
      },
      globalEntryOrder: ["missing", "entryA"],
    });

    expect(state.sessionsById.sessionA.entryIds).toEqual(["entryA"]);
    expect(state.sessionsById.sessionA.activeEntryId).toBe("entryA");
    expect(state.globalEntryOrder).toEqual(["entryA"]);
  });

  test("saveOutputHistory persists the normalized state", async () => {
    const { state } = createSessionState();
    const saved = await saveOutputHistory(state);

    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saved.globalEntryOrder).toHaveLength(1);
    expect(Object.keys(saved.entriesById)).toHaveLength(1);
  });

  test("reuses the current matching session or falls back to the latest matching thread", () => {
    const profileId = "personal";
    const seed = {
      mode: "humanize",
      sourceTextSnapshot: "Original source text",
      threadKey: buildSessionThreadKey({ profileId, mode: "humanize", sourceText: "Original source text" }),
    };

    const { state: firstState, session: firstSession } = getOrCreateActiveSession(createEmptyOutputHistory(), profileId, seed);
    const reused = getOrCreateActiveSession(firstState, profileId, seed, firstSession.id);
    expect(reused.session.id).toBe(firstSession.id);
    expect(reused.created).toBe(false);

    const { state: appendedState } = appendHistoryEntry(firstState, firstSession.id, makePayload());
    const latestMatch = getOrCreateActiveSession(appendedState, profileId, seed, "missing-session");
    expect(latestMatch.session.id).toBe(firstSession.id);
    expect(latestMatch.created).toBe(false);
  });

  test("creates a fresh session when forceCreate is enabled", () => {
    const profileId = "personal";
    const seed = {
      mode: "humanize",
      sourceTextSnapshot: "Original source text",
      threadKey: buildSessionThreadKey({ profileId, mode: "humanize", sourceText: "Original source text" }),
    };

    const { state: firstState, session: firstSession } = getOrCreateActiveSession(createEmptyOutputHistory(), profileId, seed);
    const forced = getOrCreateActiveSession(firstState, profileId, seed, firstSession.id, { forceCreate: true });

    expect(forced.created).toBe(true);
    expect(forced.session.id).not.toBe(firstSession.id);
  });

  test("appendHistoryEntry adds entries in session order and reverse global order", () => {
    const { state: firstState, session } = getOrCreateActiveSession(createEmptyOutputHistory(), "personal", {
      mode: "humanize",
      sourceTextSnapshot: "Original source text",
      threadKey: buildSessionThreadKey({ profileId: "personal", mode: "humanize", sourceText: "Original source text" }),
    });
    const first = appendHistoryEntry(firstState, session.id, makePayload({ currentOutputText: "First" }));
    const second = appendHistoryEntry(first.state, session.id, makePayload({ currentOutputText: "Second" }));

    expect(second.state.sessionsById[session.id].entryIds).toEqual([first.entry.id, second.entry.id]);
    expect(second.state.globalEntryOrder).toEqual([second.entry.id, first.entry.id]);
    expect(second.state.sessionsById[session.id].activeEntryId).toBe(second.entry.id);
  });

  test("updateHistoryEntry updates editable fields and refreshes search text", () => {
    const { state, entry } = createSessionState();
    const updated = updateHistoryEntry(state, entry.id, {
      currentOutputText: "Edited final draft",
      title: "Renamed draft",
    });

    expect(updated.entriesById[entry.id].currentOutputText).toBe("Edited final draft");
    expect(updated.entriesById[entry.id].title).toBe("Renamed draft");
    expect(updated.entriesById[entry.id].searchText).toContain("edited final draft");
  });

  test("toggleSavedHistoryEntry sets and clears saved metadata", () => {
    const { state, entry } = createSessionState();
    const savedState = toggleSavedHistoryEntry(state, entry.id, true);
    expect(savedState.entriesById[entry.id].isSaved).toBe(true);
    expect(savedState.entriesById[entry.id].savedAt).toBeTruthy();

    const unsavedState = toggleSavedHistoryEntry(savedState, entry.id, false);
    expect(unsavedState.entriesById[entry.id].isSaved).toBe(false);
    expect(unsavedState.entriesById[entry.id].savedAt).toBeNull();
  });

  test("deleteHistoryEntry removes empty sessions and updates ordering", () => {
    const { state, entry } = createSessionState();
    const next = deleteHistoryEntry(state, entry.id);

    expect(next.entriesById[entry.id]).toBeUndefined();
    expect(next.globalEntryOrder).toEqual([]);
    expect(Object.keys(next.sessionsById)).toEqual([]);
  });

  test("deleteHistoryEntriesForProfile removes only the targeted profile history", () => {
    const personal = createSessionState({
      payloads: [makePayload({ currentOutputText: "Personal draft" })],
    });
    const workSeed = {
      mode: "humanize",
      sourceTextSnapshot: "Work source",
      threadKey: buildSessionThreadKey({ profileId: "work", mode: "humanize", sourceText: "Work source" }),
    };
    const { state: withWorkSession, session: workSession } = getOrCreateActiveSession(personal.state, "work", workSeed);
    const combined = appendHistoryEntry(withWorkSession, workSession.id, makePayload({
      profileId: "work",
      sourceText: "Work source",
      currentOutputText: "Work draft",
      baseOutputText: "Work draft",
    }));

    const next = deleteHistoryEntriesForProfile(combined.state, "personal");

    expect(Object.values(next.entriesById).map((entry) => entry.profileId)).toEqual(["work"]);
    expect(Object.values(next.sessionsById).map((session) => session.profileId)).toEqual(["work"]);
    expect(next.globalEntryOrder).toHaveLength(1);
  });

  test("pruneUnsavedEntries keeps saved entries and removes oldest unsaved items", () => {
    let result = createSessionState({
      payloads: [
        makePayload({ currentOutputText: "Draft 1" }),
        makePayload({ currentOutputText: "Draft 2" }),
        makePayload({ currentOutputText: "Draft 3" }),
      ],
    });

    const sessionId = Object.keys(result.state.sessionsById)[0];
    const middleId = result.state.sessionsById[sessionId].entryIds[1];
    result = { state: toggleSavedHistoryEntry(result.state, middleId, true) };

    const pruned = pruneUnsavedEntries(result.state, 1);
    const remainingEntries = listSessionEntries(pruned, sessionId);

    expect(remainingEntries).toHaveLength(2);
    expect(remainingEntries.some((entry) => entry.id === middleId && entry.isSaved)).toBe(true);
    expect(remainingEntries.map((entry) => entry.currentOutputText)).toContain("Draft 3");
    expect(remainingEntries.map((entry) => entry.currentOutputText)).not.toContain("Draft 1");
  });

  test("searchHistoryEntries applies text, mode, model, profile, and saved filters", () => {
    const personal = createSessionState({
      payloads: [
        makePayload({ currentOutputText: "Personal note", model: "writer/palmyra-x5" }),
      ],
    });
    const workSeed = {
      mode: "elaborate",
      sourceTextSnapshot: "Work source",
      threadKey: buildSessionThreadKey({ profileId: "work", mode: "elaborate", sourceText: "Work source" }),
    };
    const { state: withWorkSession, session: workSession } = getOrCreateActiveSession(personal.state, "work", workSeed);
    const work = appendHistoryEntry(withWorkSession, workSession.id, makePayload({
      profileId: "work",
      mode: "elaborate",
      model: "google/gemini-2.5-pro",
      sourceText: "Work source",
      currentOutputText: "Quarterly planning summary",
      baseOutputText: "Quarterly planning summary",
      isSaved: true,
      savedAt: new Date().toISOString(),
    }));

    expect(searchHistoryEntries(work.state, "quarterly")).toHaveLength(1);
    expect(searchHistoryEntries(work.state, "", { profileId: "work" })).toHaveLength(1);
    expect(searchHistoryEntries(work.state, "", { mode: "elaborate" })).toHaveLength(1);
    expect(searchHistoryEntries(work.state, "", { model: "writer/palmyra-x5" })).toHaveLength(1);
    expect(searchHistoryEntries(work.state, "", { savedOnly: true })).toHaveLength(1);
  });

  test("listSessionEntries preserves insertion order for session previews", () => {
    const { state, session } = (() => {
      const { state: withSession, session } = getOrCreateActiveSession(createEmptyOutputHistory(), "personal", {
        mode: "humanize",
        sourceTextSnapshot: "Ordered source",
        threadKey: buildSessionThreadKey({ profileId: "personal", mode: "humanize", sourceText: "Ordered source" }),
      });
      const first = appendHistoryEntry(withSession, session.id, makePayload({ currentOutputText: "One" }));
      const second = appendHistoryEntry(first.state, session.id, makePayload({ currentOutputText: "Two" }));
      return { state: second.state, session };
    })();

    expect(listSessionEntries(state, session.id).map((entry) => entry.currentOutputText)).toEqual(["One", "Two"]);
  });
});
