// web/src/components/LoginPage.jsx
import { sx, TURQ } from "../styles";
import logo from "/logo.jpg"; // in /public/logo.jpg

export default function LoginPage({ onSignIn, onGuest }) {
  let email = "";

  return (
    <div style={sx.loginWrap}>
      <div style={sx.loginCard}>
        <div style={{ display: "grid", placeItems: "center", gap: 10 }}>
          <img
            src={logo}
            alt="MediLoop"
            style={{ width: 48, height: 48, borderRadius: 12, boxShadow: "0 6px 16px rgba(20,184,166,.35)" }}
          />
          <h1 style={sx.loginTitle}>Welcome to MediLoop</h1>
          <p style={sx.loginSubtitle}>
            Book appointments sooner, know costs up-front, and get wellness guidance.
          </p>
        </div>

        <div style={sx.loginInputRow}>
          <input
            type="email"
            placeholder="Email (optional)"
            style={sx.input}
            onChange={(e) => (email = e.target.value)}
          />
          <div style={sx.loginActions}>
            <button
              style={sx.primary}
              onClick={() => onSignIn?.(email)}
            >
              Continue
            </button>
            <button
              style={{ ...sx.secondary, color: TURQ }}
              onClick={() => onGuest?.()}
            >
              Continue as guest
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
