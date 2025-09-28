// web/src/styles.js
export const TURQ = "#14b8a6";
export const TURQ_DARK = "#0ea5a4";
export const INK = "#0b1220";

// Resolve public URLs in Vite safely
const BASE =
  (import.meta && import.meta.env && import.meta.env.BASE_URL)
    ? import.meta.env.BASE_URL
    : "/";

// Use the file you put in /public (e.g., /public/bg.jpg and /public/logo.jpg)
const BG_URL = `${BASE}bg.jpg`;

// Soft white overlay on top of the image so text/cards are readable
const bgImage = (url) =>
  `linear-gradient(180deg, rgba(255,255,255,.65), rgba(255,255,255,.65)), url("${url}") center/cover no-repeat`;

export const sx = {
  // APP & GLOBAL
  app: {
    minHeight: "100vh",
    background: bgImage(BG_URL),
    backgroundAttachment: "fixed",
    color: INK,
    fontFamily: "Inter, system-ui, Segoe UI, Roboto, sans-serif",
    fontSize: "18px",
    lineHeight: 1.6,
    display: "grid",
    gridTemplateRows: "auto 1fr auto",
  },

  // HEADER
  header: {
    padding: "16px 22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "rgba(255,255,255,0.9)",
    backdropFilter: "saturate(140%) blur(8px)",
    borderBottom: "1px solid #d7efef",
    position: "sticky",
    top: 0,
    zIndex: 20,
  },
  brand: { display: "flex", alignItems: "center", gap: 12 },
  logoImg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    boxShadow: "0 6px 16px rgba(20,184,166,.35)",
    objectFit: "cover",
  },
  brandName: { fontSize: 20, fontWeight: 800, letterSpacing: 0.3 },
  brandTag: { fontSize: 12, opacity: 0.7 },
  signIn: {
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${TURQ}`,
    background: "white",
    color: TURQ_DARK,
    cursor: "pointer",
    fontWeight: 700,
    transition: "transform .08s ease",
  },
  signInHover: { transform: "translateY(-1px)" },

  // BODY LAYOUT
  body: {
    display: "grid",
    gridTemplateColumns: "260px 1fr",
    gap: 20,
    padding: 20,
  },

  // SIDEBAR
  sidebar: {
    background: "rgba(255,255,255,0.95)",
    border: "1px solid #d7efef",
    borderRadius: 14,
    padding: 12,
    display: "grid",
    gap: 8,
    height: "fit-content",
    position: "sticky",
    top: 82,
  },
  sideItem: {
    outline: "none",
    textAlign: "left",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #e6f6f5",
    background: "#f6fefe",
    color: INK,
    cursor: "pointer",
    fontWeight: 600,
  },
  sideItemActive: {
    outline: "none",
    background: `linear-gradient(135deg, ${TURQ}, #3dd6c6)`,
    borderColor: "#9fe8df",
    color: "white",
    boxShadow: "0 6px 16px rgba(20,184,166,.25)",
  },

  // MAIN
  main: { display: "grid", gap: 20, alignContent: "start" },

  // CARDS
  card: {
    background: "rgba(255,255,255,0.95)",
    border: "1px solid #d7efef",
    borderRadius: 16,
    padding: 18,
    boxShadow: "0 6px 16px rgba(20,184,166,.06)",
  },
  successCard: {
    borderColor: "#86efac",
    boxShadow: "0 8px 24px rgba(34,197,94,.15)",
  },

  // SUCCESS BANNER (appears when a result is ready)
  successBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
    color: "#065f46",
    padding: "10px 12px",
    borderRadius: 12,
    marginBottom: 12,
    fontWeight: 700,
  },
  successIcon: {
    width: 28,
    height: 28,
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background: "#10b981",
    color: "white",
    fontWeight: 800,
  },
  successCTA: {
    padding: "8px 12px",
    borderRadius: 10,
    border: `1px solid ${TURQ}`,
    background: "white",
    color: TURQ_DARK,
    fontWeight: 700,
    cursor: "pointer",
  },

  // CARD HEADERS
  cardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  cardHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  h2: { margin: 0, fontSize: 22 },

  // BADGES
  badge: { padding: "4px 10px", borderRadius: 999, border: "1px solid #e2f7f5", fontSize: 13 },
  badgeReady: { background: "#e6fffc", color: TURQ_DARK, borderColor: "#baf3ec" },
  badgeBusy: { background: "#fff7e6", color: "#a16207", borderColor: "#fde68a" },

  // TYPOGRAPHY / FIELDS
  desc: { marginTop: 6, color: "#334155" },
  label: { marginTop: 12, marginBottom: 6, display: "block", fontWeight: 700 },
  textarea: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    border: "1px solid #b7ece7",
    background: "#fcfffe",
    color: INK,
    fontSize: 16,
    lineHeight: 1.6,
    resize: "none",
  },
  input: {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    border: "1px solid #b7ece7",
    background: "#fcfffe",
    color: INK,
    marginBottom: 10,
    fontSize: 16,
  },

  // BUTTONS
  actions: { display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" },
  primary: {
    padding: "12px 18px",
    borderRadius: 12,
    border: `1px solid ${TURQ}`,
    background: TURQ,
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 6px 16px rgba(20,184,166,.35)",
    transition: "transform .08s ease",
  },
  primaryHover: { transform: "translateY(-1px)" },
  secondary: {
    padding: "12px 18px",
    borderRadius: 12,
    border: "1px solid #b7ece7",
    background: "#f6fffe",
    color: INK,
    fontWeight: 700,
    cursor: "pointer",
    transition: "transform .08s ease",
  },
  secondaryHover: { transform: "translateY(-1px)" },

  // STREAM / THINKING
  streamBox: {
    border: "1px solid #e6f6f5",
    borderRadius: 12,
    padding: 12,
    minHeight: 92,
    background: "#f6fffe",
    color: INK,
  },
  progressLine: { marginBottom: 4 },
  thinking: { marginTop: 6, opacity: 0.9 },

  // RESULTS & NOTES
  resultText: { whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: 18 },
  note: { marginTop: 8, color: "#334155", fontSize: 14 },
  disclaimer: {
    marginTop: 12,
    fontSize: 12,
    color: "#0f172a",
    background: "#fefce8",
    border: "1px solid #fde68a",
    padding: 12,
    borderRadius: 12,
  },

  // FOOTER (smaller & lighter)
  footerBar: {
    marginTop: 12,
    paddingTop: 14,
    background: "white",
    borderTop: "1px solid #d7efef",
  },
  footerColumns: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 10,
    padding: "0 16px 12px",
  },
  footerColTitle: { fontWeight: 700, marginBottom: 6, fontSize: 14 },
  footerLink: {
    display: "block",
    color: INK,
    textDecoration: "none",
    marginBottom: 4,
    fontSize: 13,
    opacity: 0.9,
  },
  footerBottom: {
    borderTop: "1px solid #e2e8f0",
    padding: "8px 16px",
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    color: "#475569",
    fontSize: 12,
  },

  // LOGIN
  loginWrap: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: bgImage("/bg.jpg"),
    backgroundAttachment: "fixed",
    padding: 18,
  },
  loginCard: {
    width: "min(780px, 92vw)",
    background: "rgba(255,255,255,0.95)",
    border: "1px solid #d7efef",
    borderRadius: 20,
    padding: 28,
    boxShadow: "0 18px 60px rgba(11,18,32,.15)",
    textAlign: "center",
  },
  loginTitle: { margin: 0, fontSize: 34, fontWeight: 900, letterSpacing: 0.2 },
  loginSubtitle: { marginTop: 8, color: "#334155", fontSize: 18 },
  loginActions: { display: "flex", gap: 12, justifyContent: "center", marginTop: 18, flexWrap: "wrap" },
  loginInputRow: { display: "grid", gap: 10, marginTop: 14 },
  loginHint: { marginTop: 10, color: "#334155", fontSize: 14, opacity: 0.9 },
};
