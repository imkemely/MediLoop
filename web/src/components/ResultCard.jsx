// web/src/components/ResultCard.jsx
import { useEffect, useMemo, useState } from "react";
import { sx } from "../styles";

// ---------- helpers ----------
function formatDate(dt) {
  try {
    const d = new Date(dt);
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch { return dt; }
}
const toUTC = (dt) => new Date(dt);
const pad = (n) => String(n).padStart(2, "0");

// local coverage bullets (used if backend coverage summary not present)
function localCoverageBullets(plan, note = "") {
  const hasHSA = /hsa/i.test(note) || /hsa/i.test(plan?.planName || "");
  const inNet = true; // demo assumption
  const copay = inNet ? "$25–$45" : "higher (out-of-network)";
  const where = inNet ? "Any in-network clinic" : "Call your plan for OON options";
  const bring = "ID, insurance card, current meds list";
  return [
    `Expected visit cost: ${copay}. Deductible ${plan?.deductible ? `≈ $${plan.deductible.toLocaleString()}` : "varies"}.`,
    `Where you can go: ${where}.`,
    `What to bring: ${bring}${hasHSA ? " (HSA eligible)" : ""}.`,
  ];
}

function toGCalDate(dt) {
  const d = toUTC(dt);
  const YYYY = d.getUTCFullYear();
  const MM = pad(d.getUTCMonth() + 1);
  const DD = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mm = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  return `${YYYY}${MM}${DD}T${hh}${mm}${ss}Z`;
}

function makeICS({ title, start, durationMinutes = 30, description = "", location = "" }) {
  const dtStart = toGCalDate(start);
  const end = new Date(new Date(start).getTime() + durationMinutes * 60000);
  const dtEnd = toGCalDate(end);
  const id = (crypto?.randomUUID && crypto.randomUUID()) || `uid-${Date.now()}`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MediLoop//EN",
    "BEGIN:VEVENT",
    `UID:${id}`,
    `DTSTAMP:${toGCalDate(new Date())}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${(description || "").replace(/\n/g, "\\n")}`,
    `LOCATION:${location || ""}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return new Blob([ics], { type: "text/calendar;charset=utf-8" });
}

function gcalUrl({ title, start, durationMinutes = 30, details = "", location = "" }) {
  const end = new Date(new Date(start).getTime() + durationMinutes * 60000);
  const dates = `${toGCalDate(start)}/${toGCalDate(end)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates,
    details,
    location,
  });
  return `https://www.google.com/calendar/render?${params.toString()}`;
}

function copy(text) {
  navigator.clipboard?.writeText?.(text);
}

// ---------- defaults ----------
const defaultProviders = [
  {
    name: "Downtown Clinic",
    specialty: "Primary Care",
    inNetwork: true,
    distanceMiles: 2.1,
    languages: ["English", "Spanish"],
    nextSlots: ["2025-09-28T14:00:00Z", "2025-09-29T16:30:00Z"],
  },
];
const defaultPlan = { planName: "BluePlus Bronze HMO", deductible: 3500, oopMax: 8500 };

// ---------- component ----------
export default function ResultCard({ final, busy, mode, userNote, snapshot }) {
  const [providers, setProviders] = useState(defaultProviders);
  const [plan, setPlan] = useState(defaultPlan);

  // load demo data from /public/data
  useEffect(() => {
    fetch("/data/providers.json")
      .then((r) => (r.ok ? r.json() : defaultProviders))
      .then(setProviders)
      .catch(() => setProviders(defaultProviders));

    fetch("/data/plan.json")
      .then((r) => (r.ok ? r.json() : defaultPlan))
      .then(setPlan)
      .catch(() => setPlan(defaultPlan));
  }, []);

  function pickBestProvider(prefs = "") {
    const scored = (providers || []).map((p) => {
      const earliest =
        (p.nextSlots || []).map((s) => +new Date(s)).sort((a, b) => a - b)[0] ?? Infinity;
      const base = (p.inNetwork ? 0 : 100000) + earliest / 1e7 + (p.distanceMiles ?? 0) * 10;
      const spanishNeeded = prefs.toLowerCase().includes("spanish");
      const langBoost =
        spanishNeeded && (p.languages || []).map((l) => l.toLowerCase()).includes("spanish")
          ? -2000
          : 0;
      return { p, earliest, score: base + langBoost };
    });
    scored.sort((a, b) => a.score - b.score);
    return scored[0];
  }

  const booking = snapshot?.booking || {};
  const coverage = snapshot?.coverage || {};
  const wellness = snapshot?.wellness || {};

  const best = useMemo(() => {
    if (mode !== "appointments" || booking?.slot) return null;
    return pickBestProvider(userNote);
  }, [mode, userNote, booking?.slot, providers]);

  const title = booking?.clinicName || best?.p?.name || "Appointment";
  const start = booking?.slot || (best ? new Date(best.earliest).toISOString() : null);
  const location = booking?.clinicName || best?.p?.name || "";

  // Build care plan text (always include coverage via backend OR local fallback)
  const carePlanText = (() => {
    const lines = ["MediLoop Care Plan", ""];
    if (mode !== "insurance") {
      if (booking?.slot) {
        lines.push(`• Appointment: ${title} — ${formatDate(booking.slot)}`);
      } else if (best) {
        lines.push(`• Suggested: ${best.p.name} — ${formatDate(best.earliest)}`);
      }
    }
    const bullets =
      Array.isArray(coverage?.summary) && coverage.summary.length
        ? coverage.summary
        : localCoverageBullets(plan, userNote);
    if (bullets.length) {
      lines.push("", "Coverage:");
      bullets.forEach((b) => lines.push(`- ${b}`));
    }
    if (wellness?.triage?.level) {
      lines.push("", "Wellness:");
      lines.push(`- Urgency: ${wellness.triage.level}`);
      (wellness.triage.advice || []).forEach((a) => lines.push(`- ${a}`));
    }
    if (final && mode === "triage") {
      lines.push("", "Triage Details:", final);
    }
    return lines.join("\n");
  })();

  const downloadText = () => {
    const blob = new Blob([carePlanText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "MediLoop_Care_Plan.txt";
    a.click();
    URL.revokeObjectURL(url);
  };
  const downloadICS = () => {
    if (!start) return;
    const blob = makeICS({ title, start, description: carePlanText, location });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Appointment.ics";
    a.click();
    URL.revokeObjectURL(url);
  };
  const openGCal = () => {
    if (!start) return;
    window.open(
      gcalUrl({ title, start, details: carePlanText, location }),
      "_blank",
      "noopener"
    );
  };

  return (
    <>
      <section style={{ ...sx.card, ...(final ? sx.successCard : {}) }}>
        <div style={sx.cardHeaderRow}>
          <div style={{ fontSize: 16, color: "#0b1220", fontWeight: 800 }}>
            {mode === "triage"
              ? "Triage Result"
              : mode === "appointments"
              ? "Appointment Plan"
              : "Insurance Estimate"}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={sx.secondary} onClick={downloadText}>
              Download Care Plan
            </button>
            {start && (
              <>
                <button style={sx.secondary} onClick={downloadICS}>
                  Add .ics
                </button>
                <button style={sx.secondary} onClick={openGCal}>
                  Add to Google Calendar
                </button>
              </>
            )}
          </div>
        </div>

        {/* TRIAGE */}
        {mode === "triage" && (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={sx.resultText}>{final ? final : "Your guidance will appear here."}</div>
            {wellness?.triage?.level && (
              <div style={{ ...sx.card, borderColor: "#c7f7ef" }}>
                <div style={{ fontWeight: 700 }}>Wellness Agent</div>
                <div>
                  Urgency: <b>{wellness.triage.level}</b>
                </div>
                <ul style={{ margin: "8px 0 0 18px" }}>
                  {(wellness.triage.advice || []).map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* APPOINTMENTS */}
        {mode === "appointments" && (
          <div style={{ display: "grid", gap: 10 }}>
            {booking?.slot ? (
              <div style={{ ...sx.card, borderColor: "#c7f7ef" }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{booking.clinicName}</div>
                <div style={{ color: "#334155" }}>
                  {booking.inNetwork ? "In-network" : "Out-of-network"} • ~
                  {booking.distanceMiles} miles
                </div>
                <div style={{ marginTop: 6 }}>
                  <b>Booked slot:</b> {formatDate(booking.slot)}
                </div>
              </div>
            ) : (() => {
                if (!best) return <div>Suggest an appointment to see options.</div>;
                return (
                  <div style={{ ...sx.card, borderColor: "#c7f7ef" }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{best.p.name}</div>
                    <div style={{ color: "#334155" }}>
                      {best.p.specialty} • {best.p.inNetwork ? "In-network" : "Out-of-network"} • ~
                      {best.p.distanceMiles} miles
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <b>Earliest slot:</b> {formatDate(best.earliest)}
                    </div>
                  </div>
                );
              })()}
            {(booking?.slot || best) && (
              <button
                id="actions-anchor"
                style={sx.primary}
                onClick={() => {
                  const email = `Subject: Appointment Request - ${title}

Hello ${title},

I'd like the earliest available appointment.
Preferred time: ${formatDate(booking?.slot || best?.earliest)}
Reason: ${userNote || "general checkup"}

Please confirm availability and any required documents. Thank you!
`;
                  copy(email);
                }}
              >
                Copy booking email
              </button>
            )}
          </div>
        )}

        {/* INSURANCE */}
        {mode === "insurance" && (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ ...sx.card, borderColor: "#c7f7ef" }}>
              <div style={{ fontWeight: 700 }}>Plan: {plan.planName}</div>
              <div style={{ color: "#334155" }}>
                Deductible: ${plan.deductible.toLocaleString()} • OOP Max: $
                {plan.oopMax.toLocaleString()}
              </div>
            </div>

            {/* coverage summary (backend or local fallback) */}
            <div style={{ ...sx.card, borderColor: "#e2e8f0" }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Coverage Summary</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {(Array.isArray(snapshot?.coverage?.summary) &&
                snapshot.coverage.summary.length
                  ? snapshot.coverage.summary
                  : localCoverageBullets(plan, userNote)
                ).map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {!final && busy && mode === "triage" && (
          <div style={sx.note}>Analyzing your input…</div>
        )}

        <div style={sx.disclaimer}>
          <b>Reminder:</b> MediLoop is for educational guidance and is not a diagnosis. If symptoms
          worsen or you’re worried, seek professional care.
        </div>
      </section>

      {/* Success banner shown after triage finishes */}
      {final && mode === "triage" && (
        <div style={sx.successBanner}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={sx.successIcon}>✓</div>
            <div>Assessment complete</div>
          </div>
          <button
            style={sx.successCTA}
            onClick={() => {
              const el = document.querySelector("#actions-anchor");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            Next: Book/Review appointment
          </button>
        </div>
      )}
    </>
  );
}
