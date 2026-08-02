from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "places.json"


def _load() -> Tuple[List[Dict[str, Any]], List[str]]:
    with open(DB_PATH, "r", encoding="utf-8") as fh:
        raw = json.load(fh)
    places = raw.get("places", []) or []
    categories = raw.get("categories", []) or []
    return places, categories


PLACES: List[Dict[str, Any]]
CATEGORIES: List[str]
PLACES, CATEGORIES = _load()

_BY_ID: Dict[str, Dict[str, Any]] = {
    p.get("id"): p for p in PLACES if p.get("id")
}


def get_place_by_id(place_id: str) -> Optional[Dict[str, Any]]:
    if not place_id:
        return None
    return _BY_ID.get(place_id)


def places_for_categories(categories: List[str]) -> List[Dict[str, Any]]:
    if not categories:
        return PLACES
    wanted = {c.strip().lower() for c in categories if c}
    if not wanted:
        return PLACES
    return [p for p in PLACES if (p.get("category") or "").strip().lower() in wanted]
