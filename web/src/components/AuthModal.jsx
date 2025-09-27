import { sx } from "../styles";
import { useState } from "react";

export default function AuthModal({ onClose, onAuthed }) {
  const [email, setEmail] = useState("");
  return (
    <div style={sx.modalWrap} role="dialog" aria-modal="true">
      <div style={sx.modal}>
        <div style={sx.modalHeader}>
          <div style={sx.modalTitle}>Sign in</div>
          <button onClick={onClose} style={sx.modalClose} aria-label="Close">✕</button>
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={sx.label} htmlFor="email">Email</label>
          <input
            id="email" type="email" value={email} placeholder="you@example.com"
            onChange={(e) => setEmail(e.target.value)} style={sx.input}
          />
          <button onClick={() => { onAuthed(email); onClose(); }} disabled={!email} style={sx.primary}>
            Continue
          </button>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
            (Demo only — no real account created.)
          </div>
        </div>
      </div>
    </div>
  );
}
