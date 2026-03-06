import { S } from '../styles/index.js';

export default function ApiKeyModal({ required, value, loading, onChange, onSave, onClear, onClose }) {
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
          Save your OpenRouter key to your device keychain. It is required for model requests in desktop mode.
        </div>
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
