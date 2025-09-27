import { useState } from "react";

export default function App() {
  const [runId, setRunId] = useState("");
  const [lines, setLines] = useState([]);
  const [busy, setBusy] = useState(false);

  const add = (s) => setLines((l) => [...l, s]);

  const startRun = async () => {
    setBusy(true);
    setLines([]);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/agents/run`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ task: "hello from web" })
      });
      const { runId } = await res.json();
      setRunId(runId);

      const url = `${import.meta.env.VITE_API_URL}/api/agents/runs/${runId}/stream`;
      const es = new EventSource(url);

      es.addEventListener("status", (e) => add(`[status] ${e.data}`));
      es.addEventListener("log", (e) => add(`[log] ${e.data}`));
      es.addEventListener("token", (e) => add(JSON.parse(e.data).token));
      es.addEventListener("step", (e) => add(`[step] ${e.data}`));
      es.addEventListener("final", (e) => {
        add(`[final] ${e.data}`);
        es.close();
        setBusy(false);
      });
      es.addEventListener("error", () => {
        add("[error] stream error");
        es.close();
        setBusy(false);
      });
      // Ignore heartbeats
    } catch (err) {
      add(`[error] ${String(err)}`);
      setBusy(false);
    }
  };

  return (
    <div style={{ fontFamily: "ui-sans-serif", padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>MediLoop</h1>
      <p style={{ marginTop: 0, opacity: 0.7 }}>Live agent streaming demo (SSE)</p>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 16 }}>
        <button onClick={startRun} disabled={busy}
          style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #ccc", cursor: "pointer" }}>
          {busy ? "Running…" : "Start Run"}
        </button>
        <code>Run: {runId || "—"}</code>
      </div>

      <pre style={{ whiteSpace: "pre-wrap", background: "#f7f7f7", padding: 16, borderRadius: 8, marginTop: 16, minHeight: 120 }}>
        {lines.length ? lines.join(" ") : "Click Start Run to see streaming output…"}
      </pre>
    </div>
  );
}
