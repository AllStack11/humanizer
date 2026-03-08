import { countWords } from "../../utils/index.js";

const CONVERSATIONAL_OPENERS = [
  "hi",
  "hey",
  "hello",
  "yo",
  "good morning",
  "good afternoon",
  "good evening",
  "how are you",
  "how's it going",
  "hows it going",
  "what's up",
  "whats up",
  "can you",
  "could you",
  "would you",
  "will you",
  "do you",
  "did you",
  "are you",
  "have you",
  "where are",
  "when are",
  "why are",
  "what are",
];

function normalizeHumanizeText(text) {
  return String(text || "").trim().replace(/\s+/g, " ");
}

export function analyzeHumanizeInput(text) {
  const normalized = normalizeHumanizeText(text);
  const lower = normalized.toLowerCase();
  const wordCount = countWords(normalized);
  const greetingLike = /^(hi|hey|hello|yo|good morning|good afternoon|good evening)\b/i.test(normalized);
  const questionLike = /\?\s*$/.test(normalized)
    || CONVERSATIONAL_OPENERS.some((prefix) => lower.startsWith(prefix))
    || /\bhow are you\b/i.test(normalized);
  const shortChatLike = wordCount > 0 && wordCount <= 14;
  const conversational = shortChatLike && (greetingLike || questionLike || /\byou\b/i.test(normalized));

  return {
    normalized,
    wordCount,
    greetingLike,
    questionLike,
    shortChatLike,
    conversational,
  };
}

export function buildHumanizeUserPrompt(text, { strict = false } = {}) {
  const analysis = analyzeHumanizeInput(text);
  const guardrails = [
    "Rewrite the source text below in the target voice.",
    "Transform the source text itself. Do not answer it, continue it, or switch to the other speaker.",
  ];

  if (analysis.questionLike) {
    guardrails.push("Keep the result as a question or check-in rather than turning it into an answer.");
  }
  if (analysis.greetingLike) {
    guardrails.push("Keep the greeting intent. Do not reply to the greeting.");
  }
  if (analysis.shortChatLike) {
    guardrails.push("Stay close to the original scope and length unless a tiny expansion is needed for natural phrasing.");
  }
  if (strict) {
    guardrails.push("Your previous attempt drifted into a response. Rewrite the source itself this time.");
  }

  return `${guardrails.join("\n")}\n\n<source_text>\n${String(text || "").trim()}\n</source_text>`;
}

export function outputLooksLikeAnsweredPrompt(sourceText, outputText) {
  const source = analyzeHumanizeInput(sourceText);
  if (!source.conversational) return false;

  const output = normalizeHumanizeText(outputText);
  if (!output) return false;

  const outputWordCount = countWords(output);
  let suspicion = 0;

  if (source.questionLike && !/\?\s*$/.test(output)) suspicion += 1;
  if (outputWordCount >= Math.max(source.wordCount * 3, source.wordCount + 12)) suspicion += 1;
  if (/\b(i am|i'm|im|i’ve|i've|i feel|i was|i've been|i have been)\b/i.test(output)) suspicion += 1;
  if (/\bdoing (pretty )?(good|well|great|okay|ok|fine)\b/i.test(output)) suspicion += 1;
  if (/\bthanks for asking\b/i.test(output)) suspicion += 1;
  if (/\bhope (you are|you're|ur) (doing )?(well|good)\b/i.test(output)) suspicion += 1;

  return suspicion >= 2;
}
