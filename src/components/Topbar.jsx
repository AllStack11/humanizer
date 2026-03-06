import { useRef } from "react";
import { PROFILE_OPTIONS, APP_THEME_OPTIONS, WRITING_SAMPLE_TYPES } from '../constants/index.js';
import { isTauriRuntime } from '../lib/tauri.js';
import { formatRelativeTime } from '../utils/format.js';
import { S } from '../styles/index.js';

export default function Topbar({
  activeProfileId, onProfileChange, themeKey, onThemeChange,
  hasProfile, activeProfile, health,
  backupStatus, backupLastSavedAt, backupError, onRetryBackup,
  clichesUpdatedAt, cliches, onRefreshCliches, clicheFetching,
  onOpenStyleModal, onExportProfile, onImportProfile, onOpenApiKey
}) {
  const importInputRef = useRef(null);

  return (
    <header style={S.topbar}>
      <div style={S.topbarInner}>
        <div style={S.topbarRow}>
          <div style={S.brand}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            <span style={S.brandName}>Voice Humanizer</span>
          </div>
          <div style={S.topbarControls}>
            <select value={activeProfileId} onChange={(e) => onProfileChange(e.target.value)} style={S.modelSelect} aria-label="Profile">
              {PROFILE_OPTIONS.map((profile) => (
                <option key={profile.id} value={profile.id}>{profile.label}</option>
              ))}
            </select>
            <select value={themeKey} onChange={(e) => onThemeChange(e.target.value)} style={S.modelSelect} aria-label="Theme">
              {APP_THEME_OPTIONS.map((theme) => (
                <option key={theme.value} value={theme.value}>{theme.label}</option>
              ))}
            </select>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }} title={clichesUpdatedAt ? `${cliches.length} AI terms · updated ${clichesUpdatedAt.toLocaleDateString()}` : "Fetching AI terms"}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: clichesUpdatedAt ? "#16a34a" : "var(--accent)", display: "block" }} />
              <button onClick={onRefreshCliches} style={S.refreshBtn} title="Refresh AI terms" disabled={clicheFetching}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
              </button>
            </div>
            <button style={S.newStyleBtn} onClick={onOpenStyleModal}>
              {hasProfile ? `+ Add ${activeProfile.name} Samples` : "Start Onboarding"}
            </button>
            {hasProfile && (
              <button style={S.ghostBtn} onClick={onExportProfile} title="Download profile backup" className="btn">
                Export
              </button>
            )}
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              style={{ display: "none" }}
              onChange={e => { onImportProfile(e.target.files?.[0]); e.target.value = ""; }}
            />
            <button style={S.ghostBtn} onClick={() => importInputRef.current?.click()} title="Restore profile from file" className="btn">
              Import
            </button>
            {isTauriRuntime() && (
              <button style={S.ghostBtn} onClick={onOpenApiKey} title="Manage OpenRouter API key" className="btn">
                API Key
              </button>
            )}
          </div>
        </div>
        <div style={S.topbarMetaRow}>
          <div style={S.stylePickerWrap}>
            <div style={S.profileBadge}>
              {hasProfile
                ? `${activeProfile.sampleCount || 0} samples • ${activeProfile.name} profile`
                : `${PROFILE_OPTIONS.find((profile) => profile.id === activeProfileId)?.label || "Selected"} profile needs onboarding`}
            </div>
            <div style={S.ctrlLabel}>
              Health {health.score}/100 · coverage {health.typeCoverage}/{WRITING_SAMPLE_TYPES.length}
            </div>
            {backupStatus !== "idle" && (
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {(backupStatus === "saving" || backupStatus === "retrying") && (
                  <span style={{ ...S.ctrlLabel, color: "#a09080" }}>
                    {backupStatus === "retrying" ? "Retrying…" : "Saving…"}
                  </span>
                )}
                {backupStatus === "ok" && backupLastSavedAt && (
                  <>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: (Date.now() - backupLastSavedAt.getTime()) > 300000 ? "var(--accent)" : "#16a34a", display: "block", flexShrink: 0 }} />
                    <span style={S.ctrlLabel}>Backed up {formatRelativeTime(backupLastSavedAt)}</span>
                  </>
                )}
                {backupStatus === "error" && (
                  <>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#dc2626", display: "block", flexShrink: 0 }} />
                    <span style={{ ...S.ctrlLabel, color: "#dc2626" }} title={backupError}>Backup failed</span>
                    <button style={{ ...S.refreshBtn, color: "#dc2626", fontSize: 11 }} onClick={onRetryBackup}>Retry</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
