import { useRef, useCallback } from "react";
import { buildMirrorSegments } from '../utils/diff.js';
import { S } from '../styles/index.js';

export default function WriterPanel({
  inputText, onChange, mode, spellErrors, loading, spellLoading, grammarMode, onGrammarModeChange,
  hasStyle, words, clicheRanges, onCheckSpelling, onSubmit
}) {
  const textareaRef = useRef(null);
  const mirrorRef   = useRef(null);

  const syncScroll = useCallback(() => {
    if (mirrorRef.current && textareaRef.current) {
      mirrorRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const mirrorContent = buildMirrorSegments(inputText, spellErrors, clicheRanges);
  const minChars = mode === "humanize" ? 20 : 10;
  const canSubmit = !loading && hasStyle && inputText.trim().length >= minChars;

  return (
    <div style={S.writerCard}>
      <div style={{ position: "relative", minHeight: 200 }}>
        {/* Mirror layer */}
        <div ref={mirrorRef} style={S.mirror} aria-hidden="true">
          {mirrorContent.map((seg, i) =>
            seg.kind === "error" ? (
              <mark key={i} style={S.mirrorMark}>{seg.text}</mark>
            ) : seg.kind === "cliche" ? (
              <mark key={i} style={S.mirrorCliche}>{seg.text}</mark>
            ) : (
              <span key={i}>{seg.text}</span>
            )
          )}
          <span> </span>
        </div>
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={e => onChange(e.target.value)}
          onScroll={syncScroll}
          placeholder={mode === "humanize" ? "Paste AI-generated text here…" : "Write something to elaborate on…"}
          style={S.writerTextarea}
        />
      </div>

      {/* Action bar */}
      <div style={S.writerActions}>
        <div style={S.writerActionsLeft}>
          <button
            style={S.spellBtn}
            onClick={onCheckSpelling}
            disabled={spellLoading || inputText.trim().length < 3}
            className="btn"
          >
            {spellLoading ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="spin"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                Checking…
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                Check Spelling
              </>
            )}
          </button>
          <label style={{ ...S.ctrlLabel, display: "flex", alignItems: "center", gap: 4 }}>
            <input
              type="checkbox"
              checked={grammarMode}
              onChange={(e) => onGrammarModeChange(e.target.checked)}
            />
            Grammar mode
          </label>
          <span style={S.wordCount}>{words} word{words !== 1 ? "s" : ""}</span>
          <button
            style={S.clearBtn}
            onClick={() => onChange("")}
            disabled={!inputText}
            className="btn"
          >
            Clear
          </button>
        </div>
        <button
          style={{ ...S.submitBtn, ...(canSubmit ? {} : S.submitBtnDisabled) }}
          onClick={onSubmit}
          disabled={!canSubmit}
          className="btn"
        >
          {loading
            ? (mode === "humanize" ? "Rewriting…" : "Expanding…")
            : !hasStyle
              ? "Onboard profile first"
              : mode === "humanize" ? "Humanize" : "Elaborate"
          }
          {!loading && hasStyle && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
