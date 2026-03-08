import { describe, expect, test } from "vitest";
import { ELABORATE_SYS, HUMANIZE_SYS } from "./prompts.js";

describe("prompt formatting guidance", () => {
  test("humanize prompt tells model markdown is supported", () => {
    const prompt = HUMANIZE_SYS({ tone: "casual" }, 3, ["at the end of the day"]);
    expect(prompt).toMatch(/Markdown is supported in the UI/i);
    expect(prompt).toMatch(/keep plain text for short\/simple conversational lines/i);
  });

  test("elaborate prompt tells model to prefer structured markdown when useful", () => {
    const prompt = ELABORATE_SYS({ tone: "analytical" }, 3, 2);
    expect(prompt).toMatch(/Markdown is supported in the UI/i);
    expect(prompt).toMatch(/Prefer clear structure/i);
  });
});
