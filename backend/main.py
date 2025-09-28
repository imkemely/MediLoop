# backend/main.py
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import importlib

# ---------------- FastAPI app ----------------
app = FastAPI(title="MediLoop API", version="0.3.0")

# CORS (open for dev; tighten in prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- Models ----------------
class TriageIn(BaseModel):
    userId: str
    symptoms: str
    vitals: Optional[Dict[str, Any]] = None  # e.g., {"temp": 99.5}

class TriageOut(BaseModel):
    risk: str
    guidance: str
    nextCheckInISO: Optional[str] = None
    entryId: Optional[str] = None  # return created entry id for the UI

class CheckInIn(BaseModel):
    entryId: str
    note: Optional[str] = ""

# ---------------- Health ----------------
@app.get("/health")
def health():
    return {"ok": True}

# ---------------- Heuristic triage ----------------
def heuristic_triage(text: str, vitals: Optional[Dict[str, Any]] = None):
    s = (text or "").lower()
    temp = None
    try:
        if vitals and "temp" in vitals:
            temp = float(vitals["temp"])
    except Exception:
        temp = None

    # Red flags first
    if any(k in s for k in ["chest pain", "trouble breathing", "shortness of breath", "fainting", "stroke"]):
        return "high", "This may be urgent. Seek in-person care or call emergency services.", 1

    # Temp-based rules
    if temp is not None:
        if temp >= 102.0:
            return "high", "High fever. Hydrate and seek urgent care if symptoms worsen.", 2
        if temp >= 100.4:
            return "medium", "Mild fever. Hydrate, rest, and recheck soon.", 6

    # Keyword rules
    if any(k in s for k in ["severe", "worsening", "unbearable", "vomit", "dizzy"]):
        return "medium", "Monitor closely; consider urgent care if it worsens.", 6

    # Default
    return "low", "Hydrate, rest, and recheck in a few hours. Seek care if new red flags appear.", 6

# ---------------- TRIAGE (create entry) ----------------
@app.post("/triage", response_model=TriageOut)
def triage(inp: TriageIn):
    risk, guidance, next_hours = heuristic_triage(inp.symptoms, inp.vitals)
    next_iso = (datetime.utcnow() + timedelta(hours=next_hours)).isoformat() + "Z"
    entry_id: Optional[str] = None

    # Persist to Supabase (safe import inside handler)
    try:
        from backend.db.supabase_client import get_supabase
        sb = get_supabase()

        entry = (
            sb.table("entries")
              .insert({
                  "user_id": inp.userId,
                  "text": inp.symptoms,
                  "vitals_json": inp.vitals or {},
                  "triage_json": {"risk": risk, "guidance": guidance, "nextCheckInISO": next_iso},
              })
              .execute()
              .data[0]
        )
        entry_id = entry["id"]

        # Optional follow-up row
        sb.table("followups").insert({
            "entry_id": entry_id,
            "due_at": next_iso,
            "status": "pending",
        }).execute()

    except Exception as e:
        # Don’t block the flow if DB write fails; log and still return triage result
        print("TRIAGE_DB_ERROR:", repr(e))

    return TriageOut(risk=risk, guidance=guidance, nextCheckInISO=next_iso, entryId=entry_id)

# ---------------- ENTRIES (list & detail) ----------------
@app.get("/entries")
def list_entries(userId: str):
    try:
        from backend.db.supabase_client import get_supabase
        sb = get_supabase()
        res = (
            sb.table("entries")
              .select("*")
              .eq("user_id", userId)
              .order("created_at", desc=True)
              .execute()
        )
        return res.data
    except Exception as e:
        print("ENTRIES_ERROR:", repr(e))
        raise HTTPException(status_code=500, detail=f"entries failed: {e}")

@app.get("/entries/{entry_id}")
def get_entry(entry_id: str):
    try:
        from backend.db.supabase_client import get_supabase
        sb = get_supabase()
        entry = sb.table("entries").select("*").eq("id", entry_id).single().execute().data
        checks = sb.table("checks").select("*").eq("entry_id", entry_id).order("created_at", desc=True).execute().data
        return {"entry": entry, "checks": checks}
    except Exception as e:
        print("ENTRY_DETAIL_ERROR:", repr(e))
        raise HTTPException(status_code=500, detail=f"entry fetch failed: {e}")

# ---------------- CHECK-IN (create) ----------------
@app.post("/checkin")
def checkin(inp: CheckInIn):
    try:
        # robust import avoids stale caches
        mod = importlib.import_module("backend.db.supabase_client")
        mod = importlib.reload(mod)
        get_supabase = getattr(mod, "get_supabase")

        sb = get_supabase()
        row = {"entry_id": str(inp.entryId)}
        if inp.note:
            row["note"] = str(inp.note)

        res = sb.table("checks").insert([row]).execute()  # list insert is safest
        return {"ok": True, "inserted": len(res.data or [])}
    except Exception as e:
        print("CHECKIN_ERROR:", repr(e))
        raise HTTPException(status_code=500, detail=f"checkin failed: {e}")

# ---------------- CHECKS (list for an entry) ----------------
@app.get("/checks")
def list_checks(entryId: str):
    try:
        from backend.db.supabase_client import get_supabase
        sb = get_supabase()
        res = (
            sb.table("checks")
              .select("*")
              .eq("entry_id", entryId)
              .order("created_at", desc=True)
              .execute()
        )
        return res.data
    except Exception as e:
        print("CHECKS_LIST_ERROR:", repr(e))
        raise HTTPException(status_code=500, detail=f"checks failed: {e}")
