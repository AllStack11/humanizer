import { Button, Card } from "./AppUI.jsx";

function DiagnosticsContent({ requestLogs, logsLoading, onRefresh, onClear }) {
  return (
    <Card className="app-card" radius="lg">
      <Card.Content className="panel-grid p-3">
        <div className="toolbar-row text-mono" style={{ fontSize: 11 }}>
          <span>Recent requests: {requestLogs.length}</span>
          <span>{logsLoading ? "Refreshing..." : "Live (2.5s poll)"}</span>
          <Button size="sm" variant="bordered" onPress={onRefresh} aria-label="Refresh request logs" tooltip="Reload the latest request logs" iconOnly>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
          </Button>
          <Button size="sm" variant="bordered" onPress={onClear} aria-label="Clear request logs" tooltip="Delete the stored request log history" iconOnly>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="m19 6-1 14H6L5 6" />
            </svg>
          </Button>
        </div>

        {requestLogs.length === 0 ? (
          <div style={{ fontSize: 12 }}>No request logs yet.</div>
        ) : (
          requestLogs.map((log) => (
            <details key={log.id} className="debug-log">
              <summary className="text-mono" style={{ cursor: "pointer", display: "grid", gridTemplateColumns: "minmax(120px,2fr) 1fr 1fr 1fr 1fr", gap: 8, padding: "8px 10px", fontSize: 11 }}>
                <span title={log.route || "unknown-route"}>{log.route || "unknown-route"}</span>
                <span>{log.status || "unknown"}</span>
                <span>{log.stream ? "stream" : "event/json"}</span>
                <span>{log.durationMs != null ? `${log.durationMs}ms` : "-"}</span>
                <span>{log.usage?.total_tokens != null ? `${log.usage.total_tokens} tok` : (log.model || "n/a")}</span>
              </summary>
              <div style={{ padding: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <DebugBlock title="System prompt" content={log.request?.system || "(empty)"} />
                <DebugBlock title="User prompt/messages" content={JSON.stringify(log.request?.messages || [], null, 2)} />
                <DebugBlock title="Usage / tokens" content={JSON.stringify(log.usage || {}, null, 2)} />
                <DebugBlock title="Response preview" content={log.responsePreview || "(empty)"} />
                {log.error ? <DebugBlock title="Error" content={log.error} danger /> : null}
              </div>
            </details>
          ))
        )}
      </Card.Content>
    </Card>
  );
}

export default function DiagnosticsPanel({
  logsOpen,
  onToggle,
  requestLogs,
  logsLoading,
  onRefresh,
  onClear,
  collapsible = true,
}) {
  if (!collapsible) {
    return <DiagnosticsContent requestLogs={requestLogs} logsLoading={logsLoading} onRefresh={onRefresh} onClear={onClear} />;
  }

  return (
    <details open={logsOpen} onToggle={onToggle}>
      <summary className="text-mono" style={{ cursor: "pointer", marginBottom: 10, fontSize: 12 }}>
        Diagnostics {logsOpen ? "▲" : "▼"}
      </summary>
      <DiagnosticsContent requestLogs={requestLogs} logsLoading={logsLoading} onRefresh={onRefresh} onClear={onClear} />
    </details>
  );
}

function DebugBlock({ title, content, danger = false }) {
  return (
    <div className="debug-block">
      <div className="text-mono" style={{ fontSize: 10, marginBottom: 4 }}>{title}</div>
      <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 11, maxHeight: 220, overflowY: "auto", color: danger ? "#dc2626" : "inherit" }}>
        {content}
      </pre>
    </div>
  );
}
