"""asean-travel python backend. local chat (database-derived) + flights proxy."""
from __future__ import annotations

import hashlib
import os
import time
from collections import defaultdict
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from data_loader import PLACES, CATEGORIES, get_place_by_id, places_for_categories
from flights import get_flights_to as flights_to
from prompt import local_reply

AVIATIONSTACK_API_KEY = os.environ.get("AVIATIONSTACK_API_KEY", "").strip()

BACKEND_SECRET = os.environ.get("BACKEND_SECRET", "").strip()
RATE_LIMIT_PER_MIN = int(os.environ.get("RATE_LIMIT_PER_MIN", "30"))
PORT = int(os.environ.get("PORT", "8081"))

app = FastAPI(title="asean travel - local chat + flights backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_rate_buckets: Dict[str, Dict[str, float]] = defaultdict(
    lambda: {"tokens": float(RATE_LIMIT_PER_MIN), "last_refill": time.time()}
)


def _check_rate_limit(client_id: str) -> bool:
    if RATE_LIMIT_PER_MIN <= 0:
        return True
    bucket = _rate_buckets[client_id]
    now = time.time()
    elapsed = now - bucket["last_refill"]
    refill = (elapsed / 60.0) * RATE_LIMIT_PER_MIN
    bucket["tokens"] = min(float(RATE_LIMIT_PER_MIN), bucket["tokens"] + refill)
    bucket["last_refill"] = now
    if bucket["tokens"] < 1.0:
        return False
    bucket["tokens"] -= 1.0
    return True


                                                                         

class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1)
    preferred_categories: List[str] = Field(default_factory=list)
    saved_place_ids: List[str] = Field(default_factory=list)


class ChatReply(BaseModel):
    reply: str


def _resolve(saved_ids: List[str], categories: List[str]):
    saved_places: List[Dict[str, Any]] = []
    for pid in saved_ids or []:
        hit = get_place_by_id(pid)
        if hit:
            saved_places.append(hit)
    context_places = places_for_categories(categories)
    return saved_places, context_places


                                                                          

class FlightInfo(BaseModel):
    flightNumber: str
    airline: str
    from_: str = Field(..., alias="from")
    to: str
    departure: str
    arrival: str
    status: str
    terminal: Any = None

    class Config:
        populate_by_name = True


class FlightReply(BaseModel):
    flights: List[FlightInfo]
    live: bool


                                                                          

def _require_auth(request: Request) -> None:
    if not BACKEND_SECRET:
        return
    auth = request.headers.get("authorization", "").strip()
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="missing bearer token")
    supplied = auth.split(" ", 1)[1].strip()
    if supplied != BACKEND_SECRET:
        raise HTTPException(status_code=401, detail="bad bearer token")


def _client_id(request: Request) -> str:
    host = request.client.host if request.client else "unknown"
    if not BACKEND_SECRET:
        return host
    raw = f"{host}|{request.headers.get('authorization', '')}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]
    return f"{host}|{digest}"


@app.get("/health")
def health() -> Dict[str, Any]:
    return {
        "ok": True,
        "places": len(PLACES),
        "categories": len(CATEGORIES),
        "aviationstack_configured": bool(AVIATIONSTACK_API_KEY),
        "auth_required": bool(BACKEND_SECRET),
        "rate_limit_per_min": RATE_LIMIT_PER_MIN,
    }


@app.post("/chat", response_model=ChatReply)
def chat(req: ChatRequest, request: Request) -> ChatReply:
    _require_auth(request)
    if not _check_rate_limit(_client_id(request)):
        raise HTTPException(status_code=429, detail="rate limit exceeded; slow down")

    saved_places, context_places = _resolve(req.saved_place_ids, req.preferred_categories)
    return ChatReply(reply=local_reply(req.question, context_places, saved_places))


@app.get("/flights", response_model=FlightReply)
def flights(
    request: Request,
    to: str = Query("DPS", min_length=3, max_length=4, description="IATA airport code, e.g. DPS"),
) -> FlightReply:
    _require_auth(request)
    if not _check_rate_limit(_client_id(request)):
        raise HTTPException(status_code=429, detail="rate limit exceeded; slow down")

    flights_list, used_live = flights_to(AVIATIONSTACK_API_KEY, to)
    return FlightReply(
        flights=[FlightInfo(**f) for f in flights_list],
        live=used_live,
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=PORT,
        reload=False,
    )
