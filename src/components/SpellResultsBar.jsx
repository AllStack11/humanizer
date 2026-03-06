import { S } from '../styles/index.js';

export default function SpellResultsBar({ spellResult, expandedPill, onExpandPill, onUseCorrection, onDismiss }) {
  if (spellResult.totalErrors === 0) {
    return (
      <div style={S.spellBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#16a34a", fontSize: 13 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          No spelling errors found.
        </div>
        <button onClick={onDismiss} style={S.spellDismiss}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    );
  }

  return (
    <div style={S.spellBar}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#8a7a6e", flexShrink: 0 }}>
          {spellResult.totalErrors} error{spellResult.totalErrors !== 1 ? "s" : ""}
        </span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {spellResult.errors.map((err, i) => (
            <div key={i} style={{ position: "relative" }}>
              <button
                style={{ ...S.errorPill, ...(expandedPill === i ? S.errorPillActive : {}) }}
                onClick={() => onExpandPill(expandedPill === i ? null : i)}
                className="btn"
              >
                <span style={{ color: "#dc2626", textDecoration: "line-through", fontFamily: "'JetBrains Mono', monospace" }}>{err.wrong}</span>
                <span style={{ color: "#8a7a6e" }}>→</span>
                <span style={{ color: "#16a34a", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{err.correct}</span>
                {err.category && (
                  <span style={S.pillCat}>{err.category.replace("-"," ")}</span>
                )}
              </button>
              {expandedPill === i && (
                <div style={S.pillPopover}>
                  <div style={{ marginBottom: 8 }}>
                    <span style={S.popoverLabel}>Rule</span>
                    <div style={S.popoverText}>{err.rule}</div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <span style={S.popoverLabel}>Memory trick</span>
                    <div style={S.popoverText}>{err.trick}</div>
                  </div>
                  <div>
                    <span style={S.popoverLabel}>Etymology</span>
                    <div style={{ ...S.popoverText, fontStyle: "italic", color: "#a09080" }}>{err.etymology}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button onClick={onUseCorrection} style={S.useCorrectedBtn} className="btn">
          Use corrected
        </button>
        <button onClick={onDismiss} style={S.spellDismiss}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  );
}
