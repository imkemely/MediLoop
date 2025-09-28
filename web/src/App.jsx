// web/src/App.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import LoginPage from "./components/LoginPage";
import InputCard from "./components/InputCard";
import ProgressCard from "./components/ProgressCard";
import ResultCard from "./components/ResultCard";
import Footer from "./components/Footer";
import { sx } from "./styles";
import { PRESETS } from "./presets";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

export default function App() {
  // routing/auth
  const [route, setRoute] = useState("login"); // 'login' | 'app'
  const [authedEmail, setAuthedEmail] = useState("");

  // feature mode + user text
  const [mode, setMode] = useState("triage"); // 'triage' | 'appointments' | 'insurance'
  const [text, setText] = useState("");

  // run state
  const [busy, setBusy] = useState(false);
  const [runId, setRunId] = useState("");
  const [progress, setProgress] = useState([]); // [{msg}, {step}]
  const [thinking, setThinking] = useState("");
  const [final, setFinal] = useState("");
  const [showProgress, setShowProgress] = useState(false);

  // snapshot of server state (booking/coverage/wellness/log)
  const [snapshot, setSnapshot] = useState(null);

  // refs for auto-scroll
  const progressRef = useRef(null);
  const resultRef = useRef(null);

  const currentPreset = useMemo(() => PRESETS[mode] || {}, [mode]);

  const resetUI = () => {
    setBusy(false);
    setRunId("");
    setProgress([]);
    setThinking("");
    setFinal("");
    setShowProgress(false);
  };

  async function fetchState() {
    try {
      const r = await fetch(`${API_BASE}/api/state`, { cache: "no-store" });
      if (r.ok) setSnapshot(await r.json());
    } catch (_) {}
  }

  // open events stream once
  useEffect(() => {
    const es = new EventSource(`${API_BASE}/api/events/stream`);
    es.addEventListener("status", fetchState);
    es.addEventListener("step", fetchState);
    es.addEventListener("final", fetchState);
    return () => es.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // auto-fill default text per mode
  useEffect(() => {
    setText(currentPreset.prefill || "");
  }, [mode]); // eslint-disable-line

  async function startRun() {
    if (busy) return;
    setBusy(true);
    setFinal("");
    setThinking("");
    setProgress([]);
    setShowProgress(true);
    progressRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    try {
      const body = { task: currentPreset.task || "run", params: { mode, note: text } };
      const resp = await fetch(`${API_BASE}/api/agents/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const { runId: id } = await resp.json();
      setRunId(id);

      const es = new EventSource(`${API_BASE}/api/agents/runs/${id}/stream`);
      es.addEventListener("token", (e) => {
        const { token } = JSON.parse(e.data || "{}");
        if (token) setThinking((prev) => (prev ? prev + " " + token : token));
      });
      es.addEventListener("log", (e) => {
        const { msg } = JSON.parse(e.data || "{}");
        if (msg) setProgress((p) => [...p, { msg }]);
      });
      es.addEventListener("step", (e) => {
        const step = JSON.parse(e.data || "{}");
        setProgress((p) => [...p, { step }]);
      });
      es.addEventListener("final", (e) => {
        const payload = JSON.parse(e.data || "{}");
        setFinal(payload.message || "Done");
        setBusy(false);
        es.close();
        fetchState();
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      });
      es.addEventListener("error", () => es.close());
    } catch (err) {
      console.error(err);
      setBusy(false);
    }
  }

  // login handlers
  const handleSignIn = (email) => {
    setAuthedEmail(email || "guest@mediloop.app");
    setRoute("app");
  };
  const handleGuest = () => {
    setAuthedEmail("guest@mediloop.app");
    setRoute("app");
  };

  // --- LOGIN ROUTE: render only the login page (no header/footer overlap) ---
  if (route === "login") {
    return <LoginPage onSignIn={handleSignIn} onGuest={handleGuest} />;
  }

  // --- APP ROUTE ---
  return (
    <div style={sx.app}>
      <Header authed={!!authedEmail} onSignIn={() => setRoute("login")} />

      <div style={sx.body}>
        <Sidebar active={mode} onSelect={setMode} />

        <main style={sx.main}>
          <InputCard
            mode={mode}
            text={text}
            setText={setText}
            busy={busy}
            onRun={startRun}
            onResetText={() => setText(PRESETS[mode]?.prefill || "")} // <— fixes the missing prop
          />

          <div ref={progressRef}>
            <ProgressCard show={showProgress} progress={progress} thinking={thinking} />
          </div>

          <div ref={resultRef}>
            <ResultCard
              final={final}
              busy={busy}
              mode={mode}
              userNote={text}
              snapshot={snapshot}
            />
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
