from __future__ import annotations

import datetime as _dt
import hashlib
import json
import math
import os
import time as _time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

AVIATIONSTACK_URL = "https://api.aviationstack.com/v1/flights"
SERPAPI_URL = "https://serpapi.com/search"
AMADEUS_BASE = "https://test.api.amadeus.com"
AMADEUS_TOKEN_URL = AMADEUS_BASE + "/v1/security/oauth2/token"
AMADEUS_OFFERS_URL = AMADEUS_BASE + "/v2/shopping/flight-offers"
DEFAULT_TIMEOUT = float(os.environ.get("AMADEUS_TIMEOUT", os.environ.get("AVIATIONSTACK_TIMEOUT", "15")))

_amadeus_token_cache: Dict[str, Any] = {"token": None, "expires_at": 0.0}

_FLIGHT_CACHE_TTL_SECONDS = float(os.environ.get("FLIGHT_CACHE_TTL", "900"))
_flight_cache: Dict[str, Tuple[float, List[Dict[str, Any]]]] = {}

_AIRPORTS: Dict[str, Tuple[float, float]] = {
    "SIN": (1.3644, 103.9915),
    "KUL": (2.7456, 101.7099),
    "BKK": (13.6900, 100.7501),
    "DMK": (13.9126, 100.6068),
    "HKG": (22.3080, 113.9185),
    "MNL": (14.5086, 121.0196),
    "DPS": (-8.7482, 115.1673),
    "CGK": (-6.1256, 106.6559),
    "SUB": (-7.3798, 112.7869),
    "UPG": (-5.0616, 119.5540),
    "KNO": (3.6424, 98.8852),
    "JOG": (-7.7880, 110.4318),
    "BDJ": (-3.4423, 114.7625),
    "BPN": (-1.2684, 116.8943),
    "DJJ": (-2.5769, 140.5164),
    "KDI": (-4.0819, 122.4181),
    "LBJ": (-8.4857, 119.8894),
    "SOQ": (-0.8940, 131.2877),
    "PNH": (11.5466, 104.8441),
    "REP": (13.4107, 103.8130),
    "HAN": (21.2212, 105.8072),
    "SGN": (10.8188, 106.6520),
    "DAD": (16.0439, 108.1994),
    "CXR": (11.9981, 109.2194),
    "PQC": (10.1698, 103.9931),
    "VDH": (17.5150, 106.5906),
    "VTE": (18.0031, 102.6529),
    "RGN": (16.9073, 96.1331),
    "BWN": (4.9442, 114.9284),
    "NRT": (35.7720, 140.3929),
    "HND": (35.5494, 139.7798),
    "ICN": (37.4602, 126.4407),
    "PVG": (31.1443, 121.8083),
    "SHA": (31.1979, 121.3363),
    "PEK": (40.0799, 116.6031),
    "TPE": (25.0777, 121.2328),
    "DEL": (28.5562, 77.1000),
    "BOM": (19.0896, 72.8656),
    "DXB": (25.2532, 55.3657),
    "AUH": (24.4330, 54.6511),
    "DOH": (25.2731, 51.6081),
    "LHR": (51.4700, -0.4543),
    "LGW": (51.1537, -0.1821),
    "CDG": (49.0097, 2.5479),
    "AMS": (52.3105, 4.7683),
    "FRA": (50.0379, 8.5622),
    "MUC": (48.3538, 11.7861),
    "BER": (52.3667, 13.5033),
    "ZRH": (47.4647, 8.5492),
    "VIE": (48.1103, 16.5697),
    "IST": (41.2753, 28.7519),
    "MAD": (40.4983, -3.5676),
    "BCN": (41.2974, 2.0833),
    "FCO": (41.8003, 12.2389),
    "MXP": (45.6306, 8.7281),
    "CPH": (55.6180, 12.6508),
    "ARN": (59.6519, 17.9186),
    "HEL": (60.3183, 24.9497),
    "DUB": (53.4264, -6.2499),
    "LIS": (38.7742, -9.1342),
    "ATH": (37.9364, 23.9445),
    "WAW": (52.1657, 20.9671),
    "PRG": (50.1008, 14.2600),
    "BUD": (47.4298, 19.2611),
    "OSL": (60.1976, 11.1004),
    "JFK": (40.6413, -73.7781),
    "EWR": (40.6895, -74.1745),
    "LAX": (33.9416, -118.4085),
    "SFO": (37.6213, -122.3790),
    "ORD": (41.9742, -87.9073),
    "YYZ": (43.6777, -79.6248),
    "YVR": (49.1967, -123.1815),
    "SYD": (-33.9399, 151.1753),
    "MEL": (-37.6690, 144.8410),
    "PER": (-31.9403, 115.9673),
    "AKL": (-37.0082, 174.7850),
}

_AIRPORT_COUNTRY: Dict[str, str] = {
    "SIN": "SG",
    "KUL": "MY", "BKK": "TH", "DMK": "TH", "HKG": "HK", "MNL": "PH",
    "DPS": "ID", "CGK": "ID", "SUB": "ID", "UPG": "ID", "KNO": "ID",
    "JOG": "ID", "BDJ": "ID", "BPN": "ID", "DJJ": "ID", "KDI": "ID",
    "LBJ": "ID", "SOQ": "ID",
    "PNH": "KH", "REP": "KH",
    "HAN": "VN", "SGN": "VN", "DAD": "VN", "CXR": "VN", "PQC": "VN", "VDH": "VN",
    "VTE": "LA", "RGN": "MM", "BWN": "BN",
    "NRT": "JP", "HND": "JP", "ICN": "KR", "PVG": "CN", "SHA": "CN",
    "PEK": "CN", "TPE": "TW",
    "DEL": "IN", "BOM": "IN",
    "DXB": "AE", "AUH": "AE", "DOH": "QA",
    "LHR": "GB", "LGW": "GB", "CDG": "FR", "AMS": "NL", "FRA": "DE",
    "MUC": "DE", "BER": "DE", "ZRH": "CH", "VIE": "AT", "IST": "TR",
    "MAD": "ES", "BCN": "ES", "FCO": "IT", "MXP": "IT", "CPH": "DK",
    "ARN": "SE", "HEL": "FI", "DUB": "IE", "LIS": "PT", "ATH": "GR",
    "WAW": "PL", "PRG": "CZ", "BUD": "HU", "OSL": "NO",
    "JFK": "US", "EWR": "US", "LAX": "US", "SFO": "US", "ORD": "US",
    "YYZ": "CA", "YVR": "CA",
    "SYD": "AU", "MEL": "AU", "PER": "AU", "AKL": "NZ",
}

_CARRIER_NAMES: Dict[str, str] = {}

_COUNTRY_AIRLINES: Dict[str, List[Tuple[str, str]]] = {
    "SG": [("singapore airlines", "SQ"), ("scoot", "TR")],
    "MY": [("malaysia airlines", "MH"), ("airasia", "AK")],
    "TH": [("thai airways", "TG"), ("bangkok airways", "PG")],
    "HK": [("cathay pacific", "CX"), ("hk express", "UO")],
    "PH": [("philippine airlines", "PR"), ("cebu pacific", "5J")],
    "ID": [("garuda indonesia", "GA"), ("citilink", "QG"), ("lion air", "JT")],
    "KH": [("cambodia airways", "KR"), ("cambodia angkor air", "K6")],
    "VN": [("vietnam airlines", "VN"), ("vietjet air", "VJ"), ("bamboo airways", "QH")],
    "LA": [("lao airlines", "QV")],
    "MM": [("myanmar national", "UB")],
    "BN": [("royal brunei", "BI")],
    "JP": [("japan airlines", "JL"), ("ana", "NH")],
    "KR": [("korean air", "KE"), ("asiana airlines", "OZ")],
    "CN": [("china southern", "CZ"), ("china eastern", "MU"), ("air china", "CA")],
    "TW": [("eva air", "BR"), ("china airlines", "CI")],
    "IN": [("air india", "AI"), ("indigo", "6E")],
    "AE": [("emirates", "EK"), ("etihad airways", "EY")],
    "QA": [("qatar airways", "QR")],
    "GB": [("british airways", "BA"), ("virgin atlantic", "VS")],
    "FR": [("air france", "AF")],
    "NL": [("klm", "KL")],
    "DE": [("lufthansa", "LH"), ("eurowings", "EW")],
    "CH": [("swiss", "LX")],
    "AT": [("austrian airlines", "OS")],
    "TR": [("turkish airlines", "TK")],
    "ES": [("iberia", "IB"), ("vueling", "VY")],
    "IT": [("ita airways", "AZ")],
    "DK": [("scandinavian airlines", "SK")],
    "SE": [("scandinavian airlines", "SK")],
    "FI": [("finnair", "AY")],
    "IE": [("aer lingus", "EI")],
    "PT": [("tap air portugal", "TP")],
    "GR": [("aegean airlines", "A3")],
    "PL": [("lot polish", "LO")],
    "CZ": [("czech airlines", "OK")],
    "HU": [("wizz air", "W6")],
    "NO": [("norse atlantic", "N0")],
    "US": [("united", "UA"), ("american", "AA"), ("delta", "DL")],
    "CA": [("air canada", "AC")],
    "AU": [("qantas", "QF"), ("virgin australia", "VA")],
    "NZ": [("air new zealand", "NZ")],
}

for _airlines in _COUNTRY_AIRLINES.values():
    for _name, _code in _airlines:
        _CARRIER_NAMES[_code] = _name

for _code in [
    "SIN", "KUL", "BKK", "DMK", "HKG", "MNL", "DPS", "CGK", "SUB", "UPG",
    "KNO", "JOG", "BDJ", "BPN", "DJJ", "KDI", "LBJ", "SOQ", "PNH", "REP",
    "HAN", "SGN", "DAD", "CXR", "PQC", "VDH", "VTE", "RGN", "BWN",
]:
    assert _code in _AIRPORTS, f"missing coords for {_code}"


def _now_ms() -> float:
    return _time.time() * 1000.0


def _iso_from_ms(ms: float) -> str:
    return (
        _dt.datetime.fromtimestamp(ms / 1000.0, tz=_dt.timezone.utc)
        .isoformat()
        .replace("+00:00", "Z")
    )


def _haversine_km(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    lat1, lon1 = math.radians(a[0]), math.radians(a[1])
    lat2, lon2 = math.radians(b[0]), math.radians(b[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 6371.0 * 2 * math.asin(math.sqrt(h))


def _estimate_flight_minutes(origin: str, to: str) -> int:
    a = _AIRPORTS.get(origin)
    b = _AIRPORTS.get(to)
    if not a or not b:
        return 180
    km = _haversine_km(a, b)
    return max(40, int(km / 850.0 * 60) + 45)


def _airlines_for_route(origin: str, to: str) -> List[Tuple[str, str]]:
    oc = _AIRPORT_COUNTRY.get(origin)
    tc = _AIRPORT_COUNTRY.get(to)
    out: List[Tuple[str, str]] = []
    seen = set()

    def _add(cc: str) -> None:
        for name, code in _COUNTRY_AIRLINES.get(cc, []):
            if name not in seen:
                seen.add(name)
                out.append((name, code))

    if oc:
        _add(oc)
    if tc and tc != oc:
        _add(tc)
    for cc in ("SG", "MY", "TH", "VN", "ID", "AE", "QA", "TR"):
        if cc != oc and cc != tc:
            _add(cc)
    if not out:
        out = [("regional carrier", "XX")]
    return out[:4]


def _route_seed(origin: str, to: str) -> int:
    raw = hashlib.md5(f"{origin}-{to}".encode("utf-8")).hexdigest()
    return int(raw[:8], 16)


def synthetic_flights(to: str, origin: str, count: int = 6) -> List[Dict[str, Any]]:
    airlines = _airlines_for_route(origin, to)
    duration_min = _estimate_flight_minutes(origin, to)
    seed = _route_seed(origin, to)
    now = _now_ms()
    out: List[Dict[str, Any]] = []
    for i in range(count):
        meta = airlines[i % len(airlines)]
        flight_no = f"{meta[1]}{900 + ((seed + i * 7) % 90)}"
        dep = now + (i + 1) * 55_000 + i * 90_000 + (i % 3) * 18_000
        arr = dep + duration_min * 60_000
        statuses = ["scheduled", "on time", "boarding soon", "check-in open", "scheduled", "on time"]
        est_price = round(60 + (_estimate_flight_minutes(origin, to) * 1.35) + i * 17)
        out.append(
            {
                "flightNumber": flight_no,
                "airline": meta[0],
                "from": origin,
                "to": to,
                "departure": _iso_from_ms(dep),
                "arrival": _iso_from_ms(arr),
                "status": statuses[i % len(statuses)],
                "terminal": "T3" if i % 2 == 0 else "T2",
                "price": est_price,
                "currency": "USD",
            }
        )
    return out


def _leg_to_flight(
    seg: Dict[str, Any],
    fallback_from: str,
    fallback_to: str,
) -> Dict[str, Any]:
    dep = seg.get("departure_airport") or {}
    arr = seg.get("arrival_airport") or {}
    carrier = seg.get("airline") or "airline"
    flight_no = str(seg.get("flight_number") or "").strip().replace(" ", "")
    dep_time = str(dep.get("time") or "").replace(" ", "T") or _iso_from_ms(_now_ms())
    arr_time = str(arr.get("time") or "").replace(" ", "T") or _iso_from_ms(_now_ms())
    return {
        "flightNumber": flight_no or "—",
        "airline": carrier.lower(),
        "from": dep.get("id") or fallback_from,
        "to": arr.get("id") or fallback_to,
        "departure": dep_time,
        "arrival": arr_time,
        "status": "scheduled",
        "terminal": seg.get("terminal") or None,
    }


def serpapi_flights(
    api_key: str,
    to: str,
    origin: str,
    outbound_date: Optional[str] = None,
    return_date: Optional[str] = None,
) -> Optional[Dict[str, List[Dict[str, Any]]]]:
    """Google Flights via SerpAPI.

    Returns {"outbound": [...], "return": [...]} when live data is available,
    or None so callers can fall back. With a return date we request a round
    trip so going + back options can be shown together.
    """
    if not api_key:
        return None
    if not outbound_date:
        outbound_date = (_dt.date.today() + _dt.timedelta(days=1)).isoformat()
    rt = bool(return_date)
    key = f"SP:{origin.upper()}->{to.upper()}:{outbound_date}:{return_date or 'one'}:" + ("rt" if rt else "ow")
    now = _time.time()
    hit = _flight_cache.get(key)
    if hit and now < hit[0]:
        return hit[1]
    params: Dict[str, Any] = {
        "engine": "google_flights",
        "departure_id": origin,
        "arrival_id": to,
        "outbound_date": outbound_date,
        "currency": "USD",
        "hl": "en",
        # SerpAPI: type 1 = round trip (needs return_date), 2 = one-way.
        "type": "1" if rt else "2",
        "adults": "1",
        "api_key": api_key,
    }
    if rt:
        params["return_date"] = return_date
    try:
        req = urllib.request.Request(
            f"{SERPAPI_URL}?{urllib.parse.urlencode(params)}", headers={"Accept": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=DEFAULT_TIMEOUT) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError):
        return None
    if not isinstance(data, dict) or data.get("error"):
        return None
    itineraries = data.get("best_flights") or []
    itineraries = (itineraries + (data.get("other_flights") or []))[:8]
    if not itineraries:
        return None

    outbound: List[Dict[str, Any]] = []
    returns: List[Dict[str, Any]] = []
    for offer in itineraries:
        if not isinstance(offer, dict):
            continue
        price = offer.get("price")
        priced = {"price": round(float(price)) if isinstance(price, (int, float)) else None, "currency": "USD"}
        segs = offer.get("flights") or []
        if segs:
            first = segs[0]
            flight = _leg_to_flight(first, origin, to)
            flight.pop("price", None)
            outbound.append({**flight, **priced})
        if rt:
            ret_segs = offer.get("return_flights") or []
            if ret_segs:
                flight = _leg_to_flight(ret_segs[0], to, origin)
                flight.pop("price", None)
                returns.append({**flight, **priced})
    if not outbound and not returns:
        return None
    result = {"outbound": outbound, "return": returns}
    _flight_cache[key] = (now + _FLIGHT_CACHE_TTL_SECONDS, result)
    return result


def _amadeus_token(client_id: str, client_secret: str) -> Optional[str]:
    now = _time.time()
    if _amadeus_token_cache["token"] and now < _amadeus_token_cache["expires_at"]:
        return _amadeus_token_cache["token"]
    body = urllib.parse.urlencode(
        {"grant_type": "client_credentials", "client_id": client_id, "client_secret": client_secret}
    ).encode("utf-8")
    try:
        req = urllib.request.Request(
            AMADEUS_TOKEN_URL,
            data=body,
            headers={"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=DEFAULT_TIMEOUT) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError):
        return None
    token = data.get("access_token") if isinstance(data, dict) else None
    expires_in = float(data.get("expires_in", 1800)) if isinstance(data, dict) else 1800.0
    if token:
        _amadeus_token_cache["token"] = token
        _amadeus_token_cache["expires_at"] = now + expires_in - 60
    return token or None


def amadeus_flights(
    client_id: str,
    client_secret: str,
    to: str,
    origin: str,
    departure_date: Optional[str] = None,
) -> Optional[List[Dict[str, Any]]]:
    if not client_id or not client_secret:
        return None
    token = _amadeus_token(client_id, client_secret)
    if not token:
        return None
    if not departure_date:
        departure_date = (_dt.date.today() + _dt.timedelta(days=1)).isoformat()
    params = urllib.parse.urlencode(
        {
            "originLocationCode": origin,
            "destinationLocationCode": to,
            "departureDate": departure_date,
            "adults": "1",
            "max": "8",
            "currencyCode": "USD",
        }
    )
    try:
        req = urllib.request.Request(
            f"{AMADEUS_OFFERS_URL}?{params}",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=DEFAULT_TIMEOUT) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, json.JSONDecodeError):
        return None
    offers = data.get("data") if isinstance(data, dict) else None
    if not isinstance(offers, list) or not offers:
        return None
    out: List[Dict[str, Any]] = []
    for offer in offers[:8]:
        if not isinstance(offer, dict):
            continue
        itinerary = ((offer.get("itineraries") or [{}])[0]) or {}
        segments = itinerary.get("segments") or []
        if not segments:
            continue
        first = segments[0]
        last = segments[-1]
        dep = first.get("departure") or {}
        arr = last.get("arrival") or {}
        carrier = first.get("carrierCode") or ""
        price = offer.get("price") or {}
        total = price.get("total")
        out.append(
            {
                "flightNumber": f"{carrier}{first.get('number') or ''}",
                "airline": _CARRIER_NAMES.get(carrier, carrier or "airline"),
                "from": dep.get("iataCode") or origin,
                "to": arr.get("iataCode") or to,
                "departure": dep.get("at") or _iso_from_ms(_now_ms()),
                "arrival": arr.get("at") or _iso_from_ms(_now_ms()),
                "status": "scheduled",
                "terminal": dep.get("terminal") or None,
                "price": round(float(total)) if total else None,
                "currency": price.get("currency") or "USD",
            }
        )
    return out or None


def live_flights(api_key: str, to: str, origin: str) -> Optional[List[Dict[str, Any]]]:
    if not api_key:
        return None
    key = f"{origin.upper()}->{to.upper()}"
    now = _time.time()
    hit = _flight_cache.get(key)
    if hit and now < hit[0]:
        return hit[1]
    url = f"{AVIATIONSTACK_URL}?access_key={api_key}&dep_iata={origin}&arr_iata={to}&limit=8"
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
                "from": dep.get("iata") or origin,
                "to": arr.get("iata") or to,
                "departure": dep.get("scheduled") or fallback_iso,
                "arrival": arr.get("scheduled") or fallback_iso,
                "status": (f.get("flight_status") or "scheduled").lower(),
                "terminal": dep.get("terminal") or None,
            }
        )
    if out:
        _flight_cache[key] = (now + _FLIGHT_CACHE_TTL_SECONDS, out)
    return out or None


def _synthetic_on_date(
    to: str,
    origin: str,
    day_offset: int,
    count: int = 5,
) -> List[Dict[str, Any]]:
    """Deterministic schedule for a specific travel date (used as fallback)."""
    airlines = _airlines_for_route(origin, to)
    duration_min = _estimate_flight_minutes(origin, to)
    seed = _route_seed(origin, to)
    date = _dt.date.today() + _dt.timedelta(days=max(0, day_offset))
    start_ms = _dt.datetime(date.year, date.month, date.day, 6, 0, tzinfo=_dt.timezone.utc).timestamp() * 1000.0
    out: List[Dict[str, Any]] = []
    for i in range(count):
        meta = airlines[i % len(airlines)]
        flight_no = f"{meta[1]}{900 + ((seed + i * 7) % 90)}"
        dep = start_ms + i * 95 * 60_000 + (i % 2) * 40 * 60_000
        arr = dep + duration_min * 60_000
        statuses = ["scheduled", "on time", "boarding soon", "check-in open", "scheduled"]
        est_price = round(60 + duration_min * 1.35 + i * 15)
        out.append(
            {
                "flightNumber": flight_no,
                "airline": meta[0],
                "from": origin,
                "to": to,
                "departure": _iso_from_ms(dep),
                "arrival": _iso_from_ms(arr),
                "status": statuses[i % len(statuses)],
                "terminal": "T3" if i % 2 == 0 else "T2",
                "price": est_price,
                "currency": "USD",
            }
        )
    return out


def get_flights_to(
    api_key: str,
    to: str,
    origin: str = "SIN",
    amadeus_client_id: str = "",
    amadeus_client_secret: str = "",
    serpapi_key: str = "",
    outbound_date: Optional[str] = None,
    return_date: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], bool, bool, str, str]:
    """Return (outbound, returns, live, exact_dates, nearest_out, nearest_ret).

    Outbound = origin -> to on the travel date; return = to -> origin on the
    return date. Live providers are tried in order. When a live provider has no
    flights on the exact dates, the next two weeks are scanned and the closest
    dates that do have flights are returned with exact_dates=False, so the app
    can tell the traveller to check back for their exact dates. A deterministic
    schedule is the last-resort fallback.
    """
    code = (to or "DPS").upper().strip() or "DPS"
    orig = (origin or "SIN").upper().strip() or "SIN"
    if not outbound_date:
        outbound_date = (_dt.date.today() + _dt.timedelta(days=1)).isoformat()
    if return_date:
        outbound_date = outbound_date[0:10]
        return_date = return_date[0:10]

    # Two one-way SerpAPI (Google Flights) searches: going + back. Each leg is
    # searched on its own date so the app can group going/return cleanly.
    outbound: List[Dict[str, Any]] = []
    ret: List[Dict[str, Any]] = []
    if serpapi_key:
        ow = serpapi_flights(serpapi_key, code, orig, outbound_date, None)
        if ow and ow["outbound"]:
            outbound = ow["outbound"]
            if return_date:
                back = serpapi_flights(serpapi_key, orig, code, return_date, None)
                ret = (back or {}).get("outbound") or []
                if not ret:
                    # Return leg not published for the exact date yet — find the
                    # closest available return date.
                    try:
                        ret_base = _dt.date.fromisoformat(return_date)
                        if 0 <= (ret_base - _dt.date.today()).days <= 180:
                            for off2 in range(1, 8):
                                nr = (ret_base + _dt.timedelta(days=off2)).isoformat()
                                b2 = serpapi_flights(serpapi_key, orig, code, nr, None)
                                if b2 and b2["outbound"]:
                                    ret = b2["outbound"]
                                    return outbound, ret, True, False, outbound_date, nr
                    except ValueError:
                        pass
            return outbound, ret, True, True, outbound_date, return_date or ""

        # No flights on the exact dates yet (schedules may not be published).
        # Only scan when the travel date is within a sensible horizon.
        try:
            out_base = _dt.date.fromisoformat(outbound_date)
        except ValueError:
            out_base = _dt.date.today() + _dt.timedelta(days=1)
        days_ahead = (out_base - _dt.date.today()).days
        if 0 <= days_ahead <= 180:
            for offset in range(1, 8):
                near_out = (out_base + _dt.timedelta(days=offset)).isoformat()
                probe = serpapi_flights(serpapi_key, code, orig, near_out, None)
                if probe and probe["outbound"]:
                    near_ret = ""
                    if return_date:
                        try:
                            near_ret = (
                                _dt.date.fromisoformat(return_date) + _dt.timedelta(days=offset)
                            ).isoformat()
                            back = serpapi_flights(serpapi_key, orig, code, near_ret, None)
                            ret = (back or {}).get("outbound") or []
                        except ValueError:
                            pass
                    return probe["outbound"], ret, True, False, near_out, near_ret or return_date or ""

    amadeus_out = amadeus_flights(amadeus_client_id, amadeus_client_secret, code, orig, outbound_date)
    if amadeus_out:
        ret = []
        if return_date:
            ret = amadeus_flights(amadeus_client_id, amadeus_client_secret, orig, code, return_date) or []
        return amadeus_out, ret, True, True, outbound_date, return_date or ""

    # No live provider had anything for these dates — don't invent a schedule.
    # The app tells the traveller to check back closer to travel.
    return [], [], False, False, outbound_date, return_date or ""
