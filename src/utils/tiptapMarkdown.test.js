import { describe, expect, test } from "vitest";
import { serializeTiptapEditorToMarkdown } from "./tiptapMarkdown.js";

describe("serializeTiptapEditorToMarkdown", () => {
  test("falls back to editor text when markdown serializer fails", () => {
    const editor = {
      state: { doc: {} },
      getText: () => "Plain fallback text",
    };

    expect(serializeTiptapEditorToMarkdown(editor)).toBe("Plain fallback text");
  });

  test("returns empty string when editor is unavailable", () => {
    expect(serializeTiptapEditorToMarkdown(null)).toBe("");
  });
});

