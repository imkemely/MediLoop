import { sx } from "../styles";
import { useState } from "react";

export default function LoginPage({ onSignIn, onGuest }) {
  const [email, setEmail] = useState("");

  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: "#f5fbfb",
      padding: 16
    }}>
      <div style={{ ...sx.card, width: "min(460px, 92vw)" }}>
        <h2 style={{ marginTop: 0, marginBottom: 6 }}>Welcome to MediLoop</h2>
        <p style={{ marginTop: 0, color: "#334155" }}>
          Get friendly, patient-first guidance for symptoms, diagnoses, and medication safety.
        </p>

        <label style={sx.label} htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          placeholder="you@example.com"
          onChange={(e) => setEmail(e.target.value)}
          style={sx.input}
        />

        <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => onSignIn(email)}
            disabled={!email}
            style={sx.primary}
          >
            Sign in
          </button>
          <button
            onClick={onGuest}
            style={sx.secondary}
          >
            Continue as guest
          </button>
        </div>
      </div>
    </div>
  );
}
