from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import List, Any, Optional

app = FastAPI(title="MediLoop API", version="0.1.0")

# CORS (allow everything for hackathon; tighten later)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------- Models --------
class TriageIn(BaseModel):
    userId: str
    symptoms: str
    vitals: Optional[dict] = None

class TriageOut(BaseModel):
    risk: str
    guidance: str
    nextCheckInISO: Optional[str] = None

class CheckInIn(BaseModel):
    entryId: str
    note: Optional[str] = None

# -------- Basic endpoints --------
@app.get("/health")
def health():
    return {"ok": True}

def heuristic_triage(text: str):
    s = text.lower()
    risk = "low"
    if any(k in s for k in ["chest pain","stroke","shortness of breath","bleeding","fainting"]):
        risk = "high"
    elif any(k in s for k in ["dizzy","fever","vomit","worsening","severe"]):
        risk = "medium"
    guidance = {
        "high":   "This may be urgent. Seek in-person care or call local emergency services.",
        "medium": "Monitor closely and consider urgent care if symptoms worsen in 4–6 hours.",
        "low":    "Hydrate, rest, and recheck in a few hours. Seek care if new red flags appear."
    }[risk]
    next_hours = 1 if risk == "high" else 6
    return risk, guidance, next_hours

@app.post("/triage", response_model=TriageOut)
def triage(inp: TriageIn):
    risk, guidance, next_hours = heuristic_triage(inp.symptoms)
    next_iso = (datetime.utcnow() + timedelta(hours=next_hours)).isoformat() + "Z"

    # Persist to Supabase (safe import inside handler)
    try:
        from backend.db.supabase_client import get_supabase
        sb = get_supabase()
        entry = sb.table("entries").insert({
            "user_id": inp.userId,
            "text": inp.symptoms,
            "vitals_json": inp.vitals or {},
            "triage_json": {"risk": risk, "guidance": guidance, "nextCheckInISO": next_iso}
        }).execute().data[0]

        sb.table("followups").insert({
            "entry_id": entry["id"],
            "due_at": next_iso,
            "status": "pending"
        }).execute()
    except Exception as e:
        # If you haven't set Supabase yet, you can comment the try/except block temporarily.
        print("TRIAGE_DB_ERROR:", repr(e))
        # Don't fail the demo; return the triage result anyway:
        # raise HTTPException(status_code=500, detail=f"DB error: {e}")

    return TriageOut(risk=risk, guidance=guidance, nextCheckInISO=next_iso)

# -------- Entries (list & detail) --------
@app.get("/entries")
def list_entries(userId: str):
    try:
        from backend.db.supabase_client import get_supabase
        sb = get_supabase()
        # Start with NO filter to isolate issues
        res = sb.table("entries").select("*").execute()
        return res.data
    except Exception as e:
        # You will see this line in the uvicorn terminal
        print("SUPABASE_ENTRIES_ERROR:", repr(e))
        # Keep the frontend unblocked: return a stub instead of 500
        return [
            {"id": "stub-1", "user_id": userId, "text": "demo entry",
             "triage_json": {"risk": "low", "guidance": "stub"}}
        ]


@app.get("/entries/{entry_id}")
def get_entry(entry_id: str):
    try:
        from backend.db.supabase_client import get_supabase
        sb = get_supabase()
        entry = sb.table("entries").select("*").eq("id", entry_id).single().execute().data
        checks = sb.table("checks").select("*").eq("entry_id", entry_id).execute().data
        return {"entry": entry, "checks": checks}
    except Exception as e:
        print("ENTRY_DETAIL_ERROR:", repr(e))
        raise HTTPException(status_code=500, detail=f"entry fetch failed: {e}")

# -------- Check-in --------
@app.post("/checkin")
def checkin(inp: CheckInIn):
    try:
        from backend.db.supabase_client import get_supabase
        sb = get_supabase()
        sb.table("checks").insert({"entry_id": inp.entryId, "note": inp.note or ""}).execute()
        sb.table("followups").update({"status": "done"}).eq("entry_id", inp.entryId).eq("status","pending").execute()
        return {"ok": True}
    except Exception as e:
        print("CHECKIN_ERROR:", repr(e))
        raise HTTPException(status_code=500, detail=f"checkin failed: {e}")
