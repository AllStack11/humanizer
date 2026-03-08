import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { createPacedStreamEmitter, extractStreamTextChunk } from "./api.js";

describe("extractStreamTextChunk", () => {
  test("extracts delta string content", () => {
    const result = extractStreamTextChunk({
      choices: [{ delta: { content: "Hello" } }],
    });
    expect(result).toBe("Hello");
  });

  test("extracts array-based content parts", () => {
    const result = extractStreamTextChunk({
      choices: [{ delta: { content: [{ text: "A" }, { text: "B" }] } }],
    });
    expect(result).toBe("AB");
  });
});

describe("createPacedStreamEmitter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("emits text gradually and flushes final output", async () => {
    const events = [];
    const emitter = createPacedStreamEmitter((chunk, fullText) => {
      events.push({ chunk, fullText });
    }, {
      enabled: true,
      tickMs: 20,
      charsPerSecond: 50,
    });

    emitter.push("hello");
    expect(events).toHaveLength(0);

    const flushPromise = emitter.flush();
    await vi.advanceTimersByTimeAsync(120);
    const finalText = await flushPromise;

    expect(finalText).toBe("hello");
    expect(events.length).toBeGreaterThan(1);
    expect(events[events.length - 1].fullText).toBe("hello");
  });

  test("can bypass pacing and emit immediately", async () => {
    const events = [];
    const emitter = createPacedStreamEmitter((chunk, fullText) => {
      events.push({ chunk, fullText });
    }, {
      enabled: false,
    });

    emitter.push("fast");
    const flushed = await emitter.flush();

    expect(events).toEqual([{ chunk: "fast", fullText: "fast" }]);
    expect(flushed).toBe("fast");
  });
});
