import { S } from '../styles/index.js';

export default function DiagnosticsPanel({ logsOpen, onToggle, requestLogs, logsLoading, onRefresh, onClear }) {
  return (
    <details style={S.debugPanel} open={logsOpen} onToggle={onToggle}>
      <summary style={S.debugSummary}>
        Diagnostics {logsOpen ? "▲" : "▼"}
      </summary>
      <div style={S.debugInner}>
        <div style={S.debugToolbar}>
          <span style={S.debugMeta}>Recent requests: {requestLogs.length}</span>
          <span style={S.debugMeta}>{logsLoading ? "Refreshing..." : "Live (2.5s poll)"}</span>
          <button className="btn" style={S.debugBtn} onClick={onRefresh}>Refresh</button>
          <button className="btn" style={S.debugBtn} onClick={onClear}>Clear</button>
        </div>
        {requestLogs.length === 0 ? (
          <div style={S.debugEmpty}>No request logs yet.</div>
        ) : requestLogs.map((log) => (
          <details key={log.id} style={S.debugItem}>
            <summary style={S.debugItemSummary}>
              <span title={log.route || "unknown-route"}>{log.route || "unknown-route"}</span>
              <span>{log.status || "unknown"}</span>
              <span>{log.stream ? "stream" : "event/json"}</span>
              <span>{log.durationMs != null ? `${log.durationMs}ms` : "-"}</span>
              <span>{log.usage?.total_tokens != null ? `${log.usage.total_tokens} tok` : (log.model || "n/a")}</span>
            </summary>
            <div style={S.debugBlockGrid}>
              <div style={S.debugBlock}>
                <div style={S.debugLabel}>System prompt</div>
                <pre style={S.debugPre}>{log.request?.system || "(empty)"}</pre>
              </div>
              <div style={S.debugBlock}>
                <div style={S.debugLabel}>User prompt/messages</div>
                <pre style={S.debugPre}>{JSON.stringify(log.request?.messages || [], null, 2)}</pre>
              </div>
              <div style={S.debugBlock}>
                <div style={S.debugLabel}>Usage / tokens</div>
                <pre style={S.debugPre}>{JSON.stringify(log.usage || {}, null, 2)}</pre>
              </div>
              <div style={S.debugBlock}>
                <div style={S.debugLabel}>Response preview</div>
                <pre style={S.debugPre}>{log.responsePreview || "(empty)"}</pre>
              </div>
              {log.error && (
                <div style={S.debugBlock}>
                  <div style={S.debugLabel}>Error</div>
                  <pre style={{ ...S.debugPre, color: "#dc2626" }}>{log.error}</pre>
                </div>
              )}
            </div>
          </details>
        ))}
      </div>
    </details>
  );
}
