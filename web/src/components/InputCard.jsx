import { sx } from "../styles";
import { PRESETS } from "../presets";

export default function InputCard({ mode, text, setText, busy, onRun, onStop }) {
  const current = PRESETS[mode];

  return (
    <section style={sx.card}>
      <div style={sx.cardHeader}>
        <h2 style={sx.h2}>{current.label}</h2>
        <span style={{ ...sx.badge, ...(busy ? sx.badgeBusy : sx.badgeReady) }}>
          {busy ? "Working…" : "Ready"}
        </span>
      </div>
      <p style={sx.desc}>{current.description || "Choose a scenario to begin."}</p>

      <label style={sx.label} htmlFor="input">
        {mode === "triage" ? "Describe your symptoms" :
         mode === "appointments" ? "Add any preferences (optional)" :
         "Add any plan notes (optional)"}
      </label>
      <textarea
        id="input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={current.placeholder}
        rows={6}
        style={sx.textarea}
      />

      <div style={sx.actions}>
        <button onClick={onRun} disabled={busy} style={sx.primary}>
          {mode === "triage" ? (busy ? "Analyzing…" : "Check Risk") :
           mode === "appointments" ? (busy ? "Finding…" : "Suggest Appointment") :
           (busy ? "Estimating…" : "Estimate Costs")}
        </button>
        <button onClick={onStop} disabled={!busy} style={sx.secondary}>
          Stop
        </button>
      </div>
    </section>
  );
}
