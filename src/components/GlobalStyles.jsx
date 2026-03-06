export default function GlobalStyles({ accent }) {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Special+Elite&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      body {
        background: #faf7f0;
        font-family: 'Inter', system-ui, sans-serif;
        color: #1a1208;
        -webkit-font-smoothing: antialiased;
      }

      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      @keyframes pulse {
        0%, 100% { opacity: 0.2; transform: scale(0.85); }
        50%       { opacity: 1;   transform: scale(1); }
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }

      .view-enter { animation: fadeIn 0.28s ease; }
      .pulse-dot  { animation: pulse 1.2s ease-in-out infinite; }
      .spin       { animation: spin 1s linear infinite; }

      .btn { transition: opacity 0.15s, transform 0.15s; }
      .btn:hover:not(:disabled) { opacity: 0.82; }
      .btn:active:not(:disabled) { transform: scale(0.98); }

      .add-slot-btn:hover { border-color: var(--accent) !important; color: var(--accent) !important; }

      input, textarea { font-family: 'Inter', system-ui, sans-serif; }
      input::placeholder, textarea::placeholder { color: #c8bfb0; }
      input:focus, textarea:focus { outline: none; border-color: ${accent} !important; box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.08); }

      ::-webkit-scrollbar { width: 5px; }
      ::-webkit-scrollbar-track { background: #f0ece0; }
      ::-webkit-scrollbar-thumb { background: #d4cdc0; border-radius: 3px; }
    `}</style>
  );
}
