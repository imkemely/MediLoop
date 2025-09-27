import { useMemo } from "react";
import { sx } from "../styles";
import providersData from "../data/providers.json";
import planData from "../data/plan.json";

function formatDate(dt) {
  try {
    const d = new Date(dt);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return dt;
  }
}

function pickBestProvider(prefs = "") {
  const scored = providersData.map(p => {
    const earliest = (p.nextSlots || []).map(s => +new Date(s)).sort((a,b)=>a-b)[0] ?? Infinity;
    const base = (p.inNetwork ? 0 : 100000) + earliest/1e7 + (p.distanceMiles ?? 0)*10;
    const spanishNeeded = prefs.toLowerCase().includes("spanish");
    const langBoost = spanishNeeded && p.languages.map(l=>l.toLowerCase()).includes("spanish") ? -2000 : 0;
    return { p, earliest, score: base + langBoost };
  });
  scored.sort((a,b)=>a.score - b.score);
  return scored[0];
}

function copy(text) {
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text);
}

export default function ResultCard({ final, busy, mode, userNote, snapshot }) {
  // Prefer live state from backend event-driven agents
  const booking = snapshot?.booking || {};
  const coverage = snapshot?.coverage || {};
  const wellness = snapshot?.wellness || {};

  // Fallback: local pick if no booking yet (so Appointments still shows something)
  const best = useMemo(() => {
    if (mode !== "appointments" || booking?.slot) return null;
    return pickBestProvider(userNote);
  }, [mode, userNote, booking?.slot]);

  const emailFromBooking = booking?.clinicName
    ? `Subject: Appointment Request - ${booking.clinicName}

Hello ${booking.clinicName},

I'd like to request the earliest available appointment.
Preferred time: ${formatDate(booking.slot)}
Reason: ${userNote || "general checkup"}

Please confirm availability and any required documents. Thank you!
`
    : "";

  const emailFromBest = best
    ? `Subject: Appointment Request - ${best.p.name}

Hello ${best.p.name},

I'd like to request the earliest available appointment.
Preferred time: ${formatDate(best.earliest)}
Reason: ${userNote || "general checkup"}

Please confirm availability and any required documents. Thank you!
`
    : "";

  return (
    <section style={{ ...sx.card, ...(final ? sx.successCard : {}) }}>
      <div style={sx.cardHeaderRow}>
        <div style={{ fontSize: 14, color: "#475569", marginBottom: 8 }}>
          {mode === "triage" ? "Triage Result"
            : mode === "appointments" ? "Appointment Plan"
            : "Insurance Estimate"}
        </div>
      </div>

      {/* TRIAGE (streams from /api/agents/run) + Wellness card */}
      {mode === "triage" && (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={sx.resultText}>
            {final ? final : "Your guidance will appear here."}
          </div>

          {wellness?.triage?.level && (
            <div style={{ ...sx.card, borderColor: "#c7f7ef" }}>
              <div style={{ fontWeight: 700 }}>Wellness Agent</div>
              <div>Urgency: <b>{wellness.triage.level}</b></div>
              <ul style={{ margin: "8px 0 0 18px" }}>
                {(wellness.triage.advice || []).map((a, i) => <li key={i}>{a}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* APPOINTMENTS (prefer live booking from scheduler loop) */}
      {mode === "appointments" && (
        <div style={{ display: "grid", gap: 10 }}>
          {(booking?.slot) ? (
            <div style={{ ...sx.card, borderColor: "#c7f7ef" }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{booking.clinicName}</div>
              <div style={{ color: "#334155" }}>
                {booking.inNetwork ? "In-network" : "Out-of-network"} • ~{booking.distanceMiles} miles
              </div>
              <div style={{ marginTop: 6 }}><b>Booked slot:</b> {formatDate(booking.slot)}</div>
            </div>
          ) : best ? (
            <div style={{ ...sx.card, borderColor: "#c7f7ef" }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{best.p.name}</div>
              <div style={{ color: "#334155" }}>
                {best.p.specialty} • {best.p.inNetwork ? "In-network" : "Out-of-network"} • ~{best.p.distanceMiles} miles
              </div>
              <div style={{ marginTop: 6 }}><b>Earliest slot:</b> {formatDate(best.earliest)}</div>
            </div>
          ) : (
            <div>No booking yet. Click “Suggest Appointment”.</div>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {(booking?.slot || best) && (
              <button
                style={sx.primary}
                onClick={() => copy(booking?.slot ? emailFromBooking : emailFromBest)}
              >
                Copy booking email
              </button>
            )}
          </div>
        </div>
      )}

      {/* INSURANCE (from Coverage Agent) */}
      {mode === "insurance" && (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ ...sx.card, borderColor: "#c7f7ef" }}>
            <div style={{ fontWeight: 700 }}>Plan: {planData.planName}</div>
            <div style={{ color: "#334155" }}>
              Deductible: ${planData.deductible.toLocaleString()} • OOP Max: ${planData.oopMax.toLocaleString()}
            </div>
          </div>

          {Array.isArray(coverage?.summary) && coverage.summary.length > 0 ? (
            <div style={{ ...sx.card, borderColor: "#e2e8f0" }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Coverage Summary</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {coverage.summary.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          ) : (
            <div style={{ ...sx.card, borderColor: "#e2e8f0" }}>
              Waiting for coverage details… (Trigger an appointment to run the coverage agent.)
            </div>
          )}
        </div>
      )}

      {!final && busy && mode === "triage" && <div style={sx.note}>Analyzing your input…</div>}

      <div style={sx.disclaimer}>
        <b>Reminder:</b> MediLoop is for educational guidance and is not a diagnosis. If symptoms worsen or you’re worried, seek professional care.
      </div>
    </section>
  );
}
