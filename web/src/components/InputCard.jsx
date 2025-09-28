// web/src/components/InputCard.jsx
import { sx } from "../styles";

export default function InputCard({
  mode,
  text,
  setText,
  busy,
  onRun,
  onResetText = () => {}, // safe default (in case)
}) {
  const title =
    mode === "triage"
      ? "Describe what's going on"
      : mode === "appointments"
      ? "Tell us your preferences"
      : "Tell us about your insurance";

  const placeholder =
    mode === "triage"
      ? "e.g., I’ve had a sore throat and mild fever for 2 days…"
      : mode === "appointments"
      ? "e.g., prefer afternoon, Spanish-speaking, near downtown…"
      : "e.g., I have BluePlus Bronze HMO…";

  return (
    <section style={sx.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={sx.h2}>{title}</h2>
        <span
          style={{
            ...sx.badge,
            ...(busy ? sx.badgeBusy : sx.badgeReady),
          }}
        >
          {busy ? "Working…" : "Ready"}
        </span>
      </div>

      <p style={sx.desc}>
        {mode === "triage" &&
          "Write a sentence or two. We’ll triage and give clear next steps."}
        {mode === "appointments" &&
          "Tell us constraints (time, language, location). We’ll suggest the earliest good option."}
        {mode === "insurance" &&
          "Paste plan info or just your plan name. We’ll summarize likely costs in plain English."}
      </p>

      <label style={sx.label}>Notes</label>
      <div style={{ position: "relative" }}>
        <textarea
          style={sx.textarea}
          rows={5}
          maxLength={2000}
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {/* visual-only mic button */}
        <button
          type="button"
          aria-label="Voice input (coming soon)"
          title="Voice input (coming soon)"
          style={{
            position: "absolute",
            right: 10,
            bottom: 10,
            padding: "8px 10px",
            borderRadius: 10,
            border: `1px solid #b7ece7`,
            background: "#ffffff",
            cursor: "default",
          }}
          onClick={(e) => e.preventDefault()}
        >
          🎤
        </button>
      </div>

      <div style={sx.actions}>
        <button disabled={busy} style={sx.primary} onClick={onRun}>
          {mode === "triage"
            ? "Check risk"
            : mode === "appointments"
            ? "Suggest appointment"
            : "Explain coverage"}
        </button>
      </div>
    </section>
  );
}
