import { Modal } from "@mantine/core";

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

export default function MergeProgressModal({
  opened,
  loading,
  title,
  label,
  progressValue = 0,
  steps = [],
  onClose,
}) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      withCloseButton={!loading}
      closeOnEscape={!loading}
      closeOnClickOutside={!loading}
      size="lg"
      classNames={{ content: "modal-content", body: "panel-grid merge-progress-modal" }}
      title={<strong className="drawer-title">{title || "Profile progress"}</strong>}
      overlayProps={{ backgroundOpacity: 0.2, blur: 6 }}
      zIndex={430}
    >
      <div className="merge-progress-header">
        <span className="text-mono merge-progress-kicker">{label || "Working..."}</span>
        <span className="text-mono merge-progress-percent">{Math.round(progressValue)}%</span>
      </div>
      <div className="merge-progress-track" aria-hidden="true">
        <span className="merge-progress-bar" style={{ width: `${Math.max(0, Math.min(100, progressValue))}%` }} />
      </div>

      <div className="merge-progress-step-list" role="log" aria-label="Merge progress steps">
        {steps.map((step) => (
          <div key={step.id} className={`merge-progress-step merge-progress-step--${step.level || "info"}`}>
            <span className="merge-progress-step-dot" aria-hidden="true" />
            <div className="merge-progress-step-copy">
              <div className="merge-progress-step-message">{step.message}</div>
              <div className="text-mono merge-progress-step-meta">
                <span>{formatTimestamp(step.timestamp)}</span>
                {step.detail ? <span>{step.detail}</span> : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
