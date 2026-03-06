import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_FREE_MODELS = [
  'openai/gpt-oss-20b:free',
  'google/gemma-3-4b-it:free',
  'qwen/qwen3-4b:free',
];

function parseEnvFile(envPath) {
  if (!existsSync(envPath)) return {};
  const text = readFileSync(envPath, 'utf8');
  const out = {};
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const withoutExport = line.startsWith('export ') ? line.slice(7).trim() : line;
    const idx = withoutExport.indexOf('=');
    if (idx === -1) continue;
    const key = withoutExport.slice(0, idx).trim();
    let value = withoutExport.slice(idx + 1).trim();
    if (!value.startsWith('"') && !value.startsWith("'")) {
      value = value.split('#')[0].trim();
    }
    value = value.replace(/^"|"$/g, '').replace(/^'|'$/g, '').trim();
    if (!value && key === 'OPENROUTER_API_KEY') {
      for (let j = i + 1; j < lines.length; j += 1) {
        const next = lines[j].trim();
        if (!next || next.startsWith('#')) continue;
        if (next.includes('=')) break;
        value = next.replace(/^"|"$/g, '').replace(/^'|'$/g, '').trim();
        break;
      }
    }
    if (key) out[key] = value;
  }
  return out;
}

function loadEnv() {
  const envFile = parseEnvFile(resolve(process.cwd(), '.env'));
  return {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || envFile.OPENROUTER_API_KEY || '',
    OPENROUTER_APP_URL: process.env.OPENROUTER_APP_URL || envFile.OPENROUTER_APP_URL || 'http://localhost:5173',
    OPENROUTER_APP_NAME: process.env.OPENROUTER_APP_NAME || envFile.OPENROUTER_APP_NAME || 'Voice Humanizer',
    OPENROUTER_CATEGORIES: process.env.OPENROUTER_CATEGORIES || envFile.OPENROUTER_CATEGORIES || '',
  };
}

function buildHeaders(env) {
  const headers = {
    'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': env.OPENROUTER_APP_URL,
    'X-Title': env.OPENROUTER_APP_NAME,
  };
  if (env.OPENROUTER_CATEGORIES) headers['X-Categories'] = env.OPENROUTER_CATEGORIES;
  return headers;
}

async function assertJsonResponse(response, label) {
  const bodyText = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    throw new Error(`${label} returned non-JSON body (${response.status}): ${bodyText.slice(0, 400)}`);
  }

  if (!response.ok) {
    const msg = parsed?.error?.message || `${label} failed with HTTP ${response.status}`;
    throw new Error(msg);
  }

  return parsed;
}

async function runNonStreamTest(env, model) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: buildHeaders(env),
    body: JSON.stringify({
      model,
      max_tokens: 32,
      temperature: 0,
      messages: [{ role: 'user', content: 'Reply with the single word: pong' }],
    }),
  });

  const parsed = await assertJsonResponse(response, 'non-stream request');
  const text = parsed?.choices?.[0]?.message?.content || parsed?.content?.[0]?.text || '';
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('non-stream request returned no text content');
  }
  return text.trim();
}

async function runStreamTest(env, model) {
  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: buildHeaders(env),
    body: JSON.stringify({
      model,
      stream: true,
      max_tokens: 48,
      temperature: 0,
      messages: [{ role: 'user', content: 'Reply with exactly: stream-ok' }],
    }),
  });

  if (!response.ok) {
    const parsed = await assertJsonResponse(response, 'stream request');
    throw new Error(parsed?.error?.message || 'stream request failed');
  }

  if (!response.body) {
    throw new Error('stream request returned no response body');
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();
  let buffer = '';
  let fullText = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const event of events) {
      const dataLines = event
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trim());

      if (!dataLines.length) continue;
      const data = dataLines.join('\n');
      if (data === '[DONE]') continue;

      let parsed;
      try {
        parsed = JSON.parse(data);
      } catch {
        continue;
      }

      if (parsed?.error?.message) {
        throw new Error(parsed.error.message);
      }

      const choice = parsed?.choices?.[0] || {};
      const delta = choice?.delta?.content;
      if (typeof delta === 'string') {
        fullText += delta;
      } else if (Array.isArray(delta)) {
        fullText += delta.map((part) => (typeof part?.text === 'string' ? part.text : '')).join('');
      }
    }
  }

  if (!fullText.trim()) {
    throw new Error('stream request produced no text');
  }
  return fullText.trim();
}

async function discoverFreeModels() {
  const response = await fetch('https://openrouter.ai/api/v1/models');
  if (!response.ok) {
    throw new Error(`model list request failed with HTTP ${response.status}`);
  }
  const parsed = await response.json();
  const ids = Array.isArray(parsed?.data)
    ? parsed.data
      .map((item) => item?.id)
      .filter((id) => typeof id === 'string' && id.endsWith(':free'))
    : [];

  return ids.slice(0, 12);
}

async function main() {
  const env = loadEnv();
  if (!env.OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is missing. Set it in .env or environment variables.');
  }

  const requestedModel = process.env.OPENROUTER_TEST_MODEL?.trim();
  let candidateModels = requestedModel ? [requestedModel] : [];
  if (!candidateModels.length) {
    try {
      const discovered = await discoverFreeModels();
      candidateModels = discovered.length ? discovered : DEFAULT_FREE_MODELS;
    } catch {
      candidateModels = DEFAULT_FREE_MODELS;
    }
  }
  let lastError = null;

  for (const model of candidateModels) {
    try {
      console.log(`Running OpenRouter integration checks with model: ${model}`);
      const nonStreamText = await runNonStreamTest(env, model);
      console.log(`Non-stream OK: ${nonStreamText.slice(0, 120)}`);

      const streamText = await runStreamTest(env, model);
      console.log(`Stream OK: ${streamText.slice(0, 120)}`);
      console.log('OpenRouter integration checks passed.');
      return;
    } catch (error) {
      lastError = error;
      console.error(`Model failed (${model}): ${error?.message || String(error)}`);
    }
  }

  throw lastError || new Error('No test model could complete OpenRouter integration checks.');
}

main().catch((error) => {
  console.error(`OpenRouter integration check failed: ${error?.message || String(error)}`);
  process.exit(1);
});
