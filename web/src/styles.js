// web/src/styles.js
export const TURQ = "#14b8a6";
export const TURQ_DARK = "#0ea5a4";
export const INK = "#0b1220";

// Clean gradient background instead of image
const cleanBackground = "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #ecfdf5 100%)";

export const sx = {
  // APP & GLOBAL
  app: {
    minHeight: "100vh",
    background: cleanBackground,
    color: INK,
    fontFamily: "Inter, system-ui, Segoe UI, Roboto, sans-serif",
    fontSize: "18px",
    lineHeight: 1.6,
    display: "grid",
    gridTemplateRows: "auto 1fr auto",
  },

  // HEADER
  header: {
    padding: "20px 24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "rgba(255,255,255,0.95)",
    backdropFilter: "saturate(140%) blur(10px)",
    borderBottom: "1px solid #d7efef",
    position: "sticky",
    top: 0,
    zIndex: 20,
    boxShadow: "0 4px 12px rgba(20,184,166,0.08)",
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
    borderRadius: 16,
    padding: 12,
    display: "grid",
    gap: 8,
    height: "fit-content",
    position: "sticky",
    top: 102,
    boxShadow: "0 8px 25px rgba(20,184,166,0.1)",
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
    transition: "all 0.2s ease",
  },
  sideItemActive: {
    outline: "none",
    background: `linear-gradient(135deg, ${TURQ}, #3dd6c6)`,
    borderColor: "#9fe8df",
    color: "white",
    boxShadow: "0 8px 20px rgba(20,184,166,.3)",
    transform: "translateY(-1px)",
  },

  // MAIN
  main: { display: "grid", gap: 24, alignContent: "start" },

  // CARDS
  card: {
    background: "rgba(255,255,255,0.95)",
    border: "1px solid #d7efef",
    borderRadius: 20,
    padding: 24,
    boxShadow: "0 8px 25px rgba(20,184,166,0.15)",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  },
  successCard: {
    borderColor: "#86efac",
    boxShadow: "0 12px 30px rgba(34,197,94,.2)",
    transform: "translateY(-2px)",
  },

  // SUCCESS BANNER
  successBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    background: "linear-gradient(135deg, #ecfdf5, #d1fae5)",
    border: "1px solid #a7f3d0",
    color: "#065f46",
    padding: "12px 16px",
    borderRadius: 16,
    marginBottom: 12,
    fontWeight: 700,
    boxShadow: "0 4px 12px rgba(34,197,94,0.15)",
  },
  successIcon: {
    width: 32,
    height: 32,
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "white",
    fontWeight: 800,
    boxShadow: "0 4px 8px rgba(16,185,129,0.3)",
  },
  successCTA: {
    padding: "10px 16px",
    borderRadius: 12,
    border: `1px solid ${TURQ}`,
    background: "white",
    color: TURQ_DARK,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s ease",
  },

  // CARD HEADERS
  cardHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  h2: { margin: 0, fontSize: 24, fontWeight: 800 },

  // BADGES
  badge: { 
    padding: "6px 12px", 
    borderRadius: 999, 
    fontSize: 13,
    fontWeight: 600,
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
  },
  badgeReady: { 
    background: "linear-gradient(135deg, #e6fffc, #ccfbf1)", 
    color: TURQ_DARK, 
    border: "1px solid #a7f3d0"
  },
  badgeBusy: { 
    background: "linear-gradient(135deg, #fff7ed, #fed7aa)", 
    color: "#a16207", 
    border: "1px solid #fde68a"
  },

  // TYPOGRAPHY / FIELDS
  desc: { marginTop: 8, color: "#475569", fontSize: 16 },
  label: { marginTop: 16, marginBottom: 8, display: "block", fontWeight: 700, fontSize: 16 },
  textarea: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    border: "2px solid #e0f2fe",
    background: "#fcfffe",
    color: INK,
    fontSize: 16,
    lineHeight: 1.6,
    resize: "none",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    outline: "none",
  },
  input: {
    width: "100%",
    padding: 14,
    borderRadius: 16,
    border: "2px solid #e0f2fe",
    background: "#fcfffe",
    color: INK,
    marginBottom: 12,
    fontSize: 16,
    transition: "border-color 0.2s ease",
    outline: "none",
  },

  // BUTTONS
  actions: { display: "flex", gap: 16, alignItems: "center", marginTop: 20, flexWrap: "wrap" },
  primary: {
    padding: "14px 24px",
    borderRadius: 16,
    border: "none",
    background: `linear-gradient(135deg, ${TURQ}, #0ea5a4)`,
    color: "white",
    fontWeight: 800,
    fontSize: 16,
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(20,184,166,.4)",
    transition: "transform .15s ease, box-shadow .15s ease",
  },
  secondary: {
    padding: "12px 20px",
    borderRadius: 16,
    border: "2px solid #b7ece7",
    background: "rgba(255,255,255,0.9)",
    color: INK,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all .15s ease",
  },

  // STREAM / THINKING
  streamBox: {
    border: "2px solid #e6f6f5",
    borderRadius: 16,
    padding: 16,
    minHeight: 100,
    background: "linear-gradient(135deg, #f6fffe, #f0fdfa)",
    color: INK,
    fontSize: 15,
  },
  progressLine: { marginBottom: 8, padding: "4px 0" },
  thinking: { marginTop: 8, opacity: 0.9, fontStyle: "italic" },

  // RESULTS & NOTES
  resultText: { whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: 18 },
  note: { marginTop: 12, color: "#475569", fontSize: 14 },
  disclaimer: {
    marginTop: 16,
    fontSize: 13,
    color: "#0f172a",
    background: "linear-gradient(135deg, #fefce8, #fef3c7)",
    border: "1px solid #fde68a",
    padding: 16,
    borderRadius: 16,
  },

  // FOOTER
  footerBar: {
    marginTop: 20,
    paddingTop: 16,
    background: "rgba(255,255,255,0.9)",
    borderTop: "1px solid #d7efef",
  },
  footerColumns: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
    padding: "0 20px 16px",
  },
  footerColTitle: { fontWeight: 700, marginBottom: 8, fontSize: 14 },
  footerLink: {
    display: "block",
    color: INK,
    textDecoration: "none",
    marginBottom: 6,
    fontSize: 13,
    opacity: 0.8,
    transition: "opacity 0.2s ease",
  },
  footerBottom: {
    borderTop: "1px solid #e2e8f0",
    padding: "10px 20px",
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
    background: cleanBackground,
    padding: 20,
  },
  loginCard: {
    width: "min(800px, 90vw)",
    background: "rgba(255,255,255,0.95)",
    border: "1px solid #d7efef",
    borderRadius: 24,
    padding: 32,
    boxShadow: "0 20px 60px rgba(20,184,166,.2)",
    textAlign: "center",
  },
  loginTitle: { margin: 0, fontSize: 36, fontWeight: 900, letterSpacing: 0.2 },
  loginSubtitle: { marginTop: 12, color: "#475569", fontSize: 18 },
  loginActions: { display: "flex", gap: 16, justifyContent: "center", marginTop: 24, flexWrap: "wrap" },
  loginInputRow: { display: "grid", gap: 12, marginTop: 16 },
};