import { buildDiffSegments } from '../utils/diff.js';
import { ELAB_DEPTHS } from '../constants/tones.js';
import { S } from '../styles/index.js';

export default function OutputPanel({
  mode, originalText, outputText, elabDepth, copied, variants, sentenceOptions, selectedSentenceIndex,
  onSelectSentence, onRewriteSentence, onGenerateVariants, onApplyVariant, showDiff, onToggleDiff,
  readabilityBefore, readabilityAfter, delta, historyIndex, historySize, onHistoryPrev, onHistoryNext,
  onCopy, onAppend, onDiscard
}) {
  const diffSegments = buildDiffSegments(originalText, outputText);
  return (
    <div style={S.outputCard} className="view-enter">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <button style={S.ghostBtn} className="btn" onClick={onToggleDiff}>{showDiff ? "Hide Diff" : "Show Diff"}</button>
        <button style={S.ghostBtn} className="btn" onClick={onGenerateVariants}>Generate Variants</button>
        <button style={{ ...S.ghostBtn, ...(selectedSentenceIndex == null ? { opacity: 0.6 } : {}) }} className="btn" onClick={onRewriteSentence} disabled={selectedSentenceIndex == null}>
          Rewrite This Sentence
        </button>
        <button style={S.ghostBtn} className="btn" onClick={onHistoryPrev} disabled={historyIndex <= 0}>Prev</button>
        <button style={S.ghostBtn} className="btn" onClick={onHistoryNext} disabled={historyIndex >= historySize - 1}>Next</button>
        <span style={S.ctrlLabel}>
          Readability {readabilityBefore} → {readabilityAfter}
        </span>
        <span style={S.ctrlLabel}>
          Words {delta.beforeWords} → {delta.afterWords} ({delta.wordDelta >= 0 ? "+" : ""}{delta.wordDelta})
        </span>
        <span style={S.ctrlLabel}>
          Chars {delta.beforeChars} → {delta.afterChars} ({delta.charDelta >= 0 ? "+" : ""}{delta.charDelta})
        </span>
      </div>
      {showDiff && (
        <div style={S.diffBox}>
          {diffSegments.map((segment, index) => (
            <span
              key={`${segment.type}-${index}`}
              style={
                segment.type === "added"
                  ? S.diffAdded
                  : segment.type === "removed"
                    ? S.diffRemoved
                    : undefined
              }
            >
              {segment.text}
            </span>
          ))}
        </div>
      )}
      {mode === "humanize" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <div style={S.outputLabel}>Original</div>
            <div style={S.outputBox}>{originalText}</div>
          </div>
          <div>
            <div style={{ ...S.outputLabel, color: "var(--accent)" }}>In Your Voice</div>
            <div style={{ ...S.outputBox, borderColor: "#e8d9b8", background: "#fffbf3" }}>
              {sentenceOptions.map((sentence, index) => (
                <button
                  key={`${sentence}-${index}`}
                  className="btn"
                  style={{
                    border: "none",
                    background: selectedSentenceIndex === index ? "rgba(200,169,110,0.2)" : "transparent",
                    textAlign: "left",
                    width: "100%",
                    padding: "1px 0",
                    cursor: "pointer",
                    borderRadius: 4,
                  }}
                  onClick={() => onSelectSentence(index)}
                >
                  {sentence}{" "}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ ...S.outputLabel, color: "var(--accent)", marginBottom: 10 }}>
            Elaboration — {ELAB_DEPTHS[elabDepth].label}
          </div>
          <div style={{ ...S.outputBox, fontStyle: "italic", borderColor: "#e8d9b8", background: "#fffbf3" }}>{outputText}</div>
        </div>
      )}
      <div style={S.outputActions}>
        {variants.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {variants.map((variant, idx) => (
              <button key={idx} onClick={() => onApplyVariant(variant)} style={S.ghostBtn} className="btn">
                Variant {idx + 1}
              </button>
            ))}
          </div>
        )}
        {mode === "elaborate" && (
          <button onClick={onAppend} style={S.ghostBtn} className="btn">Append &amp; Continue</button>
        )}
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <button onClick={onDiscard} style={S.ghostBtn} className="btn">Discard</button>
          <button onClick={onCopy} style={S.copyBtn} className="btn">
            {copied ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                Copied
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                Copy
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
