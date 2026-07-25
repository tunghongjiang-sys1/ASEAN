"""aviationstack proxy + synthetic fallback for SIN -> X flights.

mirrors the structure of back-end-original src/services/flights.ts but the
aviationstack api key is now server-side; the client just hits /flights?to=DPS.
"""
from __future__ import annotations

import datetime as _dt
import json
import os
import time as _time
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

SIN = "SIN"
AVIATIONSTACK_URL = "https://api.aviationstack.com/v1/flights"
DEFAULT_TIMEOUT = float(os.environ.get("AVIATIONSTACK_TIMEOUT", "15"))

_ROUTE_AIRLINES: Dict[str, List[Dict[str, Any]]] = {
    "DPS": [
        {"airline": "singapore airlines", "code": "SQ", "durationMin": 150},
        {"airline": "scoot", "code": "TR", "durationMin": 160},
        {"airline": "garuda indonesia", "code": "GA", "durationMin": 155},
    ],
    "CGK": [
        {"airline": "singapore airlines", "code": "SQ", "durationMin": 105},
        {"airline": "garuda indonesia", "code": "GA", "durationMin": 110},
        {"airline": "batik air", "code": "ID", "durationMin": 115},
    ],
    "SUB": [
        {"airline": "scoot", "code": "TR", "durationMin": 150},
        {"airline": "singapore airlines", "code": "SQ", "durationMin": 145},
    ],
    "UPG": [{"airline": "singapore airlines", "code": "SQ", "durationMin": 210}],
    "KNO": [
        {"airline": "scoot", "code": "TR", "durationMin": 90},
        {"airline": "singapore airlines", "code": "SQ", "durationMin": 85},
    ],
    "PNH": [
        {"airline": "singapore airlines", "code": "SQ", "durationMin": 125},
        {"airline": "scoot", "code": "TR", "durationMin": 130},
    ],
    "REP": [
        {"airline": "singapore airlines", "code": "SQ", "durationMin": 135},
        {"airline": "cambodia airways", "code": "KR", "durationMin": 140},
    ],
    "HAN": [
        {"airline": "singapore airlines", "code": "SQ", "durationMin": 210},
        {"airline": "vietnam airlines", "code": "VN", "durationMin": 215},
        {"airline": "scoot", "code": "TR", "durationMin": 220},
    ],
    "SGN": [
        {"airline": "singapore airlines", "code": "SQ", "durationMin": 125},
        {"airline": "vietnam airlines", "code": "VN", "durationMin": 130},
        {"airline": "scoot", "code": "TR", "durationMin": 135},
    ],
    "DAD": [
        {"airline": "scoot", "code": "TR", "durationMin": 165},
        {"airline": "vietnam airlines", "code": "VN", "durationMin": 170},
    ],
    "CXR": [{"airline": "scoot", "code": "TR", "durationMin": 150}],
    "PQC": [{"airline": "scoot", "code": "TR", "durationMin": 140}],
    "VDH": [{"airline": "vietnam airlines", "code": "VN", "durationMin": 200}],
    "LBJ": [{"airline": "garuda indonesia", "code": "GA", "durationMin": 240}],
    "SOQ": [{"airline": "garuda indonesia", "code": "GA", "durationMin": 360}],
}




def _now_ms() -> float:
    return _time.time() * 1000.0


def _iso_from_ms(ms: float) -> str:
    return (
        _dt.datetime.fromtimestamp(ms / 1000.0, tz=_dt.timezone.utc)
        .isoformat()
        .replace("+00:00", "Z")
    )


def synthetic_flights(to: str, count: int = 6) -> List[Dict[str, Any]]:
    routes = _ROUTE_AIRLINES.get(to) or [
        {"airline": "regional carrier", "code": "XX", "durationMin": 180}
    ]
    out: List[Dict[str, Any]] = []
    now = _now_ms()
    for i in range(count):
        meta = routes[i % len(routes)]
        dep = now + 45_000 * (i + 1) + i * 95_000 + (i % 3) * 20_000
        arr = dep + meta["durationMin"] * 60_000
        out.append(
            {
                "flightNumber": f"{meta['code']}{940 + i * 7 + (len(to) % 40)}",
                "airline": meta["airline"],
                "from": SIN,
                "to": to,
                "departure": _iso_from_ms(dep),
                "arrival": _iso_from_ms(arr),
                "status": "boarding soon" if i == 0 else ("on time" if i < 2 else "scheduled"),
                "terminal": "T3" if i % 2 == 0 else "T2",
            }
        )
    return out


def live_flights(api_key: str, to: str) -> Optional[List[Dict[str, Any]]]:
    if not api_key:
        return None
    url = f"{AVIATIONSTACK_URL}?access_key={api_key}&dep_iata={SIN}&arr_iata={to}&limit=8"
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=DEFAULT_TIMEOUT) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError):
        return None
    rows = data.get("data") if isinstance(data, dict) else None
    if not isinstance(rows, list) or not rows:
        return None
    fallback_iso = _iso_from_ms(_now_ms())
    out: List[Dict[str, Any]] = []
    for f in rows:
        if not isinstance(f, dict):
            continue
        dep = f.get("departure") or {}
        arr = f.get("arrival") or {}
        airline = f.get("airline") or {}
        flight = f.get("flight") or {}
        out.append(
            {
                "flightNumber": flight.get("iata") or flight.get("icao") or "—",
                "airline": (airline.get("name") or "airline").lower(),
                "from": dep.get("iata") or SIN,
                "to": arr.get("iata") or to,
                "departure": dep.get("scheduled") or fallback_iso,
                "arrival": arr.get("scheduled") or fallback_iso,
                "status": (f.get("flight_status") or "scheduled").lower(),
                "terminal": dep.get("terminal") or None,
            }
        )
    return out or None


def get_flights_to(api_key: str, to: str) -> Tuple[List[Dict[str, Any]], bool]:
    """returns (flights, used_live_data) so the caller can label the response."""
    code = (to or "DPS").upper().strip() or "DPS"
    live = live_flights(api_key, code)
    if live:
        return live, True
    return synthetic_flights(code), False
