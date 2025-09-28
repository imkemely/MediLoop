from __future__ import annotations
import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = ROOT / ".env"
load_dotenv(dotenv_path=ENV_PATH)

def get_supabase() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError(f"Supabase env vars missing. Looked for .env at: {ENV_PATH}")
    return create_client(url, key)
