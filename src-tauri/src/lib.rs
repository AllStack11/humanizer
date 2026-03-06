use chrono::Utc;
use futures_util::StreamExt;
use keyring::Entry;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;
use tauri::{Emitter, Manager, State};

const OPENROUTER_URL: &str = "https://openrouter.ai/api/v1/chat/completions";
const LOG_LIMIT: usize = 250;
const KEYRING_SERVICE: &str = "com.voicehumanizer.app";
const KEYRING_USERNAME: &str = "openrouter_api_key";

#[derive(Default)]
struct AppState {
  logs: Mutex<Vec<RequestLog>>,
  seq: AtomicU64,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
struct ChatMessage {
  role: String,
  content: String,
}

#[derive(Debug, Deserialize, Clone)]
struct OpenRouterPayload {
  model: String,
  system: Option<String>,
  messages: Option<Vec<ChatMessage>>,
  max_tokens: Option<u32>,
  temperature: Option<f64>,
  stream: Option<bool>,
}

#[derive(Debug, Serialize)]
struct ContentItem {
  text: String,
}

#[derive(Debug, Serialize)]
struct OpenRouterResult {
  content: Vec<ContentItem>,
  usage: Option<Value>,
}

#[allow(non_snake_case)]
#[derive(Debug, Serialize, Clone)]
struct StreamEventPayload {
  requestId: String,
  chunk: Option<String>,
  fullText: String,
  done: bool,
  error: Option<String>,
}

#[allow(non_snake_case)]
#[derive(Debug, Serialize, Clone)]
struct RequestLog {
  id: String,
  startedAt: String,
  route: String,
  stream: bool,
  model: String,
  request: Value,
  status: String,
  durationMs: Option<u128>,
  usage: Option<Value>,
  responsePreview: String,
  error: Option<String>,
}

#[derive(Debug, Serialize)]
struct RequestLogsResponse {
  logs: Vec<RequestLog>,
  count: usize,
}

#[derive(Debug, Serialize)]
struct OkResponse {
  ok: bool,
}

#[derive(Debug, Deserialize)]
struct DiagnosticLogPayload {
  route: String,
  status: Option<String>,
  stream: Option<bool>,
  model: Option<String>,
  request: Option<Value>,
  response_preview: Option<String>,
  error: Option<String>,
}

#[derive(Debug, Serialize)]
struct ApiKeyStatusResponse {
  #[serde(rename = "hasKey")]
  has_key: bool,
  source: String,
}

#[allow(non_snake_case)]
#[derive(Debug, Serialize)]
struct StylesBackupResponse {
  styles: Value,
  savedAt: Option<String>,
  path: String,
}

#[allow(non_snake_case)]
#[derive(Debug, Serialize)]
struct SaveStylesResponse {
  ok: bool,
  savedAt: String,
  path: String,
}

fn now_iso() -> String {
  Utc::now().to_rfc3339()
}

fn parse_env_file_key(key: &str) -> Option<String> {
  let env_path = std::env::current_dir().ok()?.join(".env");
  let text = fs::read_to_string(env_path).ok()?;

  for line in text.lines() {
    let trimmed = line.trim();
    if trimmed.is_empty() || trimmed.starts_with('#') {
      continue;
    }
    if let Some((k, v)) = trimmed.split_once('=') {
      if k.trim() == key {
        let value = v.trim().trim_matches('"').trim_matches('\'').to_string();
        if !value.is_empty() {
          return Some(value);
        }
      }
    }
  }

  None
}

fn env_or_dotenv(key: &str) -> Option<String> {
  std::env::var(key)
    .ok()
    .filter(|v| !v.trim().is_empty())
    .or_else(|| parse_env_file_key(key))
}

fn keyring_entry() -> Result<Entry, String> {
  Entry::new(KEYRING_SERVICE, KEYRING_USERNAME).map_err(|e| format!("Keyring init failed: {e}"))
}

fn read_api_key_from_keyring() -> Result<Option<String>, String> {
  let entry = keyring_entry()?;
  match entry.get_password() {
    Ok(value) => {
      let trimmed = value.trim().to_string();
      if trimmed.is_empty() {
        Ok(None)
      } else {
        Ok(Some(trimmed))
      }
    }
    Err(keyring::Error::NoEntry) => Ok(None),
    Err(e) => Err(format!("Failed to read API key from keychain: {e}")),
  }
}

fn resolve_api_key_with_source() -> Result<(Option<String>, &'static str), String> {
  if let Some(from_keyring) = read_api_key_from_keyring()? {
    return Ok((Some(from_keyring), "keychain"));
  }

  // Dev fallback only. Packaged/release builds must use keychain storage.
  if cfg!(debug_assertions) {
    if let Some(from_env) = env_or_dotenv("OPENROUTER_API_KEY") {
      return Ok((Some(from_env), "env"));
    }
  }

  Ok((None, "missing"))
}

fn resolve_api_key() -> Result<Option<String>, String> {
  let (key, _) = resolve_api_key_with_source()?;
  Ok(key)
}

#[tauri::command]
fn has_api_key() -> Result<bool, String> {
  Ok(resolve_api_key()?.is_some())
}

#[tauri::command]
fn get_api_key_status() -> Result<ApiKeyStatusResponse, String> {
  let (key, source) = resolve_api_key_with_source()?;
  Ok(ApiKeyStatusResponse {
    has_key: key.is_some(),
    source: source.to_string(),
  })
}

#[tauri::command]
fn set_api_key(key: String) -> Result<OkResponse, String> {
  let trimmed = key.trim();
  if trimmed.is_empty() {
    return Err("API key cannot be empty.".to_string());
  }

  let entry = keyring_entry()?;
  entry
    .set_password(trimmed)
    .map_err(|e| format!("Failed to save API key to keychain: {e}"))?;
  Ok(OkResponse { ok: true })
}

#[tauri::command]
fn clear_api_key() -> Result<OkResponse, String> {
  let entry = keyring_entry()?;
  match entry.delete_credential() {
    Ok(_) | Err(keyring::Error::NoEntry) => Ok(OkResponse { ok: true }),
    Err(e) => Err(format!("Failed to clear API key from keychain: {e}")),
  }
}

fn app_data_backup_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
  let dir = app
    .path()
    .app_data_dir()
    .map_err(|e| format!("Failed to resolve app data dir: {e}"))?;
  Ok(dir.join("writer-style-backup.json"))
}

fn rotate_backups(primary_path: &Path) -> Result<(), String> {
  let path_str = primary_path.to_string_lossy();
  let backup_1 = PathBuf::from(path_str.replace(".json", ".1.json"));
  let backup_2 = PathBuf::from(path_str.replace(".json", ".2.json"));

  if backup_1.exists() {
    fs::copy(&backup_1, &backup_2).map_err(|e| format!("Failed rotating backup .1 -> .2: {e}"))?;
  }
  if primary_path.exists() {
    fs::copy(primary_path, &backup_1).map_err(|e| format!("Failed rotating primary -> .1: {e}"))?;
  }

  Ok(())
}

fn add_log_entry(state: &State<'_, AppState>, payload: &OpenRouterPayload) -> String {
  let seq = state.seq.fetch_add(1, Ordering::Relaxed);
  let id = format!("{}-{}", Utc::now().timestamp_millis(), seq);

  let mut logs = state.logs.lock().expect("log mutex poisoned");
  logs.insert(
    0,
    RequestLog {
      id: id.clone(),
      startedAt: now_iso(),
      route: "tauri:openrouter".to_string(),
      stream: payload.stream.unwrap_or(false),
      model: payload.model.clone(),
      request: json!({
        "system": payload.system.clone().unwrap_or_default(),
        "messages": payload.messages.clone().unwrap_or_default(),
        "max_tokens": payload.max_tokens,
        "temperature": payload.temperature,
      }),
      status: "started".to_string(),
      durationMs: None,
      usage: None,
      responsePreview: String::new(),
      error: None,
    },
  );

  if logs.len() > LOG_LIMIT {
    logs.truncate(LOG_LIMIT);
  }

  id
}

fn update_log_entry(state: &State<'_, AppState>, id: &str, patch: Value) {
  let mut logs = state.logs.lock().expect("log mutex poisoned");
  if let Some(log) = logs.iter_mut().find(|entry| entry.id == id) {
    if let Some(status) = patch.get("status").and_then(Value::as_str) {
      log.status = status.to_string();
    }
    if let Some(duration) = patch.get("durationMs").and_then(Value::as_u64) {
      log.durationMs = Some(duration as u128);
    }
    if let Some(usage) = patch.get("usage") {
      log.usage = if usage.is_null() { None } else { Some(usage.clone()) };
    }
    if let Some(preview) = patch.get("responsePreview").and_then(Value::as_str) {
      log.responsePreview = preview.to_string();
    }
    if let Some(error) = patch.get("error").and_then(Value::as_str) {
      log.error = Some(error.to_string());
    }
  }
}

fn extract_text(openrouter_response: &Value) -> String {
  if let Some(text) = openrouter_response
    .get("content")
    .and_then(Value::as_array)
    .and_then(|arr| arr.first())
    .and_then(|x| x.get("text"))
    .and_then(Value::as_str)
  {
    return text.to_string();
  }

  if let Some(text) = openrouter_response
    .get("choices")
    .and_then(Value::as_array)
    .and_then(|arr| arr.first())
    .and_then(|choice| choice.get("message"))
    .and_then(|msg| msg.get("content"))
    .and_then(Value::as_str)
  {
    return text.to_string();
  }

  if let Some(parts) = openrouter_response
    .get("choices")
    .and_then(Value::as_array)
    .and_then(|arr| arr.first())
    .and_then(|choice| choice.get("message"))
    .and_then(|msg| msg.get("content"))
    .and_then(Value::as_array)
  {
    let mut full = String::new();
    for part in parts {
      if let Some(text) = part.get("text").and_then(Value::as_str) {
        full.push_str(text);
      }
    }
    return full;
  }

  String::new()
}

fn extract_stream_text_chunk(openrouter_response: &Value) -> String {
  let choice = openrouter_response
    .get("choices")
    .and_then(Value::as_array)
    .and_then(|arr| arr.first());
  let Some(choice) = choice else {
    return String::new();
  };

  let delta = choice.get("delta").and_then(|d| d.get("content"));
  if let Some(text) = delta.and_then(Value::as_str) {
    return text.to_string();
  }
  if let Some(parts) = delta.and_then(Value::as_array) {
    return parts
      .iter()
      .filter_map(|p| p.get("text").and_then(Value::as_str))
      .collect::<String>();
  }

  let message_content = choice.get("message").and_then(|m| m.get("content"));
  if let Some(text) = message_content.and_then(Value::as_str) {
    return text.to_string();
  }
  if let Some(parts) = message_content.and_then(Value::as_array) {
    return parts
      .iter()
      .filter_map(|p| p.get("text").and_then(Value::as_str))
      .collect::<String>();
  }

  String::new()
}

#[tauri::command]
async fn openrouter_chat(
  payload: OpenRouterPayload,
  state: State<'_, AppState>,
) -> Result<OpenRouterResult, String> {
  let api_key = resolve_api_key()?.ok_or_else(|| {
    if cfg!(debug_assertions) {
      "OpenRouter API key not found. Set it in app settings or OPENROUTER_API_KEY in .env for local dev.".to_string()
    } else {
      "OpenRouter API key not found. Open app settings and save your key.".to_string()
    }
  })?;

  let model = payload.model.trim().to_string();
  if model.is_empty() {
    return Err("Request requires model (selected in App).".to_string());
  }

  let mut messages: Vec<ChatMessage> = vec![];
  if let Some(system) = payload.system.clone() {
    if !system.trim().is_empty() {
      messages.push(ChatMessage {
        role: "system".to_string(),
        content: system.trim().to_string(),
      });
    }
  }
  if let Some(user_messages) = payload.messages.clone() {
    messages.extend(user_messages);
  }
  if messages.is_empty() {
    return Err("Request requires at least one message or system prompt.".to_string());
  }

  let log_id = add_log_entry(&state, &payload);
  let started = std::time::Instant::now();

  let app_url = env_or_dotenv("OPENROUTER_APP_URL").unwrap_or_else(|| "http://localhost:5173".to_string());
  let app_name = env_or_dotenv("OPENROUTER_APP_NAME").unwrap_or_else(|| "Voice Humanizer".to_string());
  let categories = env_or_dotenv("OPENROUTER_CATEGORIES").unwrap_or_default();

  let mut headers = HeaderMap::new();
  headers.insert(
    AUTHORIZATION,
    HeaderValue::from_str(&format!("Bearer {}", api_key)).map_err(|e| e.to_string())?,
  );
  headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
  headers.insert(
    "HTTP-Referer",
    HeaderValue::from_str(&app_url).map_err(|e| e.to_string())?,
  );
  headers.insert("X-Title", HeaderValue::from_str(&app_name).map_err(|e| e.to_string())?);
  if !categories.trim().is_empty() {
    headers.insert(
      "X-Categories",
      HeaderValue::from_str(categories.trim()).map_err(|e| e.to_string())?,
    );
  }

  let client = reqwest::Client::new();
  let request_body = json!({
    "model": model,
    "messages": messages,
    "max_tokens": payload.max_tokens.unwrap_or(1400),
    "temperature": payload.temperature,
  });

  let response = client
    .post(OPENROUTER_URL)
    .headers(headers)
    .json(&request_body)
    .send()
    .await
    .map_err(|e| {
      let msg = format!("Failed to reach OpenRouter: {e}");
      update_log_entry(
        &state,
        &log_id,
        json!({
          "status": "failed",
          "durationMs": started.elapsed().as_millis() as u64,
          "error": msg,
        }),
      );
      msg
    })?;

  if !response.status().is_success() {
    let status = response.status().as_u16();
    let body = response.text().await.unwrap_or_default();
    let message = serde_json::from_str::<Value>(&body)
      .ok()
      .and_then(|v| {
        v.get("error")
          .and_then(|e| e.get("message"))
          .and_then(Value::as_str)
          .map(|s| s.to_string())
      })
      .unwrap_or_else(|| format!("OpenRouter returned HTTP {status}"));

    update_log_entry(
      &state,
      &log_id,
      json!({
        "status": "failed",
        "durationMs": started.elapsed().as_millis() as u64,
        "error": message,
      }),
    );

    return Err(message);
  }

  let body = response
    .json::<Value>()
    .await
    .map_err(|e| format!("Failed to parse OpenRouter response: {e}"))?;

  let text = extract_text(&body);
  let usage = body.get("usage").cloned();
  let preview = text.chars().take(500).collect::<String>();

  update_log_entry(
    &state,
    &log_id,
    json!({
      "status": "completed",
      "durationMs": started.elapsed().as_millis() as u64,
      "usage": usage,
      "responsePreview": preview,
    }),
  );

  Ok(OpenRouterResult {
    content: vec![ContentItem { text }],
    usage,
  })
}

#[tauri::command]
async fn openrouter_chat_stream(
  request_id: String,
  payload: OpenRouterPayload,
  app: tauri::AppHandle,
  state: State<'_, AppState>,
) -> Result<OkResponse, String> {
  let api_key = resolve_api_key()?.ok_or_else(|| {
    if cfg!(debug_assertions) {
      "OpenRouter API key not found. Set it in app settings or OPENROUTER_API_KEY in .env for local dev.".to_string()
    } else {
      "OpenRouter API key not found. Open app settings and save your key.".to_string()
    }
  })?;

  let model = payload.model.trim().to_string();
  if model.is_empty() {
    return Err("Request requires model (selected in App).".to_string());
  }

  let mut messages: Vec<ChatMessage> = vec![];
  if let Some(system) = payload.system.clone() {
    if !system.trim().is_empty() {
      messages.push(ChatMessage {
        role: "system".to_string(),
        content: system.trim().to_string(),
      });
    }
  }
  if let Some(user_messages) = payload.messages.clone() {
    messages.extend(user_messages);
  }
  if messages.is_empty() {
    return Err("Request requires at least one message or system prompt.".to_string());
  }

  let log_id = add_log_entry(&state, &OpenRouterPayload { stream: Some(true), ..payload.clone() });
  let started = std::time::Instant::now();

  let app_url = env_or_dotenv("OPENROUTER_APP_URL").unwrap_or_else(|| "app://voice-humanizer".to_string());
  let app_name = env_or_dotenv("OPENROUTER_APP_NAME").unwrap_or_else(|| "Voice Humanizer".to_string());
  let categories = env_or_dotenv("OPENROUTER_CATEGORIES").unwrap_or_default();

  let mut headers = HeaderMap::new();
  headers.insert(
    AUTHORIZATION,
    HeaderValue::from_str(&format!("Bearer {}", api_key)).map_err(|e| e.to_string())?,
  );
  headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
  headers.insert(
    "HTTP-Referer",
    HeaderValue::from_str(&app_url).map_err(|e| e.to_string())?,
  );
  headers.insert("X-Title", HeaderValue::from_str(&app_name).map_err(|e| e.to_string())?);
  if !categories.trim().is_empty() {
    headers.insert(
      "X-Categories",
      HeaderValue::from_str(categories.trim()).map_err(|e| e.to_string())?,
    );
  }

  let client = reqwest::Client::new();
  let request_body = json!({
    "model": model,
    "messages": messages,
    "max_tokens": payload.max_tokens.unwrap_or(1400),
    "temperature": payload.temperature,
    "stream": true,
  });

  let response = client
    .post(OPENROUTER_URL)
    .headers(headers)
    .json(&request_body)
    .send()
    .await
    .map_err(|e| {
      let msg = format!("Failed to reach OpenRouter: {e}");
      update_log_entry(
        &state,
        &log_id,
        json!({
          "status": "failed",
          "durationMs": started.elapsed().as_millis() as u64,
          "error": msg,
        }),
      );
      msg
    })?;

  if !response.status().is_success() {
    let status = response.status().as_u16();
    let body = response.text().await.unwrap_or_default();
    let message = serde_json::from_str::<Value>(&body)
      .ok()
      .and_then(|v| {
        v.get("error")
          .and_then(|e| e.get("message"))
          .and_then(Value::as_str)
          .map(|s| s.to_string())
      })
      .unwrap_or_else(|| format!("OpenRouter returned HTTP {status}"));

    update_log_entry(
      &state,
      &log_id,
      json!({
        "status": "failed",
        "durationMs": started.elapsed().as_millis() as u64,
        "error": message.clone(),
      }),
    );

    let _ = app.emit(
      "openrouter_stream",
      StreamEventPayload {
        requestId: request_id.clone(),
        chunk: None,
        fullText: String::new(),
        done: true,
        error: Some(message.clone()),
      },
    );

    return Err(message);
  }

  let mut bytes_stream = response.bytes_stream();
  let mut buffer = String::new();
  let mut full_text = String::new();

  while let Some(next) = bytes_stream.next().await {
    let bytes = next.map_err(|e| format!("Stream read failed: {e}"))?;
    buffer.push_str(&String::from_utf8_lossy(&bytes).replace("\r\n", "\n"));

    let mut events: Vec<&str> = buffer.split("\n\n").collect();
    let tail = events.pop().unwrap_or_default().to_string();

    for event in events {
      let data_lines = event
        .lines()
        .filter(|line| line.starts_with("data:"))
        .map(|line| line[5..].trim())
        .collect::<Vec<_>>();

      if data_lines.is_empty() {
        continue;
      }
      let data = data_lines.join("\n");
      if data == "[DONE]" {
        continue;
      }

      let payload: Value = match serde_json::from_str(&data) {
        Ok(value) => value,
        Err(_) => continue,
      };

      if let Some(message) = payload
        .get("error")
        .and_then(|err| err.get("message"))
        .and_then(Value::as_str)
      {
        let _ = app.emit(
          "openrouter_stream",
          StreamEventPayload {
            requestId: request_id.clone(),
            chunk: None,
            fullText: full_text.clone(),
            done: true,
            error: Some(message.to_string()),
          },
        );

        update_log_entry(
          &state,
          &log_id,
          json!({
            "status": "failed",
            "durationMs": started.elapsed().as_millis() as u64,
            "error": message,
          }),
        );
        return Err(message.to_string());
      }

      let chunk = extract_stream_text_chunk(&payload);
      if chunk.is_empty() {
        continue;
      }
      full_text.push_str(&chunk);

      let _ = app.emit(
        "openrouter_stream",
        StreamEventPayload {
          requestId: request_id.clone(),
          chunk: Some(chunk),
          fullText: full_text.clone(),
          done: false,
          error: None,
        },
      );
    }

    buffer = tail;
  }

  let preview = full_text.chars().take(500).collect::<String>();
  update_log_entry(
    &state,
    &log_id,
    json!({
      "status": "completed",
      "durationMs": started.elapsed().as_millis() as u64,
      "responsePreview": preview,
    }),
  );

  let _ = app.emit(
    "openrouter_stream",
    StreamEventPayload {
      requestId: request_id,
      chunk: None,
      fullText: full_text,
      done: true,
      error: None,
    },
  );

  Ok(OkResponse { ok: true })
}

#[tauri::command]
fn get_request_logs(state: State<'_, AppState>) -> RequestLogsResponse {
  let logs = state.logs.lock().expect("log mutex poisoned");
  RequestLogsResponse {
    logs: logs.clone(),
    count: logs.len(),
  }
}

#[tauri::command]
fn clear_request_logs(state: State<'_, AppState>) -> OkResponse {
  let mut logs = state.logs.lock().expect("log mutex poisoned");
  logs.clear();
  OkResponse { ok: true }
}

#[tauri::command]
fn add_diagnostic_log(payload: DiagnosticLogPayload, state: State<'_, AppState>) -> Result<OkResponse, String> {
  let route = payload.route.trim().to_string();
  if route.is_empty() {
    return Err("Diagnostic route is required.".to_string());
  }

  let seq = state.seq.fetch_add(1, Ordering::Relaxed);
  let id = format!("{}-{}", Utc::now().timestamp_millis(), seq);

  let mut logs = state.logs.lock().expect("log mutex poisoned");
  logs.insert(
    0,
    RequestLog {
      id,
      startedAt: now_iso(),
      route,
      stream: payload.stream.unwrap_or(false),
      model: payload.model.unwrap_or_else(|| "system".to_string()),
      request: payload.request.unwrap_or_else(|| json!({})),
      status: payload.status.unwrap_or_else(|| "info".to_string()),
      durationMs: None,
      usage: None,
      responsePreview: payload.response_preview.unwrap_or_default(),
      error: payload.error,
    },
  );

  if logs.len() > LOG_LIMIT {
    logs.truncate(LOG_LIMIT);
  }

  Ok(OkResponse { ok: true })
}

#[tauri::command]
fn get_styles_backup(app: tauri::AppHandle) -> Result<StylesBackupResponse, String> {
  let path = app_data_backup_path(&app)?;

  if !path.exists() {
    return Ok(StylesBackupResponse {
      styles: json!({}),
      savedAt: None,
      path: path.display().to_string(),
    });
  }

  let raw = fs::read_to_string(&path).map_err(|e| format!("Failed to read backup file: {e}"))?;
  let parsed = serde_json::from_str::<Value>(&raw).unwrap_or_else(|_| json!({}));
  let styles = parsed
    .get("styles")
    .filter(|v| v.is_object())
    .cloned()
    .unwrap_or_else(|| json!({}));

  Ok(StylesBackupResponse {
    styles,
    savedAt: parsed
      .get("savedAt")
      .and_then(Value::as_str)
      .map(|s| s.to_string()),
    path: path.display().to_string(),
  })
}

#[tauri::command]
fn save_styles_backup(app: tauri::AppHandle, styles: Value) -> Result<SaveStylesResponse, String> {
  if !styles.is_object() {
    return Err("Invalid styles payload".to_string());
  }

  let path = app_data_backup_path(&app)?;
  if let Some(parent) = path.parent() {
    fs::create_dir_all(parent).map_err(|e| format!("Failed to create backup directory: {e}"))?;
  }
  rotate_backups(&path)?;

  let saved_at = now_iso();
  let payload = json!({
    "version": 1,
    "savedAt": saved_at,
    "styles": styles,
  });

  let formatted = serde_json::to_string_pretty(&payload)
    .map_err(|e| format!("Failed to serialize backup payload: {e}"))?;
  let tmp_path = PathBuf::from(format!("{}.tmp", path.to_string_lossy()));
  fs::write(&tmp_path, formatted).map_err(|e| format!("Failed to write temp backup file: {e}"))?;

  if path.exists() {
    fs::remove_file(&path).map_err(|e| format!("Failed to replace previous backup file: {e}"))?;
  }
  fs::rename(&tmp_path, &path).map_err(|e| format!("Failed to move temp backup into place: {e}"))?;

  Ok(SaveStylesResponse {
    ok: true,
    savedAt: saved_at,
    path: path.display().to_string(),
  })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_log::Builder::default().build())
    .manage(AppState::default())
    .invoke_handler(tauri::generate_handler![
      has_api_key,
      get_api_key_status,
      set_api_key,
      clear_api_key,
      openrouter_chat,
      openrouter_chat_stream,
      get_styles_backup,
      save_styles_backup,
      get_request_logs,
      clear_request_logs,
      add_diagnostic_log,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
