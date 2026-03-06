import { S } from '../styles/index.js';

export default function LoadingOverlay({ status }) {
  return (
    <div style={S.overlay}>
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16 }}>
          {[0,1,2].map(i => <div key={i} className="pulse-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", animationDelay: `${i*0.2}s` }} />)}
        </div>
        <div style={{ fontSize: 13, color: "#6b5d52", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}>{status}</div>
      </div>
    </div>
  );
}
