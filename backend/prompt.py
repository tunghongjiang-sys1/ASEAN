"""local database-derived chat reply helper.

no external ai. pulls rows from the loaded data and shapes a deterministic
reply string from the user's question + saved places + preferred categories.
"""
from typing import Any, Dict, List


def local_reply(
    question: str,
    places: List[Dict[str, Any]],
    notes: List[Dict[str, Any]],
) -> str:
    q = (question or "").lower()
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

    if "itinerary" in q or "plan" in q:
        picks = (notes or places or [])[:3]
        lines = [
            f"{i + 1}) {p.get('location', '?')} ({p.get('country', '?')}) - "
            f"{p.get('primaryActivities', '?')}. fly via {p.get('airport', '?')}."
            for i, p in enumerate(picks)
        ]
        return "\n".join(
            [
                "here is a simple plan from your database:",
                *lines,
                "",
                "tap one of the suggestions above or ask about a specific place, country, or category for more detail.",
            ]
        )

    if hit:
        return "\n".join(
            [
                f"{hit.get('location')} is a {hit.get('category', '').lower()} "
                f"stop in {hit.get('country')}.",
                f"1) activities: {hit.get('primaryActivities')}.",
                f"2) getting there: {hit.get('howToGetThere')}.",
                f"3) visa: {hit.get('visaEntry')}.",
                f"4) etiquette: {hit.get('cultureEtiquette')}.",
            ]
        )

    return "\n".join(
        [
            "i can help using the indonesia, cambodia, and vietnam place database.",
            "1) ask about a place, country, or category.",
            "2) ask for an itinerary (e.g. 3 days in bali).",
            "3) ask about visa, dress code, or payment.",
        ]
    )
