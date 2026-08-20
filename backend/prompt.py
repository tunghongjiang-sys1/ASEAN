import re
import time
from typing import Any, Dict, List

# --------------------------------------------------------------------------
# Food-allergy matching (mirrors src/utils/allergies.ts on the client). A
# dish is "unsafe" when the traveller's allergy text mentions a food family
# and the dish contains a member of it, or when a typed ingredient appears
# directly in the dish name.
# --------------------------------------------------------------------------
_ALLERGEN_PATTERNS = [
    re.compile(r"\b(seafood|shellfish|shrimp|prawn|crab|lobster|squid|calamari|oyster|clam|mussel|scallop|crayfish|crustacean|siomay)\b|\b(cha muc|bun cua)\b", re.I),
    re.compile(r"\b(fish|seafood|ikan|amok|tuna|cakalang|eel|snakehead|urchin)\b|\b(sate tuna|goi ca|ca mai|bun mam|gohu ikan|patin bakar)\b", re.I),
    re.compile(r"\b(nut|nuts|peanut|peanuts|cashew|almond|walnut|pecan|pistachio|hazelnut|macadamia|sesame|seed|seeds)\b", re.I),
    re.compile(r"\b(wheat|bread|noodle|noodles|gluten|dumpling|dumplings|pastry|roti|crepe|pancake|bakpia|flour)\b|\bbanh mi\b", re.I),
    re.compile(r"\b(soy|soya|tofu|tempeh|kecap|tauco)\b", re.I),
    re.compile(r"\b(garlic|onion|onions|shallot|shallots|leek|chive|chives|scallion|scallions|bawang)\b", re.I),
    re.compile(r"\b(spicy|chilli|chili|chillies|chilies|sambal|pedas)\b", re.I),
    re.compile(r"\b(dairy|milk|cheese|butter|cream|yogurt|yoghurt)\b", re.I),
    re.compile(r"\b(egg|eggs)\b", re.I),
]

_ALIAS_GROUPS = [
    (("pork", "babi"), re.compile(r"\b(pork|babi)\b", re.I)),
    (("chicken", "ayam", "bebek", "duck"), re.compile(r"\b(chicken|ayam|bebek|duck)\b", re.I)),
    (("beef", "sapi", "daging", "lok lak", "rawon", "konro"), re.compile(r"\b(beef|sapi|daging|lok lak|rawon|konro)\b", re.I)),
    (("goat", "mutton", "lamb", "kambing"), re.compile(r"\b(goat|mutton|lamb|kambing)\b", re.I)),
]

_ALLERGY_STOPWORDS = {
    "and", "or", "the", "for", "with", "but", "not", "any", "all", "has",
    "have", "food", "foods", "allergy", "allergies", "allergic", "to", "of",
    "in", "on", "no", "from", "i", "am", "can", "cannot", "intolerant",
    "sensitivity", "sensitive", "restriction", "restrictions", "avoid",
}


def _allergy_tokens(raw: str):
    for t in re.split(r"[^a-z0-9]+", raw):
        if len(t) >= 3 and t not in _ALLERGY_STOPWORDS:
            yield t


def food_unsafe_for_allergies(food: str | None, allergies: str | None) -> bool:
    """True when a place's signature dish conflicts with the traveller's allergies."""
    dish = (food or "").lower()
    if not dish:
        return False
    raw = (allergies or "").lower()
    if not raw.strip():
        return False
    for pat in _ALLERGEN_PATTERNS:
        if pat.search(raw) and pat.search(dish):
            return True
    for keys, pat in _ALIAS_GROUPS:
        if any(re.search(r"\b" + re.escape(k) + r"\b", raw) for k in keys) and pat.search(dish):
            return True
    for t in _allergy_tokens(raw):
        if t in dish:
            return True
    return False


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

_URLCASE_RE = re.compile(r"https?://[^\s]+", re.I)
_EMAILLCASE_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
_ISODATECASE_RE = re.compile(r"\d{4}-\d{2}-\d{2}([T ][0-9:]+(Z|[+-]\d{2}:?\d{2})?)?")
_WORD_RE = re.compile(r"[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*")
_ALLCAPS_RE = re.compile(r"^[A-Z0-9]['’A-Z0-9]*$")


def _cap_word(w: str) -> str:
    if not w:
        return w
    if w.isdigit():
        return w
    # Keep tokens that are already all-uppercase (SIN, KHR, US, etc.).
    if len(w) > 1 and _ALLCAPS_RE.match(w):
        return w
    return w[0].upper() + w[1:].lower()


def title_case(text: str) -> str:
    """Capitalize the first letter of every word; leave URLs, emails, ISO dates
    and all-caps tokens untouched."""
    if not text:
        return text
    protected: List[str] = []

    def mask(m: "re.Match[str]") -> str:
        protected.append(m.group(0))
        return f"\u0000{len(protected) - 1}\u0000"

    masked = _URLCASE_RE.sub(mask, text)
    masked = _EMAILLCASE_RE.sub(mask, masked)
    masked = _ISODATECASE_RE.sub(mask, masked)

    def cap(m: "re.Match[str]") -> str:
        return _cap_word(m.group(0))

    cased = _WORD_RE.sub(cap, masked)
    return re.sub(r"\u0000(\d+)\u0000", lambda m: protected[int(m.group(1))], cased)


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
    q_lower = q.lower()
    matches = []
    for f in FESTIVALS:
        if f["country"].lower() in q_lower or f["name"].lower() in q_lower or f["location"].lower() in q_lower:
            matches.append(f)
    if not matches:
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


# --------------------------------------------------------------------------
# Currency helpers (static FX rates, units per 1 USD) mirroring the mobile
# client (src/services/currency.ts) so cost-per-day can be shown in the
# traveller's home currency with the destination currency in brackets.
# --------------------------------------------------------------------------
_FX_RATES: Dict[str, float] = {
    "USD": 1.0, "SGD": 1.31, "EUR": 0.92, "GBP": 0.79, "AUD": 1.52,
    "NZD": 1.64, "CAD": 1.36, "CHF": 0.86, "JPY": 148.0, "KRW": 1360.0,
    "CNY": 7.15, "TWD": 31.5, "HKD": 7.8, "INR": 83.5, "MYR": 4.25,
    "THB": 33.5, "PHP": 56.0, "IDR": 16000.0, "VND": 25200.0, "KHR": 4100.0,
    "AED": 3.67, "SAR": 3.75, "QAR": 3.64, "BRL": 5.1,
}
_CURRENCY_SYMBOLS: Dict[str, str] = {
    "USD": "US$", "SGD": "S$", "EUR": "€", "GBP": "£", "AUD": "A$",
    "NZD": "NZ$", "CAD": "C$", "CHF": "CHF", "JPY": "¥", "KRW": "₩",
    "CNY": "¥", "TWD": "NT$", "HKD": "HK$", "INR": "₹", "MYR": "RM",
    "THB": "฿", "PHP": "₱", "IDR": "Rp", "VND": "₫", "KHR": "៛",
    "AED": "AED", "SAR": "SAR", "QAR": "QAR", "BRL": "R$",
}
_NO_DECIMAL_CODES = {"IDR", "VND", "KHR", "JPY", "KRW"}
_COUNTRY_CURRENCY: Dict[str, str] = {
    "singapore": "SGD", "united states": "USD", "usa": "USD", "america": "USD",
    "united kingdom": "GBP", "britain": "GBP", "england": "GBP", "uk": "GBP",
    "europe": "EUR", "united arab emirates": "AED", "uae": "AED",
    "australia": "AUD", "new zealand": "NZD", "canada": "CAD",
    "switzerland": "CHF", "china": "CNY", "hong kong": "HKD", "taiwan": "TWD",
    "japan": "JPY", "south korea": "KRW", "india": "INR", "indonesia": "IDR",
    "vietnam": "VND", "cambodia": "KHR", "malaysia": "MYR", "thailand": "THB",
    "philippines": "PHP", "france": "EUR", "germany": "EUR", "italy": "EUR",
    "spain": "EUR", "portugal": "EUR", "netherlands": "EUR", "belgium": "EUR",
    "austria": "EUR", "ireland": "EUR", "greece": "EUR", "finland": "EUR",
    "saudi arabia": "SAR", "qatar": "QAR", "brazil": "BRL",
}


def _currency_for_country(country: str) -> str:
    c = (country or "").lower()
    for key, code in _COUNTRY_CURRENCY.items():
        if c and key in c:
            return code
    return ""


def _convert_amount(amount: float, from_code: str, to_code: str) -> float:
    src = from_code if from_code in _FX_RATES else "USD"
    dst = to_code if to_code in _FX_RATES else "USD"
    return amount / _FX_RATES[src] * _FX_RATES[dst]


def _fmt_number(n: float, code: str) -> str:
    if not _FX_RATES.get(code):
        code = "USD"
    if code in _NO_DECIMAL_CODES:
        return f"{round(n):,}"
    if n >= 10:
        return f"{round(n):,}"
    return f"{n:.1f}"


def _fmt_range(low: float, high: float, code: str) -> str:
    a = _fmt_number(low, code)
    b = _fmt_number(high, code)
    return a if a == b else f"{a}-{b}"


def _parse_cost_per_day(cost_per_day: str | None) -> tuple[str, float, float] | None:
    """Return (source currency code, low, high) parsed from a costPerDay string."""
    text = (cost_per_day or "").strip()
    if not text:
        return None
    nums = [float(s.replace(",", "")) for s in re.findall(r"\d[\d.,]*", text)]
    if not nums:
        return None
    low = min(nums[0], nums[1] if len(nums) > 1 else nums[0])
    high = max(nums[0], nums[1] if len(nums) > 1 else nums[0])
    currency = "USD"
    if re.search(r"rp\s*\d|idr", text, re.I):
        currency = "IDR"
    elif re.search(r"vnd|₫", text, re.I):
        currency = "VND"
    elif re.search(r"khr|៛", text, re.I):
        currency = "KHR"
    return currency, low, high


def format_cost_per_day(
    cost_per_day: str | None,
    destination_country: str | None,
    user_country: str | None,
) -> str:
    """Render cost per day as: <user's currency> (<destination currency>)."""
    parsed = _parse_cost_per_day(cost_per_day)
    if not parsed:
        return ""
    src_code, low, high = parsed
    dest_code = _currency_for_country(destination_country or "") or src_code
    user_code = _currency_for_country(user_country or "") or "USD"
    if user_code not in _FX_RATES:
        user_code = "USD"

    user_low = _convert_amount(low, src_code, user_code)
    user_high = _convert_amount(high, src_code, user_code)
    main = f"{_CURRENCY_SYMBOLS.get(user_code, user_code)}{_fmt_range(user_low, user_high, user_code)}"
    if user_code == dest_code:
        return main
    local_low = _convert_amount(low, src_code, dest_code)
    local_high = _convert_amount(high, src_code, dest_code)
    local = f"{_CURRENCY_SYMBOLS.get(dest_code, dest_code)}{_fmt_range(local_low, local_high, dest_code)}"
    return f"{main} ({local})"


def _get_hidden_gems(places, q: str) -> str:
    q_lower = q.lower()
    if not any(w in q_lower for w in ["hidden gem", "hidden gems", "off the beaten", "less known", "secret"]):
        return ""

    popular_ids = {"indonesia-bali", "cambodia-angkorwat", "vietnam-halongbay"}
    hidden = [p for p in places if p.get("id") not in popular_ids][:3]
    if not hidden:
        return ""

    lines = ["\n💎 hidden gems you might like:"]
    for p in hidden:
        lines.append(f"• {p.get('location')} ({p.get('country')}) — {p.get('primaryActivities', 'a unique destination')}")
    return "\n".join(lines)


# Region aliases so "plan a 5 day bali trip" expands to the full Bali area
# (Ubud, Tanah Lot, Kelingking, etc.) from the database.
_REGION_ALIASES: Dict[str, List[str]] = {
    "bali": [
        "bali", "ubud", "tanah lot", "kelingking", "nusa penida", "tegalalang",
        "monkey forest", "batur", "gunung kawi", "penglipuran", "tenganan",
        "sukarara", "seminyak", "canggu", "uluwatu", "gili trawangan", "gili air", "gili meno",
    ],
    "siem reap": [
        "siem reap", "angkor", "banteay", "roluos", "tonle sap", "tonlé sap",
        "kompong", "sangkae", "battambang", "phnom sampeou",
    ],
    "phnom penh": [
        "phnom penh", "koh rong", "koh tang", "cardamom", "kampot", "sihanoukville", "prey lang",
    ],
    "hanoi": [
        "hanoi", "ha long", "halong", "ninh binh", "van long", "sapa", "fansipan",
        "ha giang", "tam coc", "mai chau",
    ],
    "ho chi minh": [
        "ho chi minh", "saigon", "mekong", "can tho", "tram chim", "vung tau", "cu chi",
    ],
    "da nang": [
        "da nang", "hoi an", "hue", "bach ma", "cu lao cham", "my son", "son tra",
    ],
    "nha trang": [
        "nha trang", "hon mun", "van phong", "cam ranh", "doc let",
    ],
    "phu quoc": [
        "phu quoc", "con dao", "duong dong",
    ],
    "yogyakarta": [
        "yogyakarta", "borobudur", "prambanan", "dieng", "kaliurang", "merapi", "kotagede", "taman sari",
    ],
    "jakarta": [
        "jakarta", "kota tua", "taman safari", "ujung kulon", "bogor", "puncak", "kepulauan seribu",
    ],
    "komodo": [
        "komodo", "labuan bajo", "rinca", "kelimutu", "flores", "wae rebo", "bajawa", "riung", "maros",
    ],
    "raja ampat": [
        "raja ampat", "wayag", "misool", "waigeo", "sorong", "kri", "piaynemo",
    ],
    "lombok": [
        "lombok", "gili trawangan", "gili air", "gili meno", "senggigi", "rinjani", "kuta lombok",
    ],
    "medan": [
        "medan", "lake toba", "samosir", "gunung leuser", "bukit lawang", "berastagi", "tangkahan",
    ],
    "surabaya": [
        "surabaya", "bromo", "semeru", "tumpak sewu", "ijen", "malang", "batu",
    ],
    "battambang": [
        "battambang", "sangkae", "wat banan", "phnom sampeou", "kamping puoy", "prek toal",
    ],
}

_PLAN_RE = re.compile(r"(\d+)\s*(?:-|–|to)?\s*(day|night)s?\b", re.I)
_WEEK_RE = re.compile(r"\bweek\b", re.I)
_HALF_DAY_RE = re.compile(r"\b(half|1)\s*day\b", re.I)

# Varied, friendly openers so no two replies feel the same.
_PLAN_OPENERS = [
    "nice choice! here's a {days}-day plan for {region}:",
    "great pick — here's a {days}-day itinerary for {region}:",
    "love it! here's a {days}-day route through {region}:",
    "fantastic! here's a {days}-day plan to make the most of {region}:",
    "awesome choice! here's a {days}-day plan for {region}:",
    "perfect — here's a {days}-day plan for {region}:",
    "sounds fun! here's a {days}-day plan around {region}:",
    "exciting! here's a {days}-day plan for {region}:",
]

_PLAN_ENDINGS = [
    "want more detail? ask about any place above (visa, dress code, how to get there).",
    "want me to go deeper on any of these? just ask about a place (visa, food, how to get there).",
    "need more? ask about any of these places for the full rundown.",
    "want adjustments — shorter days, more food stops, fewer temple hops? just ask.",
]


def _pick_variation(options: List[str], q: str) -> str:
    seed = (hash(q) ^ int(time.time() // (30 * 60))) % len(options)
    return options[seed]


def _extract_days(q: str) -> int:
    m = _PLAN_RE.search(q)
    if m:
        try:
            return max(1, min(int(m.group(1)), 21))
        except ValueError:
            return 0
    if _WEEK_RE.search(q):
        return 7
    if _HALF_DAY_RE.search(q):
        return 1
    return 0


def _plan_picks(q: str, places: List[Dict[str, Any]], notes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Choose places from the database for a trip plan matching the question."""
    ql = q.lower()

    countries = [c for c in ("indonesia", "cambodia", "vietnam") if c in ql]
    if countries:
        return [p for p in places if (p.get("country") or "").lower() in countries]

    for region, keywords in _REGION_ALIASES.items():
        if region in ql or any(k in ql for k in keywords):
            wanted = {k for k in keywords if len(k) > 2}
            hits = [
                p
                for p in places
                if any(
                    (p.get("location") or "").lower() == w or (p.get("location") or "").lower().startswith(w + " ")
                    for w in wanted
                )
            ]
            if hits:
                # exact query-token matches first (e.g. "bali" itself), then the rest
                def _rank(p):
                    loc = (p.get("location") or "").lower()
                    if loc in ql or ql.startswith(loc):
                        return 0
                    return 1

                return sorted(hits, key=_rank)

    loc_hits = [p for p in places if (p.get("location") or "") and (p.get("location") or "").lower() in ql]
    if loc_hits:
        return loc_hits

    cat_hits = [p for p in places if (p.get("category") or "") and (p.get("category") or "").lower() in ql]
    if cat_hits:
        return cat_hits

    return notes or places[:12]


def _region_label(q: str) -> str:
    """Best human label for a plan question, e.g. 'bali' or 'vietnam'."""
    ql = q.lower()
    for c in ("indonesia", "cambodia", "vietnam"):
        if c in ql:
            return c
    for region in _REGION_ALIASES:
        if region in ql or any(k in ql for k in _REGION_ALIASES[region]):
            return region
    return "your trip"


def _build_itinerary(
    q: str,
    picks: List[Dict[str, Any]],
    origin: str,
    days: int,
    user_country: str = "",
    profile: Dict[str, Any] | None = None,
) -> str:
    if not picks:
        return title_case(
            "tell me a country, region, or category you like (e.g. 'bali', 'vietnam', 'temples') "
            "and i will line up a day-by-day plan for you."
        )

    profile = profile or {}
    allergies = profile.get("foodAllergies") or ""
    # Never plan a meal around a dish the traveller is allergic to.
    safe = [p for p in picks if not food_unsafe_for_allergies(p.get("food"), allergies)]
    if safe:
        picks = safe

    # Keep the plan realistic for the actual party: skip activities that are
    # too strenuous for elderly/children/special-needs travellers.
    needs_accessible = bool(
        profile.get("hasElderly") or profile.get("hasChildren") or profile.get("specialNeeds")
    )
    if needs_accessible:
        accessible = []
        for p in picks:
            text = " ".join(
                str(p.get(k) or "") for k in ("accessNeeded", "gettingAround", "primaryActivities")
            ).lower()
            if not re.search(
                r"(strong fitness|strenuous|rope access|steep climb|climbing|advanced dive|"
                r"experienced diver|multi-?day trek|isolated wilderness|expedition)",
                text,
            ):
                accessible.append(p)
        if accessible:
            picks = accessible

    # Respect the transport preference when enough places match.
    transport = profile.get("transportPreference")
    if transport:
        pats = {
            "car": r"(car|taxi|private driver|4wd|jeep|driver)",
            "scooter": r"(scooter|motorbike|motorcycle|tuk-?tuk|moped)",
            "walk": r"(walk|hike|bicycle|pedestrian|cycling)",
            "public": r"(bus|train|ferry|boat|cruise|kayak|grab|ride-?hailing|public|tuk-?tuk|metro|rail)",
        }
        if transport in pats:
            matched = []
            for p in picks:
                text = " ".join(
                    str(p.get(k) or "")
                    for k in ("gettingAround", "transport", "accessNeeded", "navigationTips")
                ).lower()
                if re.search(pats[transport], text):
                    matched.append(p)
            if len(matched) >= max(1, round(len(picks) * 0.3)):
                picks = matched

    origin = (origin or "SIN").upper().strip() or "SIN"
    first = picks[0]
    last = picks[-1]
    airport = first.get("airport") or "?"
    last_airport = last.get("airport") or airport

    region = _region_label(q)
    opener = _pick_variation(_PLAN_OPENERS, q).format(days=days, region=title_case(region))

    lines = [opener, ""]

    # Personalise for the actual travelling party.
    party = []
    if profile.get("mode") == "group" and profile.get("groupSize"):
        party.append(f"group of {profile['groupSize']}")
    if profile.get("hasElderly"):
        party.append("elderly travellers")
    if profile.get("hasChildren"):
        party.append("children")
    if party:
        lines.append(
            "planning for " + ", ".join(party) + " — days are paced with easy mornings, "
            "short walk times, and accessible stops so nobody gets left behind."
        )
        lines.append("")
    if profile.get("transportPreference"):
        lines.append(
            f"you prefer getting around by {profile['transportPreference']} — "
            "the legs below are chosen with that in mind."
        )
        lines.append("")

    lines.append(f"Day 1 — Arrive {first.get('location', '')}")
    lines.append(f"  • fly {origin} → {airport}. settle in, take it slow.")
    food = first.get("food")
    if food and not food_unsafe_for_allergies(food, allergies):
        lines.append(f"  • first evening: {food}")

    slot_days = max(1, days - 2)
    for i in range(slot_days):
        p = picks[i % len(picks)]
        day_num = i + 2
        if day_num > days:
            break
        if i >= slot_days - 1 and days > 2:
            lines.append("")
            lines.append(f"Day {days} — Depart")
            lines.append(f"  • fly {last_airport} → {origin}. leave with a full memory card.")
            break
        lines.append("")
        lines.append(f"Day {day_num} — {p.get('location', '?')} ({p.get('country', '?')})")
        acts = p.get("primaryActivities") or "a traveller favourite — explore at your own pace."
        lines.append(f"  • {acts}")
        if p.get("gettingAround") or p.get("navigationTips"):
            lines.append(f"  • getting around: {p.get('gettingAround') or p.get('navigationTips')}")
        p_food = p.get("food")
        if p_food and not food_unsafe_for_allergies(p_food, allergies):
            lines.append(f"  • eat: {p_food}")
        if p.get("costPerDay"):
            cost = format_cost_per_day(p.get("costPerDay"), p.get("country"), user_country)
            if profile.get("mode") == "group" and profile.get("groupSize"):
                lines.append(f"  • budget: {cost} per day per person (group of {profile['groupSize']})")
            else:
                lines.append(f"  • budget: {cost} per day (1 person)")

    if days <= 2:
        lines.append("")
        lines.append("Day 2 — Depart")
        lines.append(f"  • fly {last_airport} → {origin}.")

    festival_text = _get_festivals_for_query(q)
    if festival_text:
        lines.append(festival_text)
    lines.append("")
    lines.append(_pick_variation(_PLAN_ENDINGS, q))
    return title_case("\n".join(lines))


def _find_place(q: str, places: List[Dict[str, Any]]) -> Dict[str, Any] | None:
    ql = q.lower()
    for p in places or []:
        loc = (p.get("location") or "").lower()
        country = (p.get("country") or "").lower()
        category = (p.get("category") or "").lower()
        if loc and loc in ql:
            return p
        if country and country in ql:
            return p
        if category and category in ql:
            return p
    # City / region mentions (hanoi, siem reap, bali...) that don't have their
    # own entry resolve to a real place inside that area.
    for region, keywords in _REGION_ALIASES.items():
        if region in ql or any(k in ql for k in keywords):
            wanted = {k for k in keywords if len(k) > 2}
            for p in places or []:
                loc = (p.get("location") or "").lower()
                if any(loc == w or loc.startswith(w + " ") for w in wanted):
                    return p
    return None


_GREET_RE = re.compile(r"^(hi|hello|hey|yo|howdy|good (morning|afternoon|evening)|selamat|hola)\b", re.I)
_THANKS_RE = re.compile(r"\b(thanks|thank you|thx|cheers|appreciate it|awesome, thanks)\b", re.I)
_WHEN_RE = re.compile(r"\b(best time|when (is|to|should|do|does|can|did)|season|weather|climate|rainy|dry season|which month|what month)\b", re.I)
_FOOD_RE = re.compile(r"\b(food|eat|eating|delicac|dish|dishes|cuisine|restaurant|street food|what (to )?try|what to eat)\b", re.I)
_HIDDEN_RE = re.compile(r"\b(hidden gem|hidden gems|off the beaten|less known|lesser known|secret|underrated)\b", re.I)

_GREET_REPLIES = [
    "hey there! i'm your asean travel desk — ask me about indonesia, cambodia, or vietnam, or ask for a plan like '3 days in bali'.",
    "hello! ready to help you explore southeast asia. ask about a place, a country, food, visas, or a day-by-day plan.",
    "hi! i can recommend places, plan trips, and answer visa, food, and transport questions across indonesia, cambodia, and vietnam.",
]

_THANKS_REPLIES = [
    "anytime! happy to help — ask away whenever you need the next tip.",
    "you're welcome! that's what i'm here for — what's next?",
    "my pleasure! want me to plan a day, compare two places, or point you to flights?",
]


def _when_reply(q: str) -> str:
    """Season-aware answer for 'best time' / 'when to go' questions."""
    ql = q.lower()
    if "vietnam" in ql:
        return "\n".join([
            "vietnam's seasons depend on where you're headed:",
            "• north (hanoi, ha long, sapa): best oct–apr — cooler and drier; may–sep is hot with rain.",
            "• central (da nang, hoi an, hue): jan–aug is sunny and warm; sep–nov can bring typhoons.",
            "• south (ho chi minh, mekong): dec–apr is dry and warm; may–nov is the wet season.",
        ])
    if "cambodia" in ql or "siem reap" in ql or "angkor" in ql:
        return "\n".join([
            "cambodia is easiest to visit nov–feb — cooler and mostly dry, perfect for angkor.",
            "mar–may gets very hot; the rainy season runs may–oct and leaves the countryside lush and green.",
        ])
    if "indonesia" in ql or "bali" in ql:
        return "\n".join([
            "bali and most of indonesia shine in the dry season, roughly apr–oct.",
            "nov–mar is rainier but still warm — fewer crowds and wonderfully green landscapes.",
        ])
    return "\n".join([
        "in this part of southeast asia, the dry season (roughly nov–apr) is usually easiest for islands and temples.",
        "mountain and rainforest stops are best in the shoulder months; confirm the timing for the place you have in mind.",
    ])


def _food_reply(hit: Dict[str, Any], allergies: str) -> str:
    food = hit.get("food") or ""
    dishes = [d.strip() for d in food.split(",") if d.strip()]
    if allergies:
        dishes = [d for d in dishes if not food_unsafe_for_allergies(d, allergies)]
    if not dishes:
        return title_case(
            f"{hit.get('location')} — the signature dishes here all lean into your food restrictions, "
            "so pick up a local recommendation on site instead."
        )
    lines = [f"{hit.get('location')} — local delicacies worth trying:"]
    for d in dishes:
        lines.append(f"• {d}")
    if allergies:
        lines.append("(filtered to skip anything matching your allergies)")
    return title_case("\n".join(lines))


def local_reply(
    question: str,
    places: List[Dict[str, Any]],
    notes: List[Dict[str, Any]],
    origin_airport: str = "SIN",
    user_country: str = "",
    traveller_profile: Dict[str, Any] | None = None,
) -> str:
    q = (question or "").lower()
    origin = (origin_airport or "SIN").upper().strip() or "SIN"

    if _GREET_RE.match(q):
        return title_case(_pick_variation(_GREET_REPLIES, q))
    if _THANKS_RE.search(q) and len(q.split()) <= 6:
        return title_case(_pick_variation(_THANKS_REPLIES, q))

    if "festival" in q or "event" in q or "celebration" in q:
        festival_text = _get_festivals_for_query(q)
        if festival_text:
            return title_case(festival_text)

    days = _extract_days(q)
    is_plan = "itinerary" in q or "plan" in q or "trip" in q or "route" in q or days > 0
    if is_plan:
        picks = _plan_picks(q, places, notes)
        return _build_itinerary(q, picks, origin, days or 3, user_country, traveller_profile or {})

    if _HIDDEN_RE.search(q):
        hidden = _get_hidden_gems(places, q)
        if hidden:
            return title_case(hidden)

    if _WHEN_RE.search(q):
        return title_case(_when_reply(q))

    hit = _find_place(q, places)
    if hit and _FOOD_RE.search(q):
        allergies = (traveller_profile or {}).get("foodAllergies") or ""
        return _food_reply(hit, allergies)

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
            cost = format_cost_per_day(hit.get("costPerDay"), hit.get("country"), user_country)
            lines.append(f"6) cost per day: {cost}.")
        if hit.get("openingHours"):
            lines.append(f"7) opening hours: {hit.get('openingHours')}.")
        emerg = hit.get("emergencyNumbers") or COUNTRY_EMERGENCY.get(hit.get("country", ""))
        if emerg:
            lines.append(f"8) emergency numbers: {emerg}.")
        return title_case("\n".join(lines))

    return title_case(
        "\n".join(
            [
                "i can help with the indonesia, cambodia, and vietnam place guide.",
                "1) ask about a place, country, or category (e.g. 'what to do at angkor?').",
                "2) ask for an itinerary (e.g. 'plan a 5 day bali trip').",
                "3) ask about the best time to visit, local food, visa, or how to get around.",
                "4) ask about festivals or hidden gems.",
            ]
        )
    )


_VISA_RE = re.compile(r"\b(visa|passport|entry requirement|entry rules|e-?visa|evoa)\b", re.I)
_LIVE_TOPIC_RE = re.compile(
    r"\b(how much|price|prices|fare|fares|taxi|grab|gojek|exchange rate|currency|forecast|"
    r"tomorrow|this week|next week|tonight|today'?s weather|news|update|latest|delay|delays|"
    r"flight status|opening hours now|open now|booking)"
    r"\b",
    re.I,
)
_NATIONALITY_RE = re.compile(
    r"\b(singapore(an)?|malaysia(n)?|france|french|germany|german|uk|united kingdom|british|"
    r"usa|united states|american|australia(n)?|china|chinese|japan(ese)?|korea(n)?|india(n)?|"
    r"canada|canadian|switzerland|swiss|italy|italian|spain|spanish|netherlands|dutch|belgium|belgian|"
    r"austria(n)?|ireland|irish|portugal|portuguese|sweden|swedish|norway|norwegian|denmark|danish|"
    r"finland|finnish|poland|polish|czech|hungary|hungarian|brazil(ian)?|new zealand|nz|"
    r"thailand|thai|vietnam(ese)?|indonesia(n)?|cambodia(n)?|philippines|filipino|myanmar|"
    r"laos|lao|brunei|taiwan(ese)?|hong kong|uae|emirati|qatar(i)?|saudi|turkey|turkish|türkiye)\b",
    re.I,
)


def is_database_question(q: str, places: List[Dict[str, Any]]) -> bool:
    """True when the local place database can answer the question well (greetings,
    plans, food, seasons, festivals, hidden gems, or a known place). Live /
    specific questions — nationality-based visas, prices, forecasts, flight
    status — are routed to the web search instead."""
    ql = (q or "").lower()
    if _GREET_RE.match(ql) or (_THANKS_RE.search(ql) and len(ql.split()) <= 6):
        return True
    if any(w in ql for w in ("festival", "festivals", "event", "events", "celebration")):
        return True
    if _extract_days(ql) or "itinerary" in ql or "plan" in ql or "trip" in ql or "route" in ql:
        return True
    if _HIDDEN_RE.search(ql) or _FOOD_RE.search(ql):
        return True
    # Season questions are in the database, but live forecasts go to the web.
    if _WHEN_RE.search(ql):
        return not _LIVE_TOPIC_RE.search(ql)
    # Visa questions that name a nationality need the live check (the database
    # only holds generic entry notes).
    if _VISA_RE.search(ql):
        return not _NATIONALITY_RE.search(ql)
    # Prices, taxi fares, exchange rates, flight status... belong to the web.
    if _LIVE_TOPIC_RE.search(ql):
        return False
    return _find_place(ql, places) is not None


def web_reply(question: str, web: Dict[str, Any]) -> str:
    """Turn a SerpAPI web search result into a short, sourced, ChatGPT-style
    answer. Returns "" when there is nothing useful to say."""
    web = web or {}
    answer = (web.get("answer") or "").strip()
    snippets = [s for s in (web.get("snippets") or []) if s.get("snippet") or s.get("title")]
    if not answer and not snippets:
        return ""

    lines: List[str] = []
    if answer:
        lines.append(answer.rstrip(".") + ".")
    else:
        # Prefer a snippet that reads like an answer (no trailing question mark)
        # over forum questions when picking the lead line.
        top = next((s for s in snippets if s.get("snippet") and not s["snippet"].rstrip().endswith("?")), None)
        top = top or next((s for s in snippets if s.get("snippet")), None)
        if top:
            lines.append((top.get("snippet") or "").rstrip(".") + ".")

    used_answerish = 0
    for s in snippets:
        if len(lines) >= 4:
            break
        snippet = (s.get("snippet") or "").strip()
        if not snippet or snippet == answer:
            continue
        # Skip forum-style questions unless everything left is a question.
        if snippet.rstrip().endswith("?") and used_answerish >= 2:
            continue
        lines.append(f"• {snippet}")
        if not snippet.rstrip().endswith("?"):
            used_answerish += 1

    lines.append("")
    lines.append("sources:")
    for s in snippets[:3]:
        name = s.get("title") or s.get("url") or "source"
        url = s.get("url") or ""
        lines.append(f"• {name} — {url}" if url else f"• {name}")

    return title_case("\n".join(lines))