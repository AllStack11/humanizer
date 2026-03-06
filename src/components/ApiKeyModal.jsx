import { S } from '../styles/index.js';

export default function ApiKeyModal({
  required,
  value,
  apiUrl,
  apiKeyFile,
  loading,
  onChange,
  onApiUrlChange,
  onApiKeyFileChange,
  onSave,
  onClear,
  onClose,
}) {
  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modalPanel} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHeader}>
          <h2 style={S.modalTitle}>OpenRouter API Key</h2>
          <button onClick={onClose} style={S.modalClose} disabled={required}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ marginBottom: 14, color: "#6b5d52", fontSize: 13, lineHeight: 1.6 }}>
          Configure endpoint + secret storage. For localhost providers (for example Ollama), API key can be empty.
        </div>
        <input
          value={apiUrl}
          onChange={(e) => onApiUrlChange(e.target.value)}
          placeholder="API URL (optional): https://openrouter.ai/api/v1/chat/completions"
          style={{ ...S.textInput, marginBottom: 10 }}
        />
        <input
          value={apiKeyFile}
          onChange={(e) => onApiKeyFileChange(e.target.value)}
          placeholder="Key file path (optional): .voice-humanizer/openrouter_api_key"
          style={{ ...S.textInput, marginBottom: 10 }}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="sk-or-..."
          style={S.textInput}
          autoFocus
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, gap: 10 }}>
          <button onClick={onClear} disabled={loading} style={S.ghostBtn} className="btn">
            Clear Saved Key
          </button>
          <button
            onClick={onSave}
            disabled={loading || !value.trim()}
            style={{ ...S.submitBtn, ...(loading || !value.trim() ? S.submitBtnDisabled : {}) }}
            className="btn"
          >
            {loading ? "Saving…" : "Save Key"}
          </button>
        </div>
      </div>
    </div>
  );
}
