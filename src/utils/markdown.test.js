import { describe, expect, test } from "vitest";
import { renderMarkdownToHtml } from "./markdown.js";

describe("renderMarkdownToHtml", () => {
  test("renders headings and inline emphasis", () => {
    const html = renderMarkdownToHtml("## Heading\n\nThis has **bold** and *italic* text.");

    expect(html).toContain("<h2>Heading</h2>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
  });

  test("escapes HTML and keeps code blocks literal", () => {
    const html = renderMarkdownToHtml("<script>alert(1)</script>\n\n```js\nconst x = \"<tag>\";\n```");

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("<pre><code class=\"language-js\">const x = &quot;&lt;tag&gt;&quot;;</code></pre>");
  });

  test("falls back safely when input coercion fails", () => {
    const badInput = {
      toString() {
        throw new Error("boom");
      },
    };

    expect(() => renderMarkdownToHtml(badInput)).not.toThrow();
    expect(renderMarkdownToHtml(badInput)).toBe("");
  });
});
