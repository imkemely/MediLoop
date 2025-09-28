// server/server.js
import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import { EventEmitter } from "events";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

/* ---------- setup ---------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = (...p) => path.join(__dirname, "data", ...p);

const app = express();
app.use(cors());
app.use(express.json());

/* ---------- tiny helpers ---------- */
async function readJSON(name, fallback) {
  try { return JSON.parse(await readFile(dataPath(name), "utf-8")); }
  catch { return fallback; }
}
async function writeJSON(name, obj) {
  await writeFile(dataPath(name), JSON.stringify(obj, null, 2), "utf-8");
}
async function appendLog(evt) {
  const log = await readJSON("agent_log.json", []);
  log.push({ ts: new Date().toISOString(), ...evt });
  await writeJSON("agent_log.json", log);
}

/* ---------- event bus & SSE ---------- */
const bus = new EventEmitter();
bus.setMaxListeners(50);

function publish(type, payload = {}) {
  const event = { id: randomUUID(), type, payload, at: Date.now() };
  // fan out to SSE listeners
  for (const res of sseClients) {
    res.write(`event: ${type}\n`);
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }
  appendLog({ event: type, payload }).catch(() => {});
}

const sseClients = new Set();
app.get("/api/events/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  sseClients.add(res);
  const hb = setInterval(() => {
    res.write(`event: heartbeat\ndata: {"t":${Date.now()}}\n\n`);
  }, 15000);

  req.on("close", () => {
    clearInterval(hb);
    sseClients.delete(res);
    res.end();
  });
});

/* ---------- SIMPLE HOME/HEALTH ---------- */
app.get("/", (_req, res) =>
  res.send("MediLoop backend is running. Try /health, /api/events/stream, /api/state"));
app.get("/health", (_req, res) => res.json({ ok: true }));

/* ---------- existing demo SSE run (kept) ---------- */
const runs = new Map();
const watchers = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function on(runId, fn) { if (!watchers.has(runId)) watchers.set(runId, new Set()); watchers.get(runId).add(fn); }
function off(runId, fn) { watchers.get(runId)?.delete(fn); }
function emit(runId, type, payload) { watchers.get(runId)?.forEach((fn) => fn({ type, payload })); }
function fail(runId, e) {
  const r = runs.get(runId);
  if (r) { r.status = "failed"; r.error = String(e); }
  emit(runId, "final", { status: "failed", error: String(e) });
}

async function simulateRun(runId, _params) {
  const r = runs.get(runId); if (!r) return;
  await sleep(500);
  emit(runId, "log", { msg: "Agent started" });
  for (const token of "Thinking about your task...".split(" ")) { await sleep(120); emit(runId, "token", { token }); }
  const step1 = { index: 0, tool: "web_search", input: { q: "demo" }, output: { top: "example.com" } };
  r.steps.push(step1); emit(runId, "step", step1); await sleep(300);
  r.status = "done"; r.final = `Done: ${r.task}`;
  emit(runId, "final", { status: "done", message: r.final });
}

app.post("/api/agents/run", (req, res) => {
  const { task = "demo task", params = {} } = req.body || {};
  const runId = randomUUID();
  runs.set(runId, { id: runId, task, status: "running", steps: [] });
  res.json({ runId, status: "started" });
  simulateRun(runId, params).catch((e) => fail(runId, e));
});

app.get("/api/agents/runs/:runId/stream", (req, res) => {
  const { runId } = req.params;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const send = (type, payload) => res.write(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`);
  const r = runs.get(runId);
  if (r) {
    send("status", { status: r.status, task: r.task, runId: r.id });
    for (const step of r.steps) send("step", step);
    if (r.final) send("final", { status: r.status, message: r.final });
  } else send("status", { status: "unknown_run", runId });
  const hb = setInterval(() => send("heartbeat", { t: Date.now() }), 15000);
  const watcher = (evt) => send(evt.type, evt.payload);
  on(runId, watcher);
  req.on("close", () => { clearInterval(hb); off(runId, watcher); res.end(); });
});

/* ==================================================
   THREE AGENTS (event-driven)
   ================================================== */

/** UTIL: pick earliest slot from clinic list **/
async function pickEarliestSlot() {
  const clinics = await readJSON("clinic_slots.json", []);
  let best = null;
  for (const c of clinics) {
    for (const s of c.slots) {
      const t = +new Date(s);
      if (!isFinite(t)) continue;
      if (!best || t < best.time) {
        best = { clinicId: c.clinicId, clinicName: c.clinicName, inNetwork: c.inNetwork,
                 distanceMiles: c.distanceMiles, slot: s, time: t };
      }
    }
  }
  return best;
}

/* ---------- Scheduler Agent ---------- */
/*
 Listens for:
   - REQUEST_BOOKING
   - SEEK_SOONER (from wellness)
 Behavior:
   - books earliest now into booking.json
   - emits BOOKING_UPDATED
   - loop: check for better slot every N sec, rebook if earlier, emit BOOKING_UPDATED
*/
let schedulerLoopActive = false;
let schedulerInterval = 15000; // 15s demo loop

async function book(best) {
  const booking = { bookingId: randomUUID(), ...best, bookedAt: new Date().toISOString() };
  await writeJSON("booking.json", booking);
  publish("BOOKING_UPDATED", booking);
}

async function handleRequestBooking(_payload = {}) {
  const best = await pickEarliestSlot();
  if (best) {
    await book(best);
  } else {
    publish("BOOKING_FAILED", { reason: "No available slots" });
  }
}

async function handleSeekSooner() {
  // On seek-sooner, temporarily speed up loop to re-check more aggressively
  schedulerInterval = 5000; // 5s for a bit
  setTimeout(() => { schedulerInterval = 15000; }, 60000);
}

bus.on("REQUEST_BOOKING", handleRequestBooking);
bus.on("SEEK_SOONER", handleSeekSooner);

// background loop to improve booking if earlier appears
async function schedulerLoop() {
  if (schedulerLoopActive) return;
  schedulerLoopActive = true;
  while (schedulerLoopActive) {
    try {
      const current = await readJSON("booking.json", {});
      const best = await pickEarliestSlot();
      if (best && current.slot) {
        if (+new Date(best.slot) < +new Date(current.slot)) {
          await book(best); // found an earlier slot → rebook
        }
      }
    } catch { /* ignore */ }
    await sleep(schedulerInterval);
  }
}
schedulerLoop();

/* ---------- Coverage Agent ---------- */
/*
 Listens for: BOOKING_UPDATED
 Behavior:
   - reads insurance.txt
   - produces simple 3 bullets (what you’ll pay / where you can go / what to bring)
   - writes coverage.json and emits COVERAGE_READY
*/
async function summarizeCoverage() {
  const txt = await readFile(dataPath("insurance.txt"), "utf-8").catch(() => "");
  const bullets = [
    `What you'll pay: PCP $30 copay; Urgent Care $75; ER $300 + 20% after deductible.`,
    `Where you can go: In-network clinics (like Greenway, Uptown UC) keep costs lower.`,
    `What to bring: Photo ID, insurance card, list of meds, and recent test results.`,
  ];
  // naive enhancements from text:
  if (/deductible:\s*\$?2,?0?0?0/i.test(txt)) {
    bullets[0] = `What you'll pay: PCP $30, Urgent Care $75; ER $300 + 20% after a $2,000 deductible (then 20%).`;
  }
  const summary = { summary: bullets, at: new Date().toISOString() };
  await writeJSON("coverage.json", summary);
  publish("COVERAGE_READY", summary);
}

bus.on("BOOKING_UPDATED", summarizeCoverage);

/* ---------- Wellness Agent ---------- */
/*
 Listens for: SYMPTOMS_SUBMITTED
 Behavior:
   - simple rules to triage
   - writes wellness.json; if urgent → publish SEEK_SOONER
*/
function triageRules(text = "") {
  const t = text.toLowerCase();
  const urgentSignals = ["chest pain", "trouble breathing", "shortness of breath", "fainting", "severe"];
  const mildSignals = ["mild", "sore throat", "runny nose", "cough", "fatigue", "headache", "fever"];
  const urgent = urgentSignals.some(s => t.includes(s));
  if (urgent) {
    return {
      level: "HIGH",
      advice: [
        "Your symptoms could be urgent. Consider urgent care or ER sooner.",
        "Avoid strenuous activity; have someone accompany you if possible.",
        "If severe chest pain or breathing trouble, call emergency services.",
      ]
    };
  }
  const mild = mildSignals.some(s => t.includes(s));
  if (mild) {
    return {
      level: "LOW",
      advice: [
        "Likely mild. Rest, hydrate, and consider OTC symptom relief as appropriate.",
        "Monitor temperature and symptoms for 24–48 hours.",
        "Seek care sooner if symptoms worsen or you develop red-flag signs.",
      ]
    };
  }
  return {
    level: "MEDIUM",
    advice: [
      "Consider a primary care or urgent care visit in the next 24–48 hours.",
      "Note any changes (worsening fever, chest symptoms, confusion) and seek care sooner if present.",
      "Prepare a list of recent meds and allergies before your visit.",
    ]
  };
}

async function handleSymptomsSubmitted(payload = {}) {
  const { text = "" } = payload;
  const triage = triageRules(text);
  await writeJSON("wellness.json", { input: text, triage, at: new Date().toISOString() });
  publish("WELLNESS_READY", triage);
  if (triage.level === "HIGH") {
    publish("SEEK_SOONER", { reason: "Urgent triage" });
  }
}

bus.on("SYMPTOMS_SUBMITTED", handleSymptomsSubmitted);

/* ---------- Simple endpoints to trigger/listen ---------- */
// trigger booking
app.post("/api/request-booking", async (req, res) => {
  publish("REQUEST_BOOKING", req.body || {});
  res.json({ ok: true });
});

// submit symptoms
app.post("/api/submit-symptoms", async (req, res) => {
  const { text = "" } = req.body || {};
  publish("SYMPTOMS_SUBMITTED", { text });
  res.json({ ok: true });
});

// snapshot state (frontend can poll this for latest)
app.get("/api/state", async (_req, res) => {
  const [booking, coverage, wellness, log] = await Promise.all([
    readJSON("booking.json", {}),
    readJSON("coverage.json", {}),
    readJSON("wellness.json", {}),
    readJSON("agent_log.json", []),
  ]);
  res.json({ booking, coverage, wellness, log });
});

/* ---------- start ---------- */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`server on :${PORT}`));
