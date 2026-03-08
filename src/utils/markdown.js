function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderPlainTextAsHtml(text) {
  const normalized = String(text || "").replace(/\r\n/g, "\n");
  if (!normalized.trim()) return "";
  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function normalizeUrl(url) {
  const trimmed = String(url || "").trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.href;
  } catch {
    return "";
  }
}

function renderInlineMarkdown(text) {
  const escaped = escapeHtml(text);
  const codeSnippets = [];

  let html = escaped.replace(/`([^`\n]+?)`/g, (_, code) => {
    const token = `__CODE_SNIPPET_${codeSnippets.length}__`;
    codeSnippets.push(`<code>${code}</code>`);
    return token;
  });

  html = html.replace(/\[([^\]]+?)\]\(([^)\s]+?)\)/g, (_, label, rawUrl) => {
    const safeUrl = normalizeUrl(rawUrl);
    if (!safeUrl) return label;
    return `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noreferrer noopener">${label}</a>`;
  });

  html = html
    .replace(/\*\*([^*\n][\s\S]*?[^*\n])\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_\n][\s\S]*?[^_\n])__/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+?)\*/g, "<em>$1</em>");

  for (let i = 0; i < codeSnippets.length; i += 1) {
    html = html.replaceAll(`__CODE_SNIPPET_${i}__`, codeSnippets[i]);
  }

  return html;
}

function wrapParagraph(lines) {
  if (!lines.length) return "";
  return `<p>${renderInlineMarkdown(lines.join("<br>"))}</p>`;
}

function wrapList(items, ordered) {
  if (!items.length) return "";
  const tag = ordered ? "ol" : "ul";
  const htmlItems = items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("");
  return `<${tag}>${htmlItems}</${tag}>`;
}

export function renderMarkdownToHtml(text) {
  let source = "";
  try {
    source = String(text || "");
  } catch {
    return "";
  }

  if (!source.trim()) return "";

  try {
    const lines = source.replace(/\r\n/g, "\n").split("\n");
    const htmlParts = [];

    let paragraphLines = [];
    let listItems = [];
    let listOrdered = false;
    let inCodeFence = false;
    let codeFenceLang = "";
    let codeFenceLines = [];

    const flushParagraph = () => {
      const html = wrapParagraph(paragraphLines);
      if (html) htmlParts.push(html);
      paragraphLines = [];
    };

    const flushList = () => {
      const html = wrapList(listItems, listOrdered);
      if (html) htmlParts.push(html);
      listItems = [];
    };

    const flushCodeFence = () => {
      const code = escapeHtml(codeFenceLines.join("\n"));
      const languageClass = codeFenceLang ? ` class="language-${escapeHtml(codeFenceLang)}"` : "";
      htmlParts.push(`<pre><code${languageClass}>${code}</code></pre>`);
      codeFenceLines = [];
      codeFenceLang = "";
    };

    for (const line of lines) {
      const trimmed = line.trim();

      const fenceMatch = line.match(/^```\s*([a-zA-Z0-9_-]+)?\s*$/);
      if (fenceMatch) {
        flushParagraph();
        flushList();

        if (inCodeFence) {
          flushCodeFence();
        } else {
          codeFenceLang = fenceMatch[1] || "";
        }

        inCodeFence = !inCodeFence;
        continue;
      }

      if (inCodeFence) {
        codeFenceLines.push(line);
        continue;
      }

      if (!trimmed) {
        flushParagraph();
        flushList();
        continue;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        flushParagraph();
        flushList();
        const level = headingMatch[1].length;
        htmlParts.push(`<h${level}>${renderInlineMarkdown(headingMatch[2].trim())}</h${level}>`);
        continue;
      }

      const blockquoteMatch = line.match(/^>\s?(.*)$/);
      if (blockquoteMatch) {
        flushParagraph();
        flushList();
        htmlParts.push(`<blockquote><p>${renderInlineMarkdown(blockquoteMatch[1])}</p></blockquote>`);
        continue;
      }

      const orderedListMatch = line.match(/^\d+\.\s+(.+)$/);
      if (orderedListMatch) {
        flushParagraph();
        if (!listItems.length) {
          listOrdered = true;
        } else if (!listOrdered) {
          flushList();
          listOrdered = true;
        }
        listItems.push(orderedListMatch[1]);
        continue;
      }

      const unorderedListMatch = line.match(/^[-*+]\s+(.+)$/);
      if (unorderedListMatch) {
        flushParagraph();
        if (!listItems.length) {
          listOrdered = false;
        } else if (listOrdered) {
          flushList();
          listOrdered = false;
        }
        listItems.push(unorderedListMatch[1]);
        continue;
      }

      flushList();
      paragraphLines.push(line);
    }

    if (inCodeFence) {
      flushParagraph();
      flushList();
      flushCodeFence();
    } else {
      flushParagraph();
      flushList();
    }

    return htmlParts.join("");
  } catch {
    return renderPlainTextAsHtml(source);
  }
}
