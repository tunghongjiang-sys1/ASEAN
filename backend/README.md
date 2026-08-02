# asean-travel - chat + flights backend (python)

small fastapi service. the `/chat` endpoint answers purely from the in-memory place database (no external ai key needed), and `/flights` proxies aviationstack live data with a deterministic synthetic fallback when no key is set.

## setup

```bash
cp backend/.env.example backend/.env
pip install -r backend/requirements.txt
```

`backend/.env` only needs the secrets you actually use. To opt into live flights **with real prices**, set `SERPAPI_API_KEY` from [SerpAPI](https://serpapi.com/) (Google Flights — free tier ~100 searches/mo, instant signup). Optional alternates: `AMADEUS_CLIENT_ID` + `AMADEUS_CLIENT_SECRET` from [Amadeus for Developers](https://developers.amadeus.com/) (free TEST env ~2000 req/mo), or `AVIATIONSTACK_API_KEY` (live status, no prices). Precedence: SerpAPI → Amadeus → AviationStack → distance-based estimates. To add authentication + per-client rate limits, set `BACKEND_SECRET=<random string>`. Chat works out of the box with no keys.

## run

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8081
```

or simply:

```bash
python backend/main.py
```

then `GET http://localhost:8081/health` should return:
```json
{"ok": true, "places": 145, "categories": 16, "aviationstack_configured": false, "auth_required": false, "rate_limit_per_min": 30}
```

or run the dev smoke script which installs deps, boots the box, then hits `/health` plus a fixture `/chat` and `/flights`:

```bash
bash backend/scripts/dev_smoke.sh
```

## endpoints

### `POST /chat`

request body:
```json
{
  "question": "plan a 3-day bali trip",
  "history": [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "..."}],
  "preferred_categories": ["Coastline/islands"],
  "saved_place_ids": ["indonesia-bali", "indonesia-rajaampat"]
}
```

response body:
```json
{"reply": "..."}
```

the server shapes a deterministic reply from the in-memory place database (loaded once at startup from `data/places.json`). one point per line, no external ai call, no key required. the helper lives in `backend/prompt.py:local_reply`. history is accepted but only used for context display on the client; replies stay deterministic.

### `GET /flights?to=DPS&from=SIN`

returns the next 6–8 flights from the traveller's origin airport to the destination. `to` and `from` are IATA codes (3–4 chars); the client sends the user's actual origin (e.g. `from=FRA`) so flights are always shown as `FRA -> SGN`, never a hardcoded SIN.

live data precedence: **SerpAPI / Google Flights** (real schedules + prices) → **Amadeus** (schedules + prices) → **AviationStack** (live status) → origin-aware distance-based estimates. Same `BACKEND_SECRET` + rate-limit guard as `/chat`.

request: `GET /flights?to=DPS&from=SIN` (IATA, 3–4 chars).
response body:
```json
{"flights": [{ "flightNumber": "SQ940", "airline": "singapore airlines", "from": "SIN", "to": "DPS", "departure": "…", "arrival": "…", "status": "scheduled", "terminal": "T3", "price": 185, "currency": "USD" }], "live": true}
```

`live: true` means amadeus or aviationstack returned rows; `live: false` means the server fell back to the synthetic generator (built into `backend/flights.py`).

### `GET /place-info?query=Angkor%20Wat`

returns google places info for a destination (rating, review count, official website, google maps link, photo) used by the place panel's "find out more" card. requires `GOOGLE_PLACES_API_KEY`. returns the query back with empty fields when not configured or lookup fails (the client hides the card in that case).

### `GET /health`

returns places + categories counts, `aviationstack_configured` flag, `auth_required` flag, and the `rate_limit_per_min` budget.

## data

the backend reads `data/places.json` once at startup. regenerate from the JS sources with:

```bash
node scripts/dump_places.mjs
```

run it any time you edit `data/indonesia.js`, `data/cambodia.js`, `data/vietnam.js`, or `data/enrichment.js`.

## client wiring

set in the expo `.env`:

```
EXPO_PUBLIC_BACKEND_URL=http://localhost:8081
```

for device testing on a real phone, use your machine's LAN ip (e.g. `http://192.168.1.42:8081`). run `npm start` after editing `.env` so expo inlines the new prefix.

## caveats

- **rate limit is per-process.** the in-memory bucket lives in this python process. with `uvicorn --workers N`, each worker gets its own bucket so the effective global ceiling is `N x RATE_LIMIT_PER_MIN`. for a real distributed quota swap the bucket to `redis` (`INCR` + `EXPIRE`) or front the box with an api gateway.
- **cors is `*`.** fine for dev on expo web; lock down `allow_origins` for production.
- **no external ai key.** the chat is database-derived. if you later want an ai layer on top, add it as a separate route (e.g. `/chat/ai`) rather than reaching for a key in the current `/chat`.
