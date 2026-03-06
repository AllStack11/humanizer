import { TONE_LEVELS, ELAB_DEPTHS, OUTPUT_PRESET_OPTIONS } from '../constants/index.js';
import ToggleSwitch from './ToggleSwitch.jsx';
import { S } from '../styles/index.js';

const ADD_CUSTOM_MODEL_VALUE = "__add_custom_model__";

export default function ControlsBar({
  mode, onModeChange, selectedModel, onModelChange, modelOptions, onAddModel,
  toneLevel, onToneLevelChange, stripCliches, onStripClichesChange,
  elabDepth, onElabDepthChange, formatPreset, onFormatPresetChange,
  oneOffInstruction, onOneOffInstructionChange
}) {
  return (
    <div style={S.controlsCard}>
      {/* Mode toggle */}
      <div style={S.modeGroup}>
        <button style={{ ...S.modeBtn, ...(mode === "humanize" ? S.modeBtnActive : {}) }} onClick={() => onModeChange("humanize")}>
          Humanize
        </button>
        <button style={{ ...S.modeBtn, ...(mode === "elaborate" ? S.modeBtnActive : {}) }} onClick={() => onModeChange("elaborate")}>
          Elaborate
        </button>
      </div>

      <div style={S.ctrlDivider} />

      {/* Model */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={S.ctrlLabel}>Model</span>
        <select
          value={selectedModel}
          onChange={e => {
            if (e.target.value === ADD_CUSTOM_MODEL_VALUE) {
              onAddModel();
              return;
            }
            onModelChange(e.target.value);
          }}
          style={S.modelSelect}
          title="Switch model on the fly"
        >
          {modelOptions.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
          <option value={ADD_CUSTOM_MODEL_VALUE}>+ Add custom model...</option>
        </select>
      </div>

      <div style={S.ctrlDivider} />

      {/* Tone */}
      <div style={S.toneGroup}>
        <span style={S.ctrlLabel}>Casual</span>
        <div style={S.segBar}>
          {TONE_LEVELS.map((t, i) => (
            <button key={i} onClick={() => onToneLevelChange(i)} title={t.desc} style={{ ...S.seg, background: i <= toneLevel ? "var(--accent)" : "#e5dfd5" }} />
          ))}
        </div>
        <span style={{ ...S.ctrlLabel, color: "var(--accent)", fontWeight: 600, minWidth: 80 }}>{TONE_LEVELS[toneLevel].label}</span>
        <span style={S.ctrlLabel}>Formal</span>
      </div>

      <div style={S.ctrlDivider} />

      {/* AI Filter */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={S.ctrlLabel}>AI filter</span>
        <ToggleSwitch value={stripCliches} onChange={onStripClichesChange} />
      </div>

      {/* Depth — elaborate only */}
      {mode === "elaborate" && (
        <>
          <div style={S.ctrlDivider} />
          <div style={S.toneGroup}>
            <span style={S.ctrlLabel}>Depth</span>
            <div style={S.segBar}>
              {ELAB_DEPTHS.map((d, i) => (
                <button key={i} onClick={() => onElabDepthChange(i)} title={d.desc} style={{ ...S.seg, background: i <= elabDepth ? "var(--accent)" : "#e5dfd5" }} />
              ))}
            </div>
            <span style={{ ...S.ctrlLabel, color: "var(--accent)", fontWeight: 600, minWidth: 72 }}>{ELAB_DEPTHS[elabDepth].label}</span>
          </div>
        </>
      )}

      <div style={S.ctrlDivider} />

      {/* Preset */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={S.ctrlLabel}>Preset</span>
        <select value={formatPreset} onChange={(e) => onFormatPresetChange(e.target.value)} style={S.modelSelect} aria-label="Output format preset">
          {OUTPUT_PRESET_OPTIONS.map((preset) => (
            <option key={preset.value} value={preset.value}>{preset.label}</option>
          ))}
        </select>
      </div>

      <input
        value={oneOffInstruction}
        onChange={(e) => onOneOffInstructionChange(e.target.value)}
        placeholder="One-off instruction (example: cut 30 words)"
        style={{ ...S.textInput, marginTop: 0, minWidth: 270, flex: 1 }}
        aria-label="One-off instruction"
      />
    </div>
  );
}
