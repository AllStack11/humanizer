import { useState, useEffect } from "react";
import { load, save } from '../lib/storage.js';
import { normalizeSampleSlot, getFilledSlots } from '../utils/profile.js';
import { WRITING_SAMPLE_TYPES, DEFAULT_SAMPLE_TYPE, DEFAULT_SLOTS, STYLE_MODAL_DRAFT_KEY } from '../constants/index.js';
import { S } from '../styles/index.js';

export default function StyleModal({ hasProfile, loading, onTrainProfile, onClose }) {
  const initialSlots = DEFAULT_SLOTS.slice(0, 1).map((slot, i) => normalizeSampleSlot(slot, i + 1));
  const [trainSlots, setTrainSlots] = useState(initialSlots);
  const [poolInput, setPoolInput] = useState("");
  const [poolType, setPoolType] = useState(DEFAULT_SAMPLE_TYPE);
  const [dropActive, setDropActive] = useState(false);

  const filledSlots = getFilledSlots(trainSlots);
  const totalChars = trainSlots.reduce((s, t) => s + t.text.trim().length, 0);

  function nextSlotId(slots) {
    if (!slots.length) return 1;
    return Math.max(...slots.map((slot) => slot.id)) + 1;
  }

  function addBlankPiece() {
    setTrainSlots((prev) => [
      ...prev,
      normalizeSampleSlot({ id: nextSlotId(prev), text: "", type: poolType }, nextSlotId(prev)),
    ]);
  }

  function appendPoolText(rawText, type = poolType) {
    const raw = (rawText || "").trim();
    if (!raw) return;
    const chunks = raw.split(/\n{2,}/).map((chunk) => chunk.trim()).filter(Boolean);
    const pieces = chunks.length > 1 ? chunks : [raw];

    setTrainSlots((prev) => {
      let idCursor = nextSlotId(prev);
      const additions = pieces.map((piece) => normalizeSampleSlot(
        { id: idCursor++, text: piece, type },
        idCursor
      ));
      return [...prev, ...additions];
    });
  }

  useEffect(() => {
    (async () => {
      const draft = await load(STYLE_MODAL_DRAFT_KEY);
      if (!draft || typeof draft !== "object") return;
      if (Array.isArray(draft.trainSlots) && draft.trainSlots.length) {
        const normalizedSlots = draft.trainSlots.map((slot, i) => normalizeSampleSlot(slot, i + 1));
        setTrainSlots(normalizedSlots);
      } else if (Array.isArray(draft.trainSlots) && !draft.trainSlots.length) {
        setTrainSlots(initialSlots);
      }
      if (typeof draft.poolInput === "string") setPoolInput(draft.poolInput);
      if (typeof draft.poolType === "string" && WRITING_SAMPLE_TYPES.some((type) => type.value === draft.poolType)) {
        setPoolType(draft.poolType);
      }
    })();
  }, []);

  useEffect(() => {
    save(STYLE_MODAL_DRAFT_KEY, {
      trainSlots,
      poolInput,
      poolType,
      updatedAt: new Date().toISOString(),
    });
  }, [trainSlots, poolInput, poolType]);

  function resetDraft() {
    setTrainSlots(initialSlots);
    setPoolInput("");
    setPoolType(DEFAULT_SAMPLE_TYPE);
    save(STYLE_MODAL_DRAFT_KEY, null);
  }

  function removeSlot(id) {
    if (trainSlots.length <= 1) return;
    setTrainSlots((prev) => prev.filter((slot) => slot.id !== id));
  }

  function addPastedContent() {
    appendPoolText(poolInput, poolType);
    setPoolInput("");
  }

  async function handleDrop(event) {
    event.preventDefault();
    setDropActive(false);

    const text = event.dataTransfer?.getData("text/plain")?.trim();
    if (text) {
      appendPoolText(text, poolType);
      return;
    }

    const firstFile = event.dataTransfer?.files?.[0];
    if (!firstFile) return;
    if (!firstFile.type.startsWith("text/") && !firstFile.name.endsWith(".md") && !firstFile.name.endsWith(".txt")) return;

    const fileText = await firstFile.text();
    appendPoolText(fileText, poolType);
  }

  async function handleSubmit() {
    const ok = await onTrainProfile(trainSlots);
    if (ok) resetDraft();
  }

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modalPanel} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={S.modalHeader}>
          <h2 style={S.modalTitle}>{hasProfile ? "Grow Your Writing Profile" : "Onboard Your Writing Profile"}</h2>
          <button onClick={onClose} style={S.modalClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ marginBottom: 20, color: "#6b5d52", fontSize: 13, lineHeight: 1.6 }}>
          Build a style pool by dropping or pasting your writing. Every piece stays editable and can be refined over time.
        </div>

        <div style={S.fieldLabel}>Drop / Paste Writing</div>
        <div
          style={{
            border: `1px dashed ${dropActive ? "var(--accent)" : "#d4cdc0"}`,
            borderRadius: 10,
            background: dropActive ? "#fffbf3" : "#faf7f0",
            padding: 12,
            margin: "10px 0 16px",
            transition: "all 0.18s",
          }}
          onDragOver={(e) => { e.preventDefault(); setDropActive(true); }}
          onDragLeave={() => setDropActive(false)}
          onDrop={handleDrop}
        >
          <textarea
            value={poolInput}
            onChange={(e) => setPoolInput(e.target.value)}
            placeholder="Paste one or more writing snippets. Separate pieces with a blank line."
            style={{ ...S.textareaField, minHeight: 120 }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={S.sampleTypeLabel}>Classify as</span>
              <select value={poolType} onChange={(e) => setPoolType(e.target.value)} style={S.sampleTypeSelect}>
                {WRITING_SAMPLE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={addPastedContent}
              disabled={!poolInput.trim()}
              style={{ ...S.submitBtn, ...(!poolInput.trim() ? S.submitBtnDisabled : {}), padding: "8px 14px" }}
              className="btn"
            >
              Add To Pool
            </button>
          </div>
          <div style={{ ...S.ctrlLabel, marginTop: 8 }}>
            Tip: drop plain text files or paste text blocks. Blank lines split into separate style pieces.
          </div>
        </div>

        <div style={S.fieldLabel}>Style Pieces ({trainSlots.length})</div>
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          {trainSlots.map((slot) => (
            <div key={slot.id} style={{ border: "1px solid #e5dfd5", borderRadius: 10, background: "#faf7f0", padding: 10 }}>
              <div style={S.sampleTypeRow}>
                <label style={S.sampleTypeLabel} htmlFor={`sample-type-${slot.id}`}>Piece {slot.id}</label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={S.slotStat}>{slot.text.trim().length.toLocaleString()} chars</span>
                  <button
                    onClick={() => removeSlot(slot.id)}
                    disabled={trainSlots.length <= 1}
                    style={{ ...S.ghostBtn, padding: "4px 9px", fontSize: 11 }}
                    className="btn"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={S.sampleTypeLabel}>Sample form</span>
                <select
                  id={`sample-type-${slot.id}`}
                  value={slot.type}
                  onChange={e => setTrainSlots(p => p.map(s => s.id === slot.id ? { ...s, type: e.target.value } : s))}
                  style={S.sampleTypeSelect}
                >
                  {WRITING_SAMPLE_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <textarea
                value={slot.text}
                onChange={e => setTrainSlots(p => p.map(s => s.id === slot.id ? { ...s, text: e.target.value } : s))}
                placeholder={`Paste ${WRITING_SAMPLE_TYPES.find(t => t.value === slot.type)?.label.toLowerCase() || "writing"} here. Aim for 150+ chars.`}
                style={{ ...S.textareaField, minHeight: 130 }}
              />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, gap: 8, flexWrap: "wrap" }}>
          <span style={S.slotStat}>{filledSlots.length} sample{filledSlots.length !== 1 ? "s" : ""} ready · {totalChars.toLocaleString()} chars</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={addBlankPiece} style={S.addSlotBtn} className="add-slot-btn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Blank Piece
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !filledSlots.length}
              style={{ ...S.submitBtn, ...(loading || !filledSlots.length ? S.submitBtnDisabled : {}) }}
              className="btn"
            >
              {loading ? "Processing…" : hasProfile ? "Merge Into Profile" : "Create Profile"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
