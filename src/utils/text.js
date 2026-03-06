export function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function countChars(text) {
  return text.length;
}

export function computeWordCharDelta(beforeText, afterText) {
  const beforeWords = countWords(beforeText);
  const afterWords = countWords(afterText);
  const beforeChars = countChars(beforeText);
  const afterChars = countChars(afterText);
  return {
    beforeWords,
    afterWords,
    wordDelta: afterWords - beforeWords,
    beforeChars,
    afterChars,
    charDelta: afterChars - beforeChars,
  };
}

export function splitSentences(text) {
  return text
    .match(/[^.!?]+[.!?]*/g)?.map((sentence) => sentence.trim()).filter(Boolean) || [];
}

export function computeReadabilityScore(text) {
  const words = countWords(text);
  const sentences = Math.max(splitSentences(text).length, 1);
  const syllableCount = (text.toLowerCase().match(/[aeiouy]{1,2}/g) || []).length || 1;
  const score = 206.835 - (1.015 * (words / sentences)) - (84.6 * (syllableCount / Math.max(words, 1)));
  return Number.isFinite(score) ? Number(score.toFixed(1)) : 0;
}
