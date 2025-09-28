import { sx } from "../styles";

const BASE = (import.meta?.env?.BASE_URL) || "/";

export default function Header({ authed, onSignIn }) {
  return (
    <header style={sx.header}>
      <div style={sx.brand}>
        <img src={`${BASE}logo.jpg`} alt="MediLoop" style={sx.logoImg} />
        <div>
          <div style={sx.brandName}>MediLoop</div>
          <div style={sx.brandTag}>Book care • Understand costs • Feel better</div>
        </div>
      </div>
      {!authed && (
        <button style={sx.signIn} onClick={onSignIn}>
          Sign in
        </button>
      )}
    </header>
  );
}
