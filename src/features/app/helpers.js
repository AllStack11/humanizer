import { normalizeSampleSlot } from "../../utils/index.js";

export function getErrorMessage(error, fallback = "Unexpected error.") {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (error && typeof error === "object") {
    const message = error.message || error.error || error.reason;
    if (typeof message === "string" && message.trim()) return message;
    try {
      return JSON.stringify(error);
    } catch {
      // Ignore JSON stringify failures and return fallback.
    }
  }
  return fallback;
}

export function isMissingApiKeyError(message) {
  return typeof message === "string" && /api key not found/i.test(message);
}

export function classifyRequestIssue(message) {
  const normalized = String(message || "").toLowerCase();

  if (!normalized) {
    return {
      summary: "Unknown request failure.",
      detail: "",
    };
  }

  if (normalized.includes("api key")) {
    return {
      summary: "Authentication failed.",
      detail: "OpenRouter API key is missing, invalid, or unreadable.",
    };
  }

  if (normalized.includes("desktop runtime required") || normalized.includes("tauri runtime")) {
    return {
      summary: "Desktop runtime unavailable.",
      detail: "This request can only run inside the desktop app.",
    };
  }

  if (normalized.includes("failed to reach openrouter")) {
    return {
      summary: "Network request failed.",
      detail: "The app could not reach the model provider.",
    };
  }

  if (normalized.includes("http ")) {
    return {
      summary: "Provider rejected the request.",
      detail: "The model endpoint returned an HTTP error.",
    };
  }

  if (normalized.includes("parse")) {
    return {
      summary: "Provider response could not be parsed.",
      detail: "The app received malformed or unexpected model output.",
    };
  }

  if (normalized.includes("empty response")) {
    return {
      summary: "Model returned no output.",
      detail: "The request completed but produced no usable text.",
    };
  }

  return {
    summary: "Request failed.",
    detail: message,
  };
}

export function parseJsonFromModelOutput(raw) {
  const cleaned = String(raw || "").replace(/```json|```/gi, "").trim();
  return JSON.parse(cleaned);
}

export function dedupeSampleEntries(entries) {
  const seen = new Set();
  const deduped = [];
  for (const rawEntry of entries || []) {
    const normalized = normalizeSampleSlot(rawEntry, deduped.length + 1);
    const text = normalized.text.trim();
    if (!text) continue;
    const key = `${normalized.type}::${text.toLowerCase().replace(/\s+/g, " ")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({
      ...normalized,
      id: deduped.length + 1,
      text,
    });
  }
  return deduped;
}
