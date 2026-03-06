import { MODEL_OPTIONS } from '../constants/models.js';
import { isTauriRuntime, tauriInvoke, tauriListen } from './tauri.js';

function normalizeRuntimeConfig(runtime = {}) {
  if (!runtime || typeof runtime !== "object") return {};
  const apiUrl = typeof runtime.apiUrl === "string" ? runtime.apiUrl.trim() : "";
  const apiKeyFile = typeof runtime.apiKeyFile === "string" ? runtime.apiKeyFile.trim() : "";
  return {
    ...(apiUrl ? { api_url: apiUrl } : {}),
    ...(apiKeyFile ? { api_key_file: apiKeyFile } : {}),
  };
}

export function extractStreamTextChunk(payload) {
  const choice = payload?.choices?.[0];
  if (!choice) return "";

  const delta = choice.delta?.content;
  if (typeof delta === "string") return delta;
  if (Array.isArray(delta)) {
    return delta.map(part => (typeof part?.text === "string" ? part.text : "")).join("");
  }

  const messageContent = choice.message?.content;
  if (typeof messageContent === "string") return messageContent;
  if (Array.isArray(messageContent)) {
    return messageContent.map(part => (typeof part?.text === "string" ? part.text : "")).join("");
  }

  return "";
}

export async function llm(system, user, maxTokens = 2400, model = MODEL_OPTIONS[0].value, runtime = {}) {
  if (!isTauriRuntime()) throw new Error("Desktop runtime required.");
  const d = await tauriInvoke("openrouter_chat", {
    payload: { max_tokens: maxTokens, model, system, messages: [{ role: "user", content: user }] },
    runtime: normalizeRuntimeConfig(runtime),
  });
  if (d?.error?.message) throw new Error(d.error.message);
  return d.content[0].text;
}

export async function llmStream(system, user, onChunk, maxTokens = 2400, model = MODEL_OPTIONS[0].value, runtime = {}) {
  if (!isTauriRuntime()) throw new Error("Desktop runtime required.");
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  let fullText = "";
  let streamError = null;

  return new Promise(async (resolve, reject) => {
    let finished = false;
    let unlisten = null;

    const settle = (fn, value) => {
      if (finished) return;
      finished = true;
      if (typeof unlisten === "function") unlisten();
      fn(value);
    };

    try {
      unlisten = await tauriListen("openrouter_stream", (event) => {
        const payload = event.payload || {};
        if (payload.requestId !== requestId) return;

        if (payload.error) {
          streamError = payload.error;
        }
        if (typeof payload.chunk === "string" && payload.chunk.length) {
          fullText = typeof payload.fullText === "string" ? payload.fullText : (fullText + payload.chunk);
          onChunk(payload.chunk, fullText);
        }
      });

      await tauriInvoke("openrouter_chat_stream", {
        requestId,
        runtime: normalizeRuntimeConfig(runtime),
        payload: {
          max_tokens: maxTokens,
          model,
          system,
          stream: true,
          messages: [{ role: "user", content: user }],
        },
      });

      if (streamError) {
        settle(reject, new Error(streamError));
        return;
      }
      settle(resolve, fullText);
    } catch (e) {
      settle(reject, e instanceof Error ? e : new Error(String(e)));
    }
  });
}
