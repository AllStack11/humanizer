import { Card } from "./AppUI.jsx";

function formatTimestamp(timestamp) {
  if (!timestamp) return "";
  try {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function ProcessLogPanel({ steps = [], compact = false }) {
  if (!steps.length) return null;

  return (
    <Card className={`app-card process-log-card${compact ? " process-log-card--compact" : ""}`} radius="lg">
      <Card.Content className="panel-grid p-3">
        <div className="text-mono process-log-title">Process log</div>
        <div className="process-log-list" role="log" aria-label="Process log">
          {steps.map((step) => (
            <div key={step.id} className={`process-log-item process-log-item--${step.level || "info"}`}>
              <span className="process-log-dot" aria-hidden="true" />
              <div className="process-log-copy">
                <div className="process-log-message">{step.message}</div>
                <div className="text-mono process-log-meta">
                  <span>{formatTimestamp(step.timestamp)}</span>
                  {step.detail ? <span>{step.detail}</span> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
}
