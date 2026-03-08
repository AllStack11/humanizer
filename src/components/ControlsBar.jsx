import { Button } from "./AppUI.jsx";
import ToggleSwitch from "./ToggleSwitch.jsx";

export default function ControlsBar({
  mode,
  onModeChange,
  stripCliches,
  onStripClichesChange,
  showModeSwitcher = true,
}) {
  return (
    <div className="panel-grid controls-panel">
      {showModeSwitcher ? (
        <div className="controls-section">
          <div className="panel-title">Mode</div>
          <div className="toolbar-row controls-toolbar">
            <Button
              color={mode === "humanize" ? "primary" : "default"}
              variant={mode === "humanize" ? "solid" : "bordered"}
              onPress={() => onModeChange("humanize")}
              aria-label="Humanize mode"
              tooltip="Rewrite text to sound more like your voice"
              iconOnly
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 12h16" />
                <path d="M4 18h10" />
                <path d="M4 6h13" />
              </svg>
            </Button>
            <Button
              color={mode === "elaborate" ? "primary" : "default"}
              variant={mode === "elaborate" ? "solid" : "bordered"}
              onPress={() => onModeChange("elaborate")}
              aria-label="Elaborate mode"
              tooltip="Expand the draft with more detail"
              iconOnly
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 12h8" />
                <path d="M4 18h16" />
                <path d="M4 6h5" />
                <path d="M16 9v6" />
                <path d="M13 12h6" />
              </svg>
            </Button>
          </div>
        </div>
      ) : null}

      <div className="controls-section">
        <div className="toolbar-row controls-toolbar">
          <div className="controls-toggle">
            <span className="panel-title">AI filter</span>
            <ToggleSwitch value={stripCliches} onChange={onStripClichesChange} />
          </div>
        </div>
      </div>
    </div>
  );
}
