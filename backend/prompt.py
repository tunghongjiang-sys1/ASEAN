"""local database-derived chat reply helper.

no external ai. pulls rows from the loaded data and shapes a deterministic
reply string from the user's question + saved places + preferred categories.
Includes seasonal festivals and personalized recommendations.
"""
import re
from typing import Any, Dict, List

# country-level emergency numbers used as a fallback when a place has none
COUNTRY_EMERGENCY = {
    "Indonesia": (
        "Medical Emergency / Ambulance: 119 · Police: 110 · Fire & Rescue: 113 · "
        "Search & Rescue (BASARNAS): 115 · Disaster Emergency (BNPB): 117 · Tourist Police: 110"
    ),
    "Cambodia": (
        "Police: 117 · Fire: 118 · Ambulance: 119 · "
        "Tourist Police (English): 077 788 603 · Country Code: +855"
    ),
    "Vietnam": (
        "Police: 113 · Fire: 114 · Ambulance: 115 · Search & Rescue: 112 · Country Code: +84"
    ),
}


FESTIVALS = [
    {"name": "Nyepi (Balinese New Year)", "country": "Indonesia", "month": 3, "description": "Day of silence across Bali — no lights, no travel, just quiet reflection.", "location": "Bali"},
    {"name": "Galungan & Kuningan", "country": "Indonesia", "month": 5, "description": "Balinese Hindu festival celebrating good over evil with decorated bamboo poles.", "location": "Bali"},
    {"name": "Waisak / Vesak", "country": "Indonesia", "month": 5, "description": "Buddhist celebration at Borobudur — lantern release and chanting.", "location": "Borobudur, Central Java"},
    {"name": "Jakarta Fair", "country": "Indonesia", "month": 6, "description": "Month-long expo with music, food, and shopping in the capital.", "location": "Jakarta"},
    {"name": "Cambodian Water Festival (Bon Om Touk)", "country": "Cambodia", "month": 11, "description": "Dragon boat races on the Tonlé Sap River during the full moon.", "location": "Phnom Penh"},
    {"name": "Pchum Ben (Ancestors' Day)", "country": "Cambodia", "month": 9, "description": "15-day religious festival honoring ancestors with temple visits.", "location": "Throughout Cambodia"},
    {"name": "Angkor Sankranta", "country": "Cambodia", "month": 4, "description": "Khmer New Year celebration with traditional games at Angkor Wat.", "location": "Siem Reap"},
    {"name": "Tet Nguyen Dan (Lunar New Year)", "country": "Vietnam", "month": 1, "description": "Vietnam's most important holiday — fireworks, family reunions, and temple visits.", "location": "Throughout Vietnam"},
    {"name": "Hue Festival", "country": "Vietnam", "month": 4, "description": "Biennial cultural festival with imperial ceremonies, art, and music in the former capital.", "location": "Hue"},
    {"name": "Mid-Autumn Festival (Tet Trung Thu)", "country": "Vietnam", "month": 9, "description": "Lantern processions, mooncakes, and lion dances — especially magical in Hoi An.", "location": "Throughout Vietnam, especially Hoi An"},
    {"name": "Perfume Pagoda Festival", "country": "Vietnam", "month": 2, "description": "Pilgrimage to the Perfume Pagoda near Hanoi, a sacred Buddhist site.", "location": "Hanoi"},
]


def _get_festivals_for_query(q: str) -> str:
    """Return festival information matching the query"""
    q_lower = q.lower()
    matches = []
    for f in FESTIVALS:
        if f["country"].lower() in q_lower or f["name"].lower() in q_lower or f["location"].lower() in q_lower:
            matches.append(f)
    if not matches:
        # Return festivals for current month-equivalent if asking generally
        if any(w in q_lower for w in ["festival", "festivals", "event", "events", "celebration"]):
            matches = FESTIVALS[:3]
    if not matches:
        return ""

    lines = ["\n🎉 seasonal festivals & events:"]
    for f in matches:
        month_name = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][f["month"]]
        lines.append(f"• {f['name']} ({month_name}) — {f['location']}, {f['country']}")
        lines.append(f"  {f['description']}")
    return "\n".join(lines)


def _get_hidden_gems(places, q: str) -> str:
    """Recommend lesser-known places matching the query"""
    q_lower = q.lower()
    if not any(w in q_lower for w in ["hidden gem", "hidden gems", "off the beaten", "less known", "secret"]):
        return ""

    # Pick 3 places that are less common (not Bali, Angkor, HaLong)
    popular_ids = {"indonesia-bali", "cambodia-angkorwat", "vietnam-halongbay"}
    hidden = [p for p in places if p.get("id") not in popular_ids][:3]
    if not hidden:
        return ""

    lines = ["\n💎 hidden gems you might like:"]
    for p in hidden:
        lines.append(f"• {p.get('location')} ({p.get('country')}) — {p.get('primaryActivities', 'a unique destination')}")
    return "\n".join(lines)


def local_reply(
    question: str,
    places: List[Dict[str, Any]],
    notes: List[Dict[str, Any]],
    origin_airport: str = "SIN",
) -> str:
    q = (question or "").lower()
    origin = (origin_airport or "SIN").upper().strip() or "SIN"
    hit = None
    for p in places or []:
        loc = (p.get("location") or "").lower()
        country = (p.get("country") or "").lower()
        category = (p.get("category") or "").lower()
        if loc and loc in q:
            hit = p
            break
        if country and country in q:
            hit = p
            break
        if category and category in q:
            hit = p
            break

    if "festival" in q or "event" in q or "celebration" in q:
        festival_text = _get_festivals_for_query(q)
        if festival_text:
            return festival_text

    if "itinerary" in q or "plan" in q:
        picks = (notes or places or [])[:3]
        lines = [
            f"{i + 1}) {p.get('location', '?')} ({p.get('country', '?')}) - "
            f"{p.get('primaryActivities', '?')}. fly {origin} -> {p.get('airport', '?')}."
            for i, p in enumerate(picks)
        ]
        festival_text = _get_festivals_for_query(q)
        hidden_text = _get_hidden_gems(places, q)
        return "\n".join(
            [
                "here is a simple plan from your database:",
                *lines,
                "",
                festival_text,
                hidden_text,
                "",
                "tap one of the suggestions above or ask about a specific place, country, or category for more detail.",
            ]
        ).strip()

    if hit:
        how_to = re.sub(r"\bSIN\b", origin, hit.get("howToGetThere") or "")
        lines = [
            f"{hit.get('location')} is a {hit.get('category', '').lower()} "
            f"stop in {hit.get('country')}.",
            f"1) activities: {hit.get('primaryActivities')}.",
            f"2) getting there: {how_to}.",
            f"3) visa: {hit.get('visaEntry')}.",
            f"4) etiquette: {hit.get('cultureEtiquette')}.",
        ]
        if hit.get("food"):
            lines.append(f"5) local food to try: {hit.get('food')}.")
        if hit.get("costPerDay"):
            lines.append(f"6) cost per day: {hit.get('costPerDay')}.")
        if hit.get("openingHours"):
            lines.append(f"7) opening hours: {hit.get('openingHours')}.")
        emerg = hit.get("emergencyNumbers") or COUNTRY_EMERGENCY.get(hit.get("country", ""))
        if emerg:
            lines.append(f"8) emergency numbers: {emerg}.")
        return "\n".join(lines)

    return "\n".join(
        [
            "i can help using the indonesia, cambodia, and vietnam place database.",
            "1) ask about a place, country, or category.",
            "2) ask for an itinerary (e.g. 3 days in bali).",
            "3) ask about visa, dress code, or payment.",
        ]
    )
