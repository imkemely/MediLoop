import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";

const app = express();
app.use(cors());
app.use(express.json());

const runs = new Map();
const watchers = new Map();

app.get("/health", (_req, res) => res.json({ ok: true }));

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

  const send = (type, payload) =>
    res.write(`event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`);

  // Send snapshot/backlog on connect
  const r = runs.get(runId);
  if (r) {
    send("status", { status: r.status, task: r.task, runId: r.id });
    for (const step of r.steps) send("step", step);
    if (r.final) send("final", { status: r.status, message: r.final });
  } else {
    send("status", { status: "unknown_run", runId });
  }

  // Subscribe to live updates
  const hb = setInterval(() => send("heartbeat", { t: Date.now() }), 15000);
  const watcher = (evt) => send(evt.type, evt.payload);
  on(runId, watcher);

  req.on("close", () => {
    clearInterval(hb);
    off(runId, watcher);
    res.end();
  });
});

app.get("/api/agents/runs/:runId/result", (req, res) => {
  const r = runs.get(req.params.runId);
  if (!r) return res.status(404).json({ error: "not found" });
  res.json({
    runId: r.id,
    final_status: r.status,
    outputs: r.final ? [{ type: "text", content: r.final }] : [],
    steps: r.steps,
  });
});

function on(runId, fn) {
  if (!watchers.has(runId)) watchers.set(runId, new Set());
  watchers.get(runId).add(fn);
}
function off(runId, fn) {
  watchers.get(runId)?.delete(fn);
}
function emit(runId, type, payload) {
  watchers.get(runId)?.forEach((fn) => fn({ type, payload }));
}
function fail(runId, e) {
  const r = runs.get(runId);
  if (r) {
    r.status = "failed";
    r.error = String(e);
  }
  emit(runId, "final", { status: "failed", error: String(e) });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function simulateRun(runId, params) {
  const r = runs.get(runId);
  if (!r) return;

  // small delay so you can attach the stream in time
  await sleep(1000);

  emit(runId, "log", { msg: "Agent started", params });

  for (const token of "Thinking about your task...".split(" ")) {
    await sleep(120);
    emit(runId, "token", { token });
  }

  const step1 = {
    index: 0,
    tool: "web_search",
    input: { q: "demo" },
    output: { top: "example.com" },
  };
  r.steps.push(step1);
  emit(runId, "step", step1);
  await sleep(300);

  r.status = "done";
  r.final = `Done: ${r.task}`;
  emit(runId, "final", { status: "done", message: r.final });
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`server on :${PORT}`));
