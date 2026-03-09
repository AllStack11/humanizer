import { useState } from "react";
import { Button, Card } from "./AppUI.jsx";
import {
  buildHistoryUserSegments,
  getHistoryDepthLabel,
  getHistoryGenerationTypeLabel,
  getHistoryPresetLabel,
  getHistoryToneLabel,
} from "../lib/output-history.js";

export default function SessionHistoryPanel({
  entries,
  selectedEntryId,
  onSelectEntry,
  onCopyEntryPart,
}) {
  const [isSectionExpanded, setIsSectionExpanded] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState({});

  if (!entries.length) return null;

  function toggleEntry(entryId) {
    setExpandedEntries((prev) => ({
      ...prev,
      [entryId]: !prev[entryId],
    }));
  }

  function trimPreview(value, max = 72) {
    const text = String(value || "").trim();
    if (!text) return "";
    if (text.length <= max) return text;
    return `${text.slice(0, max)}…`;
  }

  return (
    <Card className="app-card session-history-card" radius="lg">
      <Card.Content className="panel-grid p-3">
        <div className="toolbar-row session-history-head">
          <div className="toolbar-row session-history-heading">
            <div className="panel-title">Session</div>
            <span className="text-mono session-history-count">{entries.length} turns</span>
          </div>
          <Button
            variant="bordered"
            size="sm"
            onPress={() => setIsSectionExpanded((prev) => !prev)}
            aria-label={isSectionExpanded ? "Collapse session history section" : "Expand session history section"}
            tooltip={isSectionExpanded ? "Hide session history" : "Show session history"}
            className="session-history-section-toggle"
            iconOnly
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 3v18h18" />
              <path d="m7 15 4-4 3 3 5-6" />
            </svg>
          </Button>
        </div>

        {isSectionExpanded ? (
          <div className="session-history-list" role="list" aria-label="Session history">
            {entries.map((entry, index) => {
              const isExpanded = !!expandedEntries[entry.id];
              const generationLabel = index === 0 ? "Original" : `Regen ${index}`;
              const { sourceText, extraDirection, regenerateFeedback } = buildHistoryUserSegments(entry);
              const presetLabel = getHistoryPresetLabel(entry);
              const depthLabel = entry.mode === "elaborate" ? getHistoryDepthLabel(entry) : null;
              const toneLabel = getHistoryToneLabel(entry);
              const generationTypeLabel = getHistoryGenerationTypeLabel(entry);

              return (
                <div
                  key={entry.id}
                  role="button"
                  tabIndex={0}
                  aria-roledescription="session turn"
                  className={`session-history-item${selectedEntryId === entry.id ? " is-selected" : ""}`}
                  onClick={() => onSelectEntry(entry.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelectEntry(entry.id);
                    }
                  }}
                  aria-pressed={selectedEntryId === entry.id}
                >
                <div className="toolbar-row session-history-item-head">
                  <span className="text-mono session-history-index">Gen {index + 1}</span>
                  <div className="toolbar-row session-history-item-tools">
                    <span className="text-mono session-history-meta">
                      {generationLabel} · {entry.currentOutputText !== entry.baseOutputText ? "Edited" : "Raw"} · {entry.model || "Unknown model"}
                      {entry.extraDirection?.trim() ? " · Direction" : ""}
                      {entry.regenerateFeedback?.trim() ? " · Feedback" : ""}
                    </span>
                    <Button
                      variant="bordered"
                      size="sm"
                      onPress={(event) => {
                        event.stopPropagation();
                        toggleEntry(entry.id);
                      }}
                      aria-label={isExpanded ? "Collapse session preview" : "Expand session preview"}
                      tooltip={isExpanded ? "Collapse both preview columns" : "Expand both preview columns"}
                      iconOnly
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {isExpanded ? <path d="m18 15-6-6-6 6" /> : <path d="m6 9 6 6 6-6" />}
                      </svg>
                    </Button>
                  </div>
                </div>
                <div className="text-mono session-history-meta">
                  Type: {generationTypeLabel}
                  {` · `}
                  Preset: {presetLabel === "No preset" ? "None" : presetLabel}
                  {depthLabel ? ` · Depth: ${depthLabel}` : ""}
                  {toneLabel ? ` · Tone: ${toneLabel}` : ""}
                </div>
                {entry.extraDirection?.trim() ? (
                  <div className="text-mono session-history-meta">
                    Direction: {trimPreview(entry.extraDirection)}
                  </div>
                ) : null}
                {entry.regenerateFeedback?.trim() ? (
                  <div className="text-mono session-history-meta">
                    Feedback: {trimPreview(entry.regenerateFeedback)}
                  </div>
                ) : null}
                <div className="session-history-thread-preview">
                  <div className="session-history-column session-history-column--user">
                    <div className="session-history-bubble session-history-bubble--user">
                      <div className="toolbar-row session-history-bubble-head">
                        <span className="text-mono session-history-bubble-label">User</span>
                        <Button
                          variant="bordered"
                          size="sm"
                          onPress={(event) => {
                            event.stopPropagation();
                            onCopyEntryPart?.(entry.id, "user");
                          }}
                          aria-label={`Copy user response for Gen ${index + 1}`}
                          tooltip="Copy user response"
                          className="session-history-bubble-copy"
                          iconOnly
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </Button>
                      </div>
                      <span className={`session-history-bubble-text${isExpanded ? " is-expanded" : ""}`}>
                        {sourceText || "No source text captured."}
                      </span>
                      {extraDirection ? (
                        <span className="session-history-bubble-note session-history-bubble-note--direction">
                          Extra direction: {extraDirection}
                        </span>
                      ) : null}
                      {regenerateFeedback ? (
                        <span className="session-history-bubble-note session-history-bubble-note--feedback">
                          Regeneration feedback: {regenerateFeedback}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="session-history-column session-history-column--llm">
                    <div className="session-history-bubble session-history-bubble--llm">
                      <div className="toolbar-row session-history-bubble-head">
                        <span className="text-mono session-history-bubble-label">Model</span>
                        <Button
                          variant="bordered"
                          size="sm"
                          onPress={(event) => {
                            event.stopPropagation();
                            onCopyEntryPart?.(entry.id, "model");
                          }}
                          aria-label={`Copy model response for Gen ${index + 1}`}
                          tooltip="Copy model response"
                          className="session-history-bubble-copy"
                          iconOnly
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </Button>
                      </div>
                      <span className={`session-history-bubble-text${isExpanded ? " is-expanded" : ""}`}>
                        {entry.baseOutputText || "No output captured."}
                      </span>
                    </div>
                  </div>
                </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </Card.Content>
    </Card>
  );
}
