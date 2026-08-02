# asean-travel - backend deploy guide

this service exposes three endpoints: 

- `GET  /health`         — liveness + counts + flags.
- `POST /chat`          — openrouter proxy with the place database context.
- `GET  /flights?to=DPS` — aviationstack proxy with synthetic fallback.

all three are guarded by the same `BACKEND_SECRET` token-bucket + rate limit
when you set `BACKEND_SECRET` in the box. without it, the box is open.

## env vars the box consumes

| var                          | required | purpose                                                 |
|-----------------------------|----------|---------------------------------------------------------|
| `OPENROUTER_API_KEY`         | yes for live /chat | openrouter bearer token                            |
| `OPENROUTER_MODEL`           | no (default `openai/gpt-4o-mini`)                              |
| `OPENROUTER_TIMEOUT`         | no (default `30`)                                              |
| `AVIATIONSTACK_API_KEY`      | no (without it /flights returns synthetic)                      |
| `SERPAPI_API_KEY`            | no (live flights + prices via Google Flights)                  |
| `AMADEUS_CLIENT_ID`          | no (live flights + prices when set with secret)                |
| `AMADEUS_CLIENT_SECRET`      | no (live flights + prices when set with id)                    |
| `BACKEND_SECRET`             | no (without it the box is unauthenticated)                     |
| `RATE_LIMIT_PER_MIN`         | no (default `30`; `0` disables)                                |
| `PORT`                       | no (default `8000`; the box MUST honour the provider's port)  |

when you set `BACKEND_SECRET`, plumb the same value into the expo client's
`.env` as `EXPO_PUBLIC_BACKEND_SECRET=...` so the SDK sends
`Authorization: Bearer <secret>` on every fetch.

## which provider

all three are tested patterns; pick on your existing infra:

| provider  | pros                                                              | cons                                                       |
|-----------|------------------------------------------------------------------|------------------------------------------------------------|
| **render**     | zero-config git push; managed tls; auto-sleep on free tier | spin-up latency on free tier; cold starts under load |
| **railway**    | one-click from github; persistent volume; nice cli           | pricing per resource; less generous free tier                  |
| **fly.io**     | edge regions; machines start fast; good free tier            | needs `flyctl` and a bit more yaml wiring                    |

### a. render

create `render.yaml` at the repo root:

```yaml
services:
  - type: web
    name: asean-travel-backend
    runtime: python
    plan: free            # or starter
    rootDir: backend
    buildCommand: "pip install -r requirements.txt"
    startCommand: "uvicorn main:app --host 0.0.0.0 --port $PORT"
    envVars:
      - key: OPENROUTER_API_KEY
        sync: false
      - key: AVIATIONSTACK_API_KEY
        sync: false
      - key: BACKEND_SECRET
        generateValue: true   # render generates a random secret
      - key: RATE_LIMIT_PER_MIN
        value: 30
      - key: PYTHON_VERSION
        value: 3.11.6
```

then click "new blueprint" in the render dashboard and point it at the repo.
once provisioned, copy the public url (e.g. `https://asean-travel-backend.onrender.com`).

### b. railway

create `railway.toml` at the repo root (or use the dashboard):

```toml
[build]
builder = "NIXPACKS"
buildCommand = "pip install -r backend/requirements.txt"

[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT --app-dir backend"
restartPolicyType = "ON_FAILURE"
```

or just push the repo and configure from the dashboard:
- new project → deploy from github → set root directory to `backend/`
- set env vars in the variables tab:
  - `OPENROUTER_API_KEY`
  - `AVIATIONSTACK_API_KEY` (optional)
  - `BACKEND_SECRET` (click `generate`)
- railway exposes `$PORT` automatically.

### c. fly.io

```bash
# one-time
flyctl launch --no-deploy --copy-config
```

then `fly.toml`:

```toml
app = "asean-travel-backend"
primary_region = "sin"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8080"

[[services]]
  internal_port = 8080
  protocol = "tcp"
  [[services.ports]]
    handlers = ["http"]
    port = 80
  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

and a tiny `Dockerfile` at the repo root:

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

set secrets via `flyctl secrets set OPENROUTER_API_KEY=...`, etc. — fly treats
them as runtime env vars without writing them to disk.

## wire the expo client to the deployed url

in the expo `.env`, set:

```
EXPO_PUBLIC_BACKEND_URL=https<the deployed url>
EXPO_PUBLIC_BACKEND_SECRET=<same as BACKEND_SECRET>
```

then `npm start` (cold restart) so expo inlines the new prefixes.

## sanity checks after deploy

```
curl -sf https://<your-url>/health | jq .
# expect: { ok: true, places: 145, ... aviationstack_configured: true|false, auth_required: true|false }

curl -sf -X POST https://<your-url>/chat \
  -H "Authorization: Bearer $BACKEND_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"question": "plan bali 3 days", "saved_place_ids": ["indonesia-bali"], "preferred_categories": ["Coastline/islands"]}' | jq .

curl -sf -H "Authorization: Bearer $BACKEND_SECRET" \
  "https://<your-url>/flights?to=DPS" | jq .
```

if any of those fail: check `/health` first (it reports which env vars are
configured), then check `BACKEND_SECRET` matches what the expo client sends.
