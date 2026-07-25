# asean-travel - Vercel deploy guide

this app is an expo router project. hosting it on vercel is a static-site
play: `npx expo export -p web` produces a `dist/` directory that any static
host (vercel, netlify, cloudflare pages, s3+cloudfront) can serve.

## one-time setup

1. in the vercel dashboard, click **add new → project**, point it at this
   repo.
2. framework preset: pick **other** (the repo already ships a
   `vercel.json`, so vercel will follow it).
3. the `vercel.json` at the repo root tells vercel:
   - `buildCommand`: `npx expo export -p web --output-dir dist`
   - `outputDirectory`: `dist`
   - SPA fallback rewrite to `/index.html` for deep links
     (e.g. `/chat`, `/globe`, `/minigame/abc`).
4. add the environment variables in **project settings → environment variables**:

   | var                              | required | purpose                                              |
   |----------------------------------|----------|------------------------------------------------------|
   | `EXPO_PUBLIC_BACKEND_URL`        | yes      | base url of the python backend (chat + flights)      |
   | `EXPO_PUBLIC_BACKEND_SECRET`     | no       | bearer token if `BACKEND_SECRET` is set on the box   |
   | `EXPO_PUBLIC_GOOGLE_CLIENT_ID`   | no       | optional; demo google login works without this       |

   `EXPO_PUBLIC_*` is inlined by expo **at build time**, so once you've set the
   values you must redeploy to bake them into the bundle.

5. click deploy. vercel will run `npx expo export -p web --output-dir dist`,
   then publish `dist/` as a static site.

## what the build produces

```
dist/
├── index.html                    ← landing (welcome)
├── favicon.ico
├── metadata.json
├── assets/                       ← static images, emoji, icons
├── _expo/static/
│   ├── css/...
│   └── js/
│       └── web/
│           └── entry-<hash>.js   ← bundle
└── <route>.html                  ← one per app/<route>.tsx file
```

for dynamic routes (e.g. `app/minigame/[id].tsx`), vercel's `rewrites` send
all unknown paths to `/index.html` so the client-side router can resolve
the dynamic segment at runtime.

## local prod build

```
npm ci
npm run build:web
# → dist/
npx serve dist
# open http://localhost:3000
```

## troubleshooting

- **blank screen on first load.** open dev tools → console. usually a
  missing `EXPO_PUBLIC_BACKEND_URL` (the bundle still loads, but every
  feature that calls the backend will fail).
- **404 on `/chat`, `/globe`, `/minigame/*`.** vercel's static rewrite
  should handle these. if it doesn't, verify `vercel.json` is at the repo
  root and that the `rewrites` block survived the deploy.
- **fonts flicker / FOUC.** expo app uses `@expo-google-fonts`. the fonts
  are inlined as web fonts in the static export, so no external request is
  required at runtime.
- **`react-native-webview` globe.** on web, the globe falls back to an
  `<iframe>` rendering of the maplibre shell (see
  `src/components/globe-map.tsx → Platform.OS === 'web'`). no native
  bridge required.

## caching

`/assets/*` and `/_expo/static/*` get `Cache-Control: max-age=31536000,
immutable` so hashed bundles stay cached. `index.html` is not cached, so
every deploy updates the entry hash the client sees.
