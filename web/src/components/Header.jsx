import { sx } from "../styles";

export default function Header({ authed, onSignIn }) {
  return (
    <header style={sx.header}>
      <div style={sx.brand}>
        <div style={sx.logo}>◉</div>
        <div>
          <div style={sx.brandName}>MediLoop</div>
          <div style={sx.brandTag}>Patient-friendly guidance</div>
        </div>
      </div>
      <nav>
        <button onClick={onSignIn} style={sx.signIn}>
          {authed ? "Account" : "Sign in"}
        </button>
      </nav>
    </header>
  );
}
