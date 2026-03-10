import { NativeSelect } from "@mantine/core";
import { Button, Card } from "./AppUI.jsx";
import {
  buildHistoryUserSegments,
  getHistoryDepthLabel,
  getHistoryGenerationTypeLabel,
  getHistoryPresetLabel,
  getHistoryToneLabel,
} from "../lib/output-history.js";

function formatTimestamp(value) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "";
  }
}

function formatPresetDisplay(entry) {
  const label = getHistoryPresetLabel(entry);
  return label === "No preset" ? "None" : label;
}

export default function OutputHistoryDrawer({
  entries,
  selectedEntry,
  query,
  onQueryChange,
  filters,
  onFilterChange,
  profileOptions,
  modelOptions,
  onSelectEntry,
  onDeleteEntry,
}) {
  const selectedEntryUserSegments = buildHistoryUserSegments(selectedEntry);

  return (
    <div className="panel-grid output-history-layout">
      <Card className="app-card">
        <Card.Content className="panel-grid p-3">
          <div className="panel-title">Search</div>
          <input
            className="output-history-search"
            aria-label="History search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search outputs, source text, or titles"
          />
          <div className="output-history-filters">
            <NativeSelect
              aria-label="History profile filter"
              value={filters.profileId}
              onChange={(event) => onFilterChange({ profileId: event.target.value })}
              data={[{ value: "", label: "All profiles" }, ...profileOptions]}
              className="app-select-wrap"
            />
            <NativeSelect
              aria-label="History mode filter"
              value={filters.mode}
              onChange={(event) => onFilterChange({ mode: event.target.value })}
              data={[
                { value: "", label: "All modes" },
                { value: "humanize", label: "Humanize" },
                { value: "elaborate", label: "Elaborate" },
              ]}
              className="app-select-wrap"
            />
            <NativeSelect
              aria-label="History model filter"
              value={filters.model}
              onChange={(event) => onFilterChange({ model: event.target.value })}
              data={[{ value: "", label: "All models" }, ...modelOptions]}
              className="app-select-wrap"
            />
            <NativeSelect
              aria-label="History saved filter"
              value={filters.savedOnly ? "saved" : ""}
              onChange={(event) => onFilterChange({ savedOnly: event.target.value === "saved" })}
              data={[
                { value: "", label: "All entries" },
                { value: "saved", label: "Saved only" },
              ]}
              className="app-select-wrap"
            />
          </div>
        </Card.Content>
      </Card>

      <div className="output-history-grid">
        <Card className="app-card">
          <Card.Content className="panel-grid p-3">
            <div className="panel-title">All Responses</div>
            <div className="output-history-list" role="list" aria-label="Global output history">
              {entries.length ? entries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={`output-history-item${selectedEntry?.id === entry.id ? " is-selected" : ""}`}
                  onClick={() => onSelectEntry(entry.id)}
                  aria-pressed={selectedEntry?.id === entry.id}
                >
                  <span className="output-history-item-title">{entry.title}</span>
                  <span className="text-mono output-history-item-meta">
                    {entry.profileId || "unknown"} · {entry.mode} · {entry.model || "Unknown model"}
                  </span>
                  <span className="text-mono output-history-item-meta">
                    Type: {getHistoryGenerationTypeLabel(entry)}
                    {` · `}
                    Preset: {formatPresetDisplay(entry)}
                    {entry.mode === "elaborate" ? ` · Depth: ${getHistoryDepthLabel(entry)}` : ""}
                    {` · Tone: ${getHistoryToneLabel(entry)}`}
                  </span>
                  <span className="text-mono output-history-item-meta">
                    {formatTimestamp(entry.createdAt)} · {entry.isSaved ? "Saved" : "Recent"}
                  </span>
                </button>
              )) : (
                <div className="output-history-empty">No history entries match the current filters.</div>
              )}
            </div>
          </Card.Content>
        </Card>

        <Card className="app-card">
          <Card.Content className="panel-grid p-3">
            <div className="toolbar-row output-history-detail-head">
              <div className="panel-title">Response Detail</div>
              {selectedEntry ? (
                <div className="toolbar-row">
                  <Button
                    color="danger"
                    variant="bordered"
                    size="sm"
                    onPress={() => onDeleteEntry(selectedEntry)}
                    aria-label="Delete selected history entry"
                    tooltip="Delete selected history entry"
                    iconOnly
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="m19 6-1 14H6L5 6" />
                    </svg>
                  </Button>
                </div>
              ) : null}
            </div>

            {selectedEntry ? (
              <>
                <div className="output-history-detail-metadata">
                  <span className="text-mono">Profile: {selectedEntry.profileId}</span>
                  <span className="text-mono">Mode: {selectedEntry.mode}</span>
                  <span className="text-mono">Model: {selectedEntry.model || "Unknown model"}</span>
                  <span className="text-mono">Preset: {formatPresetDisplay(selectedEntry)}</span>
                  {selectedEntry.mode === "elaborate" ? (
                    <span className="text-mono">Depth: {getHistoryDepthLabel(selectedEntry)}</span>
                  ) : null}
                  <span className="text-mono">Tone: {getHistoryToneLabel(selectedEntry)}</span>
                  <span className="text-mono">Type: {getHistoryGenerationTypeLabel(selectedEntry)}</span>
                  <span className="text-mono">Created: {formatTimestamp(selectedEntry.createdAt)}</span>
                  <span className="text-mono">Status: {selectedEntry.status}</span>
                  <span className="text-mono">Direction: {selectedEntry.extraDirection?.trim() ? "Present" : "None"}</span>
                  <span className="text-mono">Feedback: {selectedEntry.regenerateFeedback?.trim() ? "Present" : "None"}</span>
                </div>
                <div className="surface-box output-history-detail-block">
                  <div className="text-mono output-history-detail-label">Source</div>
                  <div className="output-history-detail-text">
                    {selectedEntryUserSegments.sourceText || "No source text captured."}
                  </div>
                  {selectedEntryUserSegments.extraDirection ? (
                    <div className="output-history-detail-note output-history-detail-note--direction">
                      Extra direction: {selectedEntryUserSegments.extraDirection}
                    </div>
                  ) : null}
                  {selectedEntryUserSegments.regenerateFeedback ? (
                    <div className="output-history-detail-note output-history-detail-note--feedback">
                      Regeneration feedback: {selectedEntryUserSegments.regenerateFeedback}
                    </div>
                  ) : null}
                </div>
                <div className="surface-box output-history-detail-block">
                  <div className="text-mono output-history-detail-label">Output</div>
                  <div className="output-history-detail-text">{selectedEntry.currentOutputText || "No output captured."}</div>
                </div>
              </>
            ) : (
              <div className="output-history-empty">Select a response to inspect its details.</div>
            )}
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
