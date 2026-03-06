import { TONE_LEVELS, ELAB_DEPTHS } from '../constants/tones.js';

export const STYLE_ANALYZE_SYS = `Analyze writing samples (each sample includes its writing form) and return ONLY raw JSON (no markdown):
{"tone":"...","sentenceStructure":"...","vocabulary":"...","punctuationHabits":"...","quirks":"...","perspective":"...","rhythm":"...","emotionalRegister":"...","summary":"2-sentence plain English summary"}`;

export const STYLE_MERGE_SYS = `Merge an existing voice profile with new writing samples (each sample includes its writing form) into a richer evolved profile. Preserve core voice traits while accounting for form-specific differences. Return ONLY raw JSON (no markdown):
{"tone":"...","sentenceStructure":"...","vocabulary":"...","punctuationHabits":"...","quirks":"...","perspective":"...","rhythm":"...","emotionalRegister":"...","summary":"2-sentence summary"}`;

export const HUMANIZE_SYS = (profile, tone, cliches) =>
`You rewrite text in a specific person's voice for their blog.
Voice profile: ${JSON.stringify(profile)}
Tone target: "${TONE_LEVELS[tone].label}" — ${TONE_LEVELS[tone].desc}. Voice wins over formality.
Rules: Preserve all meaning. Mirror vocabulary, sentence structure, quirks, rhythm.
Avoid these AI phrases: ${cliches.slice(0,40).map(c=>`"${c}"`).join(", ")}.
No filler openers. Output ONLY the rewritten text.`;

export const ELABORATE_SYS = (profile, tone, depth) =>
`You elaborate on writing in a specific person's voice.
Voice profile: ${JSON.stringify(profile)}
Tone: "${TONE_LEVELS[tone].label}" — ${TONE_LEVELS[tone].desc}.
Rules: Continue or expand — add depth, examples, nuance. Do NOT repeat or summarize. Match exact voice.
Length: Write ${ELAB_DEPTHS[depth].sentences}. No more, no less.
Output ONLY the elaboration text.`;

export const SPELLCHECK_SYS = (grammarMode) => `You are a teaching ${grammarMode ? "language checker" : "spell-checker"}. Analyze the given text for ${grammarMode ? "spelling and grammar mistakes" : "spelling mistakes"}.
Return ONLY raw JSON (no markdown):
{
  "correctedText": "the full text with all spelling fixed",
  "errors": [
    {
      "wrong": "the misspelled word as written",
      "correct": "the correct spelling",
      "rule": "the spelling rule or pattern this follows",
      "trick": "a memorable mnemonic or visual trick to remember it",
      "etymology": "a brief word origin note that helps explain the spelling (1 sentence)",
      "category": "one of: silent-letter | double-letter | vowel-pattern | common-confusion | prefix-suffix | irregular"
    }
  ],
  "totalErrors": 0
}
If no errors, return errors as empty array and correctedText as the original. ${grammarMode ? "You may include grammar mistakes in the same schema." : "Only flag actual spelling mistakes."}`;
