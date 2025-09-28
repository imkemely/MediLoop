import { sx } from "../styles";

export default function ProgressCard({ show, progress, thinking }) {
  if (!show) return null;
  return (
    <section style={sx.card}>
      <div style={sx.cardHeaderRow}>
        <div style={{ fontSize: 14, color: "#475569", marginBottom: 8 }}>Assistant is working…</div>
      </div>
      <div style={sx.streamBox}>
        {progress.length === 0 && !thinking ? (
          <span style={{ opacity: 0.6 }}>Starting…</span>
        ) : (
          <>
            {progress.map((p, i) => (
              <div key={i} style={sx.progressLine}>
                • {typeof p === 'string' ? p : p.msg || 'Processing...'}
              </div>
            ))}
            {thinking && <div style={sx.thinking}>{thinking}</div>}
          </>
        )}
      </div>
    </section>
  );
}
