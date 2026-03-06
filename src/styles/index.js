export const S = {
  root: { minHeight: "100vh", background: "#faf7f0", color: "#1a1208", fontFamily: "'Inter', system-ui, sans-serif" },

  // Topbar
  topbar: { position: "sticky", top: 0, zIndex: 40, background: "#faf7f0", borderBottom: "1px solid #e5dfd5" },
  topbarInner: { maxWidth: 1180, margin: "0 auto", padding: "10px 24px", minHeight: 58, display: "flex", flexDirection: "column", gap: 8 },
  topbarRow: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  topbarMetaRow: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 },
  brand: { display: "flex", alignItems: "center", gap: 9, flexShrink: 0 },
  brandName: { fontFamily: "'Special Elite', cursive", fontSize: 18, color: "#1a1208", letterSpacing: "0.01em" },

  // Profile badge
  stylePickerWrap: { minWidth: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  profileBadge: {
    fontSize: 12,
    color: "#8a7a6e",
    background: "#fff",
    border: "1px solid #e5dfd5",
    borderRadius: 8,
    padding: "7px 14px",
    fontFamily: "'JetBrains Mono', monospace",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    maxWidth: "100%",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  refreshBtn: { background: "transparent", border: "none", cursor: "pointer", color: "#a09080", display: "flex", alignItems: "center", padding: 0 },
  newStyleBtn: { background: "var(--accent)", color: "#faf7f0", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif", fontWeight: 500, flexShrink: 0, whiteSpace: "nowrap" },

  // Toast
  toast: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13, border: "1px solid", animation: "fadeIn 0.2s ease" },
  toastError: { background: "#fef2f2", borderColor: "#fecaca", color: "#dc2626" },
  toastSuccess: { background: "#f0fdf4", borderColor: "#bbf7d0", color: "#16a34a" },
  toastClose: { background: "transparent", border: "none", cursor: "pointer", color: "inherit", display: "flex", alignItems: "center", padding: 0 },

  // Main
  main: { maxWidth: 820, margin: "0 auto", padding: "28px 24px 80px" },

  // Controls card
  controlsCard: { background: "#fff", border: "1px solid #e5dfd5", borderRadius: 12, padding: "14px 20px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  modeGroup: { display: "flex", gap: 4 },
  modeBtn: { background: "transparent", border: "1px solid #e5dfd5", borderRadius: 7, padding: "6px 16px", fontSize: 13, color: "#6b5d52", cursor: "pointer", fontFamily: "'Inter', sans-serif", fontWeight: 500, transition: "all 0.18s" },
  modeBtnActive: { background: "var(--accent)", borderColor: "var(--accent)", color: "#faf7f0" },
  ctrlDivider: { width: 1, height: 22, background: "#e5dfd5", flexShrink: 0 },
  toneGroup: { display: "flex", alignItems: "center", gap: 8 },
  ctrlLabel: { fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#a09080", whiteSpace: "nowrap" },
  modelSelect: { background: "#fff", border: "1px solid #e5dfd5", borderRadius: 7, padding: "5px 9px", color: "#6b5d52", fontSize: 12, fontFamily: "'Inter', sans-serif", minWidth: 180 },
  topbarControls: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginLeft: "auto" },
  segBar: { display: "flex", gap: 3 },
  seg: { width: 28, height: 5, borderRadius: 3, border: "none", cursor: "pointer", transition: "background 0.18s" },

  // Writer card
  writerCard: { background: "#fff", border: "1px solid #e5dfd5", borderRadius: 14, marginBottom: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" },
  mirror: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    fontFamily: "'Inter', system-ui, sans-serif", fontSize: 15, lineHeight: 1.8,
    padding: "18px 20px", whiteSpace: "pre-wrap", wordWrap: "break-word",
    overflowY: "auto", color: "transparent", pointerEvents: "none",
    tabSize: 2,
  },
  mirrorMark: {
    background: "transparent",
    borderBottom: "2px solid var(--accent)",
    color: "transparent",
  },
  mirrorCliche: {
    background: "rgba(245, 158, 11, 0.22)",
    color: "transparent",
    borderRadius: 2,
  },
  writerTextarea: {
    position: "relative", display: "block", width: "100%", minHeight: 220,
    background: "transparent", border: "none", resize: "vertical",
    fontFamily: "'Inter', system-ui, sans-serif", fontSize: 15, lineHeight: 1.8,
    color: "#1a1208", padding: "18px 20px", outline: "none",
    boxShadow: "none",
  },
  writerActions: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderTop: "1px solid #f0ece0", gap: 10, flexWrap: "wrap" },
  writerActionsLeft: { display: "flex", alignItems: "center", gap: 10 },
  spellBtn: { display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: "1px solid #e5dfd5", borderRadius: 7, padding: "6px 12px", fontSize: 12, color: "#6b5d52", cursor: "pointer", fontFamily: "'Inter', sans-serif" },
  wordCount: { fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#a09080" },
  clearBtn: { background: "transparent", border: "none", fontSize: 12, color: "#a09080", cursor: "pointer", padding: "4px 8px", fontFamily: "'Inter', sans-serif" },
  submitBtn: { display: "inline-flex", alignItems: "center", gap: 6, background: "var(--accent)", color: "#faf7f0", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif", fontWeight: 500, whiteSpace: "nowrap" },
  submitBtnDisabled: { background: "#e5dfd5", color: "#a09080", cursor: "not-allowed" },

  // Spell results bar
  spellBar: { background: "#fff", border: "1px solid #e5dfd5", borderRadius: 10, padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", animation: "fadeIn 0.25s ease", flexWrap: "wrap" },
  errorPill: { display: "inline-flex", alignItems: "center", gap: 5, background: "#faf7f0", border: "1px solid #e5dfd5", borderRadius: 20, padding: "4px 10px", fontSize: 12, cursor: "pointer", fontFamily: "'Inter', sans-serif", transition: "all 0.18s" },
  errorPillActive: { borderColor: "#c8a96e", background: "#fffbf3" },
  pillCat: { fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: "#a09080", background: "#f0ece0", borderRadius: 10, padding: "1px 6px", textTransform: "uppercase", letterSpacing: "0.06em", marginLeft: 2 },
  pillPopover: { position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 20, background: "#fff", border: "1px solid #e5dfd5", borderRadius: 10, padding: "14px 16px", minWidth: 260, maxWidth: 300, boxShadow: "0 6px 20px rgba(0,0,0,0.1)", fontSize: 12, lineHeight: 1.6, color: "#4a3f35", animation: "fadeIn 0.18s ease" },
  popoverLabel: { display: "block", fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 4 },
  popoverText: { color: "#4a3f35", lineHeight: 1.6, fontSize: 12 },
  spellDismiss: { background: "transparent", border: "none", cursor: "pointer", color: "#a09080", display: "flex", alignItems: "center", padding: 4, flexShrink: 0 },
  useCorrectedBtn: { background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#16a34a", borderRadius: 7, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontFamily: "'Inter', sans-serif", fontWeight: 500 },

  // Output panel
  outputCard: { background: "#fff", border: "1px solid #e5dfd5", borderRadius: 14, padding: "22px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 14 },
  outputLabel: { fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "#a09080", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 8 },
  outputBox: { fontSize: 14, color: "#1a1208", lineHeight: 1.85, background: "#faf7f0", border: "1px solid #e5dfd5", borderRadius: 8, padding: "14px 16px", maxHeight: 280, overflowY: "auto" },
  outputActions: { display: "flex", alignItems: "center", marginTop: 16, gap: 8 },
  ghostBtn: { background: "transparent", border: "1px solid #e5dfd5", borderRadius: 7, padding: "7px 14px", fontSize: 12, color: "#6b5d52", cursor: "pointer", fontFamily: "'Inter', sans-serif" },
  copyBtn: { display: "inline-flex", alignItems: "center", gap: 6, background: "var(--accent)", color: "#faf7f0", border: "none", borderRadius: 7, padding: "7px 16px", fontSize: 12, cursor: "pointer", fontFamily: "'Inter', sans-serif", fontWeight: 500 },
  diffBox: { marginBottom: 12, background: "#fff", border: "1px solid #e5dfd5", borderRadius: 8, padding: "10px 12px", lineHeight: 1.8, fontSize: 13 },
  diffAdded: { background: "#dcfce7", color: "#166534" },
  diffRemoved: { background: "#fee2e2", color: "#991b1b", textDecoration: "line-through" },

  // Diagnostics
  debugPanel: { background: "#fff", border: "1px solid #e5dfd5", borderRadius: 10, marginBottom: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" },
  debugSummary: { listStyle: "none", cursor: "pointer", padding: "10px 14px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#8a7a6e", letterSpacing: "0.08em", textTransform: "uppercase" },
  debugInner: { borderTop: "1px solid #f0ece0", padding: "12px 14px" },
  debugToolbar: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  debugMeta: { fontSize: 11, color: "#8a7a6e", fontFamily: "'JetBrains Mono', monospace" },
  debugBtn: { background: "#faf7f0", border: "1px solid #e5dfd5", borderRadius: 6, padding: "4px 9px", fontSize: 11, color: "#6b5d52", cursor: "pointer", fontFamily: "'Inter', sans-serif" },
  debugEmpty: { fontSize: 12, color: "#8a7a6e" },
  debugItem: { border: "1px solid #f0ece0", borderRadius: 8, marginBottom: 8, overflow: "hidden" },
  debugItemSummary: { cursor: "pointer", display: "grid", gridTemplateColumns: "minmax(140px,2fr) 1fr 1fr 1fr 1fr", gap: 8, padding: "8px 10px", background: "#fffbf3", fontSize: 11, color: "#6b5d52", fontFamily: "'JetBrains Mono', monospace" },
  debugBlockGrid: { padding: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  debugBlock: { background: "#faf7f0", border: "1px solid #e5dfd5", borderRadius: 7, padding: "8px 9px", minHeight: 92 },
  debugLabel: { fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "#a09080", fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 },
  debugPre: { margin: 0, fontSize: 11, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word", color: "#4a3f35", fontFamily: "'JetBrains Mono', monospace", maxHeight: 220, overflowY: "auto" },

  // Style modal
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(26,18,8,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" },
  modalPanel: { background: "#fff", borderRadius: 16, width: "90vw", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", padding: "28px 32px", boxShadow: "0 20px 60px rgba(0,0,0,0.2)", animation: "fadeIn 0.22s ease" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  modalTitle: { fontFamily: "'Special Elite', cursive", fontSize: 22, color: "#1a1208" },
  modalClose: { background: "transparent", border: "none", cursor: "pointer", color: "#6b5d52", display: "flex", alignItems: "center", padding: 4 },

  // Form elements
  fieldLabel: { fontSize: 10, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.18em", textTransform: "uppercase", color: "#8a7a6e", marginBottom: 2 },
  textInput: { display: "block", width: "100%", background: "#faf7f0", border: "1px solid #e5dfd5", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#1a1208", marginTop: 8, transition: "border-color 0.2s, box-shadow 0.2s" },
  textareaField: { display: "block", width: "100%", background: "#faf7f0", border: "1px solid #e5dfd5", borderRadius: 8, padding: "14px 16px", fontSize: 14, lineHeight: 1.8, resize: "vertical", color: "#1a1208", transition: "border-color 0.2s, box-shadow 0.2s" },
  chip: { background: "transparent", border: "1px solid #e5dfd5", borderRadius: 8, padding: "6px 14px", fontSize: 12, color: "#6b5d52", cursor: "pointer", transition: "all 0.18s", fontFamily: "'Inter', sans-serif" },
  chipActive: { borderColor: "#c8a96e", color: "#c8a96e", background: "#fffbf3" },
  slotTab: { background: "transparent", border: "1px solid #e5dfd5", padding: "6px 12px", fontSize: 12, color: "#6b5d52", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "monospace", transition: "all 0.18s" },
  slotTabActive: { background: "#fffbf3", borderColor: "#c8a96e", color: "#c8a96e" },
  slotTypeTag: { background: "#f0ece0", color: "#8a7a6e", borderRadius: 999, padding: "1px 6px", fontSize: 9, letterSpacing: "0.04em", textTransform: "uppercase", marginLeft: 2 },
  addSlotBtn: { background: "transparent", border: "1px dashed #d4cdc0", borderRadius: 7, padding: "6px 12px", fontSize: 12, color: "#a09080", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, transition: "all 0.18s", fontFamily: "monospace" },
  sampleTypeRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sampleTypeLabel: { fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "#8a7a6e", textTransform: "uppercase", letterSpacing: "0.14em" },
  sampleTypeSelect: { background: "#fff", border: "1px solid #e5dfd5", borderRadius: 6, padding: "5px 10px", fontSize: 12, color: "#6b5d52", fontFamily: "'Inter', sans-serif" },
  slotStat: { fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#a09080" },

  // Loading overlay
  overlay: { position: "fixed", inset: 0, background: "rgba(250,247,240,0.88)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, backdropFilter: "blur(6px)" },
};
