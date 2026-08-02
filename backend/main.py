"""asean-travel python backend. local chat (database-derived) + flights proxy."""
from __future__ import annotations

import hashlib
import os
import time
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# load backend/.env (OPENROUTER_API_KEY, GOOGLE_PLACES_API_KEY, ...)
# explicit path so it works no matter which cwd the server is started from
load_dotenv(Path(__file__).resolve().parent / ".env")

from data_loader import PLACES, CATEGORIES, get_place_by_id, places_for_categories
from flights import get_flights_to as flights_to
from prompt import local_reply

import httpx

AVIATIONSTACK_API_KEY = os.environ.get("AVIATIONSTACK_API_KEY", "").strip()

# amadeus self-service (test env is free, ~2000 req/mo). set both id + secret in backend/.env
AMADEUS_CLIENT_ID = os.environ.get("AMADEUS_CLIENT_ID", "").strip()
AMADEUS_CLIENT_SECRET = os.environ.get("AMADEUS_CLIENT_SECRET", "").strip()

# set in backend/.env (or the deploy env). the key is never shipped to the client.
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "").strip()
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "openai/gpt-4o-mini").strip()
GOOGLE_PLACES_API_KEY = os.environ.get("GOOGLE_PLACES_API_KEY", "").strip()

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
    history: List[Dict[str, str]] = Field(default_factory=list)
    user_location: Dict[str, Any] = Field(default_factory=dict)
    traveller_profile: Dict[str, Any] = Field(default_factory=dict)


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
    price: float | None = None
    currency: str | None = None

    class Config:
        populate_by_name = True


class FlightReply(BaseModel):
    flights: List[FlightInfo]
    live: bool


class PlaceInfoReply(BaseModel):
    name: str = ""
    address: str = ""
    rating: float | None = None
    userRatingsTotal: int | None = None
    website: str | None = None
    mapsUrl: str | None = None
    photoUrl: str | None = None
    lat: float | None = None
    lng: float | None = None


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
        "amadeus_configured": bool(AMADEUS_CLIENT_ID and AMADEUS_CLIENT_SECRET),
        "openrouter_configured": bool(OPENROUTER_API_KEY),
        "google_places_configured": bool(GOOGLE_PLACES_API_KEY),
        "auth_required": bool(BACKEND_SECRET),
        "rate_limit_per_min": RATE_LIMIT_PER_MIN,
    }


@app.post("/chat", response_model=ChatReply)
async def chat(req: ChatRequest, request: Request) -> ChatReply:
    _require_auth(request)
    if not _check_rate_limit(_client_id(request)):
        raise HTTPException(status_code=429, detail="rate limit exceeded; slow down")

    saved_places, context_places = _resolve(req.saved_place_ids, req.preferred_categories)

    # Try OpenRouter if configured, fall back to local reply
    if OPENROUTER_API_KEY:
        try:
            loc = req.user_location or {}
            profile = req.traveller_profile or {}
            origin_city = loc.get("label") or loc.get("city") or "your home city"
            origin_airport = loc.get("airport") or "your local airport"
            profile_bits = []
            if profile.get("mode") == "group":
                profile_bits.append(f"travelling in a group of {profile.get('groupSize') or '?'}")
            elif profile.get("mode") == "solo":
                profile_bits.append("travelling solo")
            if profile.get("placeTypes"):
                profile_bits.append(f"interested in: {', '.join(profile['placeTypes'][:5])}")
            if profile.get("transportPreference"):
                profile_bits.append(f"prefers {profile['transportPreference']} transport")
            if profile.get("foodAllergies"):
                profile_bits.append(f"food restrictions: {profile['foodAllergies']}")
            if profile.get("hasElderly"):
                profile_bits.append("travelling with elderly companions")
            if profile.get("hasChildren"):
                profile_bits.append("travelling with children")
            profile_text = "; ".join(profile_bits) or "no specific profile set"

            system_prompt = (
                "You are ASEANfinder, a travel assistant for Southeast Asia. "
                "You have access to a database of places across Indonesia, Cambodia, and Vietnam. "
                "Recommend attractions, hidden gems, local food, festivals, and activities. "
                "Be concise, helpful, and enthusiastic. "
                "Always personalize for the traveller: they are starting from "
                f"{origin_city} (nearest airport {origin_airport}), and their profile is: {profile_text}. "
                "When suggesting flights, always use the traveller's actual starting airport "
                f"(e.g. {origin_airport} -> destination) — never assume Singapore unless they are starting there. "
                "When relevant, mention seasonal festivals and local food to try."
            )
            place_context = "\n".join(
                f"- {p.get('location')} ({p.get('country')}): {p.get('category', '')}, "
                f"{p.get('primaryActivities', '')}. Airport: {p.get('airport', '?')}. "
                f"Food: {p.get('food', 'N/A')}. Getting there: {p.get('howToGetThere', 'N/A')}."
                for p in context_places[:14]
            )
            full_system = f"{system_prompt}\n\nAvailable places (use these for recommendations):\n{place_context}"

            messages: List[Dict[str, str]] = [{"role": "system", "content": full_system}]
            # send the last ~8 turns of conversation so the model remembers context
            for m in (req.history or [])[-8:]:
                role = m.get("role")
                content = m.get("content")
                if role in ("user", "assistant") and content:
                    messages.append({"role": role, "content": content})
            messages.append({"role": "user", "content": req.question})

            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": OPENROUTER_MODEL,
                        "messages": messages,
                        "max_tokens": 500,
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return ChatReply(reply=data["choices"][0]["message"]["content"])
        except Exception:
            pass

    origin_airport = ((req.user_location or {}).get("airport") or "SIN").upper()
    return ChatReply(reply=local_reply(req.question, context_places, saved_places, origin_airport))


@app.get("/place-info", response_model=PlaceInfoReply)
async def place_info(query: str = Query(..., min_length=1, description="place name to look up")) -> PlaceInfoReply:
    """google places text search -> name, rating, website + google maps link."""
    if not GOOGLE_PLACES_API_KEY:
        return PlaceInfoReply(name=query)
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(
                "https://maps.googleapis.com/maps/api/place/textsearch/json",
                params={"query": query, "key": GOOGLE_PLACES_API_KEY},
            )
            if resp.status_code != 200:
                return PlaceInfoReply(name=query)
            data = resp.json()
            results = data.get("results") or []
            if not results:
                return PlaceInfoReply(name=query)
            top = results[0]
            place_id = top.get("place_id") or ""
            website = None
            maps_url = None
            if place_id:
                dresp = await client.get(
                    "https://maps.googleapis.com/maps/api/place/details/json",
                    params={"place_id": place_id, "fields": "website,url", "key": GOOGLE_PLACES_API_KEY},
                )
                if dresp.status_code == 200:
                    result = dresp.json().get("result") or {}
                    website = result.get("website") or None
                    maps_url = result.get("url") or None
            geo = top.get("geometry", {}).get("location", {}) or {}
            photos = top.get("photos") or []
            photo_ref = photos[0].get("photo_reference") if photos else None
            photo_url = None
            if photo_ref:
                photo_url = (
                    "https://maps.googleapis.com/maps/api/place/photo?"
                    f"maxwidth=800&photoreference={photo_ref}&key={GOOGLE_PLACES_API_KEY}"
                )
            return PlaceInfoReply(
                name=top.get("name") or query,
                address=top.get("formatted_address") or "",
                rating=top.get("rating"),
                userRatingsTotal=top.get("user_ratings_total"),
                website=website,
                mapsUrl=maps_url or top.get("url"),
                photoUrl=photo_url,
                lat=geo.get("lat"),
                lng=geo.get("lng"),
            )
    except Exception:
        return PlaceInfoReply(name=query)


@app.get("/flights", response_model=FlightReply)
def flights(
    request: Request,
    to: str = Query("DPS", min_length=3, max_length=4, description="IATA airport code, e.g. DPS"),
    origin: str = Query("SIN", alias="from", min_length=3, max_length=4, description="origin IATA airport code, e.g. SIN"),
) -> FlightReply:
    _require_auth(request)
    if not _check_rate_limit(_client_id(request)):
        raise HTTPException(status_code=429, detail="rate limit exceeded; slow down")

    flights_list, used_live = flights_to(
        AVIATIONSTACK_API_KEY, to, origin, AMADEUS_CLIENT_ID, AMADEUS_CLIENT_SECRET
    )
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
