import { useEffect, useRef, useState } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import InputCard from "./components/InputCard";
import ProgressCard from "./components/ProgressCard";
import ResultCard from "./components/ResultCard";
import Footer from "./components/Footer";
import LoginPage from "./components/LoginPage";
import { PRESETS } from "./presets";
import { sx } from "./styles";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function App() {
  // Start on login screen
  const [route, setRoute] = useState("login");
  const [authedEmail, setAuthedEmail] = useState("");

  // App state
  const [mode, setMode] = useState("triage"); // "triage" | "appointments" | "insurance"
  const [text, setText] = useState(PRESETS.triage.example);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState([]);
  const [thinking, setThinking] = useState("");
  const [final, setFinal] = useState("");
  const [showProgress, setShowProgress] = useState(false);

  // SSE (agent bus) state
  const busRef = useRef(null);
  const esRef = useRef(null); // triage SSE
  const [snapshot, setSnapshot] = useState({ booking: {}, coverage: {}, wellness: {}, log: [] });

  const resetUI = () => { setProgress([]); setThinking(""); setFinal(""); };
  const addProgress = (line) => setProgress((p) => (line ? [...p, line] : p));

  // Open global EVENTS stream once and refresh /api/state on interesting events
  useEffect(() => {
    if (!busRef.current) {
      const es = new EventSource(`${API_BASE}/api/events/stream`);
      busRef.current = es;

      const refresh = async () => {
        try {
          const s = await fetch(`${API_BASE}/api/state`).then(r => r.json());
          setSnapshot(s);
        } catch { /* ignore in demo */ }
      };

      const pretty = (type) => ({
        REQUEST_BOOKING: "Booking requested…",
        BOOKING_UPDATED: "Booked / rebooked to an earlier slot 🎉",
        COVERAGE_READY: "Coverage summary prepared.",
        WELLNESS_READY: "Wellness guidance ready.",
        SEEK_SOONER: "Triage suggests a sooner slot — trying…",
      }[type] || type);

      ["REQUEST_BOOKING","BOOKING_UPDATED","COVERAGE_READY","WELLNESS_READY","SEEK_SOONER"].forEach((t) => {
        es.addEventListener(t, (e) => {
          try { const evt = JSON.parse(e.data); addProgress(pretty(evt.type)); }
          catch { addProgress(pretty(t)); }
          refresh();
        });
      });

      es.addEventListener("heartbeat", () => {});
      es.onerror = () => { /* optional: show banner or retry */ };
    }
    return () => { busRef.current?.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toFriendly = (msg) => {
    const m = String(msg || "").toLowerCase();
    if (m.includes("agent started")) return "Starting your analysis…";
    if (m.includes("web_search")) return "Looking up trusted health sources…";
    if (m.includes("parsing") || m.includes("reading")) return "Reviewing your information…";
    if (m.includes("checking") || m.includes("compare")) return "Checking what fits your situation…";
    return "Working on your request…";
  };

  const startRun = async () => {
    try {
      setBusy(true); resetUI(); setShowProgress(true);

      // APPOINTMENTS → trigger scheduler via event
      if (mode === "appointments") {
        await fetch(`${API_BASE}/api/request-booking`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: text }),
        });
        addProgress("Scheduling…");
        setTimeout(() => { setBusy(false); setShowProgress(false); setFinal("Done"); }, 600);
        return;
      }

      // INSURANCE → coverage runs when booking updates; here we just show state
      if (mode === "insurance") {
        addProgress("Loading coverage info…");
        setTimeout(() => { setBusy(false); setShowProgress(false); setFinal("Done"); }, 600);
        return;
      }

      // TRIAGE → use existing /api/agents/run SSE + also notify wellness agent
      const preset = PRESETS[mode];
      const payload = (text || preset.example || "").trim();
      if (!preset.prompt || !payload) {
        addProgress("Please enter some information.");
        setBusy(false);
        return;
      }

      const task = `${preset.prompt}${payload}`;
      const resp = await fetch(`${API_BASE}/api/agents/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, mode }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const { runId } = await resp.json();

      // kick Wellness Agent (parallel)
      await fetch(`${API_BASE}/api/submit-symptoms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (esRef.current) { esRef.current.close(); esRef.current = null; }
      const es = new EventSource(`${API_BASE}/api/agents/runs/${runId}/stream`);
      esRef.current = es;

      es.addEventListener("status", () => addProgress("Preparing…"));
      es.addEventListener("log", (e) => {
        try { const j = JSON.parse(e.data); addProgress(toFriendly(j.msg)); }
        catch { addProgress("Working on your request…"); }
      });
      es.addEventListener("token", (e) => {
        try { const j = JSON.parse(e.data); setThinking((t) => (t ? `${t} ${j.token}` : j.token)); }
        catch { setThinking((t) => (t ? `${t} …` : "…")); }
      });
      es.addEventListener("final", (e) => {
        try { const j = JSON.parse(e.data); setFinal(j.message || "Done"); }
        catch { setFinal(String(e.data || "Done")); }
        setBusy(false);
        setTimeout(() => setShowProgress(false), 1200);
      });
      es.addEventListener("heartbeat", () => {});
      es.onerror = () => {
        addProgress("Connection lost. Please try again.");
        es.close(); esRef.current = null; setBusy(false);
        setTimeout(() => setShowProgress(false), 800);
      };
    } catch {
      addProgress("Something went wrong. Please try again.");
      setBusy(false);
      setTimeout(() => setShowProgress(false), 800);
    }
  };

  const stopRun = () => {
    if (esRef.current) { esRef.current.close(); esRef.current = null; }
    setBusy(false); addProgress("Stopped.");
    setTimeout(() => setShowProgress(false), 500);
  };

  // Login route
  if (route === "login") {
    return (
      <LoginPage
        onSignIn={(email) => { setAuthedEmail(email); setRoute("app"); }}
        onGuest={() => { setAuthedEmail(""); setRoute("app"); }}
      />
    );
  }

  return (
    <div style={sx.app}>
      <Header authed={!!authedEmail} onSignIn={() => setRoute("login")} />
      <div style={sx.body}>
        <Sidebar
          mode={mode}
          onSelect={(m) => { setMode(m); setText(PRESETS[m].example || ""); resetUI(); }}
          onResetText={(t) => { setText(t); resetUI(); }}
        />
        <main style={sx.main}>
          <InputCard
            mode={mode}
            text={text}
            setText={setText}
            busy={busy}
            onRun={startRun}
            onStop={stopRun}
          />
          <ProgressCard show={showProgress} progress={progress} thinking={thinking} />
          <ResultCard
            final={final}
            busy={busy}
            mode={mode}
            userNote={text}
            snapshot={snapshot}
          />
        </main>
      </div>
      <Footer />
    </div>
  );
}
