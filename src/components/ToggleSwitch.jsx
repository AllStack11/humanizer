export default function ToggleSwitch({ value, onChange }) {
  return (
    <button onClick={() => onChange(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}>
      <div style={{ width: 34, height: 19, borderRadius: 10, position: "relative", background: value ? "var(--accent)" : "#d4cdc0", transition: "background 0.2s", flexShrink: 0 }}>
        <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#ffffff", position: "absolute", top: 3, left: value ? 18 : 3, transition: "left 0.2s", boxShadow: "0 1px 2px rgba(0,0,0,0.15)" }} />
      </div>
    </button>
  );
}
