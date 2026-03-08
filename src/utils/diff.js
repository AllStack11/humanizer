function toTokens(text) {
  return text ? text.split(/(\s+)/).filter(Boolean) : [];
}

export function buildDiffSegments(beforeText, afterText) {
  const a = toTokens(beforeText);
  const b = toTokens(afterText);
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const segments = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      segments.push({ type: "same", text: a[i] });
      i++;
      j++;
      continue;
    }
    if (dp[i + 1][j] >= dp[i][j + 1]) {
      segments.push({ type: "removed", text: a[i] });
      i++;
    } else {
      segments.push({ type: "added", text: b[j] });
      j++;
    }
  }
  while (i < a.length) segments.push({ type: "removed", text: a[i++] });
  while (j < b.length) segments.push({ type: "added", text: b[j++] });
  return segments;
}

export function buildClicheRanges(text, cliches) {
  if (!text || !Array.isArray(cliches) || !cliches.length) return [];
  const ranges = [];
  const lowerText = text.toLowerCase();
  for (const raw of cliches) {
    const phrase = String(raw || "").trim().toLowerCase();
    if (!phrase) continue;
    let from = 0;
    while (from < lowerText.length) {
      const idx = lowerText.indexOf(phrase, from);
      if (idx === -1) break;
      ranges.push({ start: idx, end: idx + phrase.length, type: "cliche" });
      from = idx + phrase.length;
    }
  }
  ranges.sort((a, b) => a.start - b.start);
  const deduped = [];
  for (const range of ranges) {
    if (!deduped.length || deduped[deduped.length - 1].end <= range.start) {
      deduped.push(range);
    }
  }
  return deduped;
}

export function buildMirrorSegments(text, clicheRanges = []) {
  if (!text) return [{ text, kind: "plain" }];
  const ranges = [];

  for (const range of clicheRanges) {
    ranges.push({ start: range.start, end: range.end, kind: "cliche" });
  }

  ranges.sort((a, b) => a.start - b.start);
  const segments = [];
  let pos = 0;
  for (const range of ranges) {
    if (range.start < pos) continue;
    if (range.start > pos) segments.push({ text: text.slice(pos, range.start), kind: "plain" });
    segments.push({ text: text.slice(range.start, range.end), kind: range.kind });
    pos = range.end;
  }
  if (pos < text.length) segments.push({ text: text.slice(pos), kind: "plain" });
  return segments.length ? segments : [{ text, kind: "plain" }];
}
