import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App, {
  buildClicheRanges,
  buildDiffSegments,
  buildMirrorSegments,
  collectCoverageGaps,
  computeProfileHealth,
  computeReadabilityScore,
  computeWordCharDelta,
  countWords,
  getFormatPresetInstruction,
  normalizeStoredStyles,
} from "./App.jsx";

const invokeMock = vi.fn();
const listenMock = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args) => invokeMock(...args),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: (...args) => listenMock(...args),
}));

describe("App utility functions", () => {
  test("countWords handles whitespace-only strings", () => {
    expect(countWords("   ")).toBe(0);
    expect(countWords("one two   three")).toBe(3);
  });

  test("buildMirrorSegments marks misspellings and cliches", () => {
    const cliches = buildClicheRanges("Ths is very robust prose", ["robust"]);
    const segments = buildMirrorSegments("Ths is very robust prose", [{ wrong: "Ths" }], cliches);

    expect(segments.filter((s) => s.kind === "error").map((s) => s.text)).toEqual(["Ths"]);
    expect(segments.filter((s) => s.kind === "cliche").map((s) => s.text)).toEqual(["robust"]);
  });

  test("normalizeStoredStyles migrates primary to personal profile", () => {
    const normalized = normalizeStoredStyles({
      primary: {
        id: "primary",
        name: "My Writing Profile",
        profile: { tone: "balanced" },
        sampleEntries: [{ id: 1, text: "old sample", type: "general" }],
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
    });

    expect(normalized.personal).toBeTruthy();
    expect(normalized.personal.name).toBe("Personal");
  });

  test("normalizeStoredStyles resolves legacy question sample type labels", () => {
    const normalized = normalizeStoredStyles({
      personal: {
        id: "personal",
        name: "Personal",
        profile: { tone: "balanced" },
        sampleEntries: [
          { id: 1, text: "How are you feeling about the launch?", type: "Questions / Q&A" },
          { id: 2, text: "I am excited and a bit nervous.", type: "q&a" },
        ],
      },
    });

    expect(normalized.personal.sampleEntries[0].type).toBe("question");
    expect(normalized.personal.sampleEntries[1].type).toBe("question");
  });

  test("buildDiffSegments reports insertions and deletions", () => {
    const segments = buildDiffSegments("alpha beta", "alpha gamma beta");
    expect(segments.some((seg) => seg.type === "added" && seg.text.includes("gamma"))).toBe(true);
  });

  test("readability, deltas, presets and profile health helpers", () => {
    expect(computeReadabilityScore("This is a short sentence.")).toBeGreaterThan(0);
    expect(computeWordCharDelta("one two", "one two three").wordDelta).toBe(1);
    expect(getFormatPresetInstruction("linkedin")).toMatch(/LinkedIn/i);

    const gaps = collectCoverageGaps([{ type: "email" }, { type: "journal" }]);
    expect(gaps.map((g) => g.value)).toContain("general");

    const health = computeProfileHealth({
      sampleEntries: [{ type: "email" }, { type: "general" }],
      sampleCount: 2,
      updatedAt: new Date().toISOString(),
    });
    expect(health.score).toBeGreaterThan(0);
  });
});

describe("App UI", () => {
  let streamListener = null;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    localStorage.clear();
    window.__TAURI_INTERNALS__ = {};
    localStorage.setItem("cliches-ts-v3", JSON.stringify(new Date().toISOString()));
    streamListener = null;

    listenMock.mockImplementation(async (_eventName, cb) => {
      streamListener = cb;
      return () => {
        streamListener = null;
      };
    });

    invokeMock.mockImplementation(async (command, args) => {
      if (command === "has_api_key") return true;
      if (command === "get_styles_backup") return { styles: {}, savedAt: null };
      if (command === "save_styles_backup") return { ok: true, savedAt: new Date().toISOString() };
      if (command === "get_request_logs") return { logs: [] };
      if (command === "openrouter_chat") {
        const userPrompt = args?.payload?.messages?.[0]?.content || "";
        if (userPrompt.includes("Create exactly 3 rewrite variants")) {
          return { content: [{ text: JSON.stringify(["Variant one.", "Variant two.", "Variant three."]) }] };
        }
        return { content: [{ text: "Rewritten sentence." }] };
      }
      if (command === "openrouter_chat_stream") {
        const requestId = args.requestId;
        streamListener?.({ payload: { requestId, chunk: "Hello ", fullText: "Hello ", done: false, error: null } });
        streamListener?.({ payload: { requestId, chunk: "world", fullText: "Hello world.", done: false, error: null } });
        streamListener?.({ payload: { requestId, chunk: null, fullText: "Hello world.", done: true, error: null } });
        return { ok: true };
      }
      return { ok: true };
    });
  });

  afterEach(() => {
    delete window.__TAURI_INTERNALS__;
  });

  test("shows onboarding state when selected profile is untrained", async () => {
    render(<App />);
    await screen.findByText(/profile needs onboarding/i);
    expect(screen.getByRole("button", { name: "Onboard profile first" })).toBeDisabled();
  });

  test("supports profile and theme controls", async () => {
    localStorage.setItem(
      "styles-v3",
      JSON.stringify({
        personal: {
          id: "personal",
          name: "Personal",
          profile: { tone: "balanced" },
          sampleEntries: [{ id: 1, text: "this is a sample entry with enough content", type: "general" }],
          sampleCount: 1,
          updatedAt: new Date().toISOString(),
        },
      })
    );

    render(<App />);
    await screen.findByText(/samples • Personal profile/);

    const profileSelect = screen.getByRole("combobox", { name: "Profile" });
    fireEvent.change(profileSelect, { target: { value: "work" } });
    await screen.findByText(/Work profile needs onboarding/i);

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    const themeSelect = screen.getByRole("combobox", { name: "Theme" });
    fireEvent.change(themeSelect, { target: { value: "teal" } });
    expect(themeSelect).toHaveValue("teal");
  });

  test("streams, supports variants, diff toggle and one-off/preset injection", async () => {
    localStorage.setItem(
      "styles-v3",
      JSON.stringify({
        personal: {
          id: "personal",
          name: "Personal",
          profile: { tone: "balanced" },
          sampleEntries: [{ id: 1, text: "this is a sample entry with enough content", type: "general" }],
          sampleCount: 1,
          updatedAt: new Date().toISOString(),
        },
      })
    );

    render(<App />);
    await screen.findByText(/samples • Personal profile/);

    fireEvent.change(screen.getByRole("combobox", { name: "Output format preset" }), {
      target: { value: "linkedin" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "One-off instruction" }), {
      target: { value: "make this sound more confident" },
    });

    fireEvent.change(screen.getByPlaceholderText("Paste AI-generated text here…"), {
      target: { value: "This is a long enough input to trigger humanize mode and stream output." },
    });
    const humanizeButtons = screen.getAllByRole("button", { name: "Humanize" });
    fireEvent.click(humanizeButtons[humanizeButtons.length - 1]);

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith(
        "openrouter_chat_stream",
        expect.objectContaining({
          payload: expect.objectContaining({
            messages: expect.any(Array),
          }),
        })
      );
    });
    await screen.findByRole("button", { name: "Generate Variants" });

    const streamCall = invokeMock.mock.calls.find(([command]) => command === "openrouter_chat_stream");
    expect(streamCall[1].payload.system).toMatch(/Extra constraints/);
    expect(streamCall[1].payload.system).toMatch(/LinkedIn post/);

    fireEvent.click(screen.getByRole("button", { name: "Generate Variants" }));
    await screen.findByRole("button", { name: "Variant 1" });

    fireEvent.click(screen.getByRole("button", { name: "Hide Diff" }));
    await screen.findByRole("button", { name: "Show Diff" });
  });

  test("reopens API key modal when OpenRouter reports missing key", async () => {
    localStorage.setItem(
      "styles-v3",
      JSON.stringify({
        personal: {
          id: "personal",
          name: "Personal",
          profile: { tone: "balanced" },
          sampleEntries: [{ id: 1, text: "this is a sample entry with enough content", type: "general" }],
          sampleCount: 1,
          updatedAt: new Date().toISOString(),
        },
      })
    );

    invokeMock.mockImplementation(async (command, args) => {
      if (command === "has_api_key") return true;
      if (command === "get_styles_backup") return { styles: {}, savedAt: null };
      if (command === "save_styles_backup") return { ok: true, savedAt: new Date().toISOString() };
      if (command === "get_request_logs") return { logs: [] };
      if (command === "openrouter_chat_stream") {
        throw new Error("OpenRouter API key not found. Open app settings and save your key.");
      }
      if (command === "openrouter_chat") {
        return { content: [{ text: "ok" }] };
      }
      return { ok: true };
    });

    render(<App />);
    await screen.findByText(/samples • Personal profile/);

    fireEvent.change(screen.getByPlaceholderText("Paste AI-generated text here…"), {
      target: { value: "This is a long enough input to trigger the humanize request path." },
    });
    const humanizeButtons = screen.getAllByRole("button", { name: "Humanize" });
    fireEvent.click(humanizeButtons[humanizeButtons.length - 1]);

    await screen.findByText("OpenRouter API Key");
  });

  test("grammar mode changes check prompt and keyboard shortcut submits", async () => {
    localStorage.setItem(
      "styles-v3",
      JSON.stringify({
        personal: {
          id: "personal",
          name: "Personal",
          profile: { tone: "balanced" },
          sampleEntries: [{ id: 1, text: "this is a sample entry with enough content", type: "general" }],
          sampleCount: 1,
          updatedAt: new Date().toISOString(),
        },
      })
    );

    render(<App />);

    fireEvent.change(screen.getByPlaceholderText("Paste AI-generated text here…"), {
      target: { value: "Bad grammer in this paragraph for testing shortcuts and checks." },
    });

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Check Spelling" }));

    await waitFor(() => {
      const spellCall = invokeMock.mock.calls.find(([command, args]) => command === "openrouter_chat" && (args?.payload?.system || "").includes("language checker"));
      expect(spellCall).toBeTruthy();
    });

    fireEvent.keyDown(window, { key: "Enter", metaKey: true });
    await screen.findByText("Hello world.");
  });
});
