# asean-travel - Vercel deploy guide

this app is an expo router web app. hosting on vercel is a static-site play:
`npx expo export -p web` produces `dist/`, and the build copies `index.html`
to `404.html` so deep links (`/chat`, `/globe`, `/minigame/abc123`, …) all
land on the same SPA shell and the client-side router takes over.

## one-time setup

1. vercel dashboard → **add new → project**, point it at this repo.
2. framework preset: **other** (the `vercel.json` at the repo root owns the
   build config).
3. add env vars in **project settings → environment variables**:

   | var                              | required | purpose                                              |
   |----------------------------------|----------|------------------------------------------------------|
   | `EXPO_PUBLIC_BACKEND_URL`        | yes      | base url of the python backend (chat + flights)      |
   | `EXPO_PUBLIC_BACKEND_SECRET`     | no       | bearer token if `BACKEND_SECRET` is set on the box   |
   | `EXPO_PUBLIC_GOOGLE_CLIENT_ID`   | no       | optional; demo google login works without this       |

   `EXPO_PUBLIC_*` is inlined by expo **at build time**, so after a value
   change you must redeploy to bake it into the bundle.

4. click deploy. vercel will run

   ```
   npm run build
   ```

   which expands to `expo export -p web --output-dir dist` followed by
   `node -e "fs.copyFileSync('dist/index.html','dist/404.html')"`. the
   resulting tree is:

   ```
   dist/
   ├── index.html
   ├── 404.html                  ← fallback for deep links (same as index.html)
   ├── favicon.ico
   ├── metadata.json
   ├── assets/
   └── _expo/static/{css,js}/...
   ```

## how deep links stay alive

* `GET /`          → vercel serves `dist/index.html` directly. the app boots,
                     mounts the router, and the `<Redirect>` in `app/index.tsx`
                     jumps to `/welcome`.
* `GET /welcome`   → there's no `welcome.html`, so vercel serves the 404
                     page, which is `dist/404.html` ← a copy of `index.html`.
                     the app boots again at `/welcome` and renders
                     `app/welcome.tsx`.
* `GET /minigame/123` → same fallback: 404.html → app boots at the dynamic
  route and renders `app/minigame/[id].tsx`.

the alternative "`rewrites` in vercel.json" approach was tested and turned out
to be flaky for vercel's static "other" framework preset — hence the 404.html
fallback we ship today.

## local prod build

```
npm ci
npm run build        # builds dist/ AND copies index.html -> 404.html
npx serve dist -s    # `-s` enables SPA mode (rewrite to index.html)
# open http://localhost:3000  — also try /chat, /globe
```

## troubleshooting

- **white screen on a deep link.** cause: in older builds we forgot to copy
  `index.html` to `404.html`. make sure `npm run build` finished without
  errors; `dist/404.html` should exist with the same content as
  `dist/index.html`.
- **blank everything, even on `/`.** open dev tools → console. usually a
  runtime exception early in the bundle (e.g. a missing env var).
  **vite-style hot module pings don't apply here** — expo web keeps a single
  long-lived bundle.
- **fonts flicker / FOUC.** `@expo-google-fonts` inlines the woff2 into the
  static export, so there's no external request at runtime.
- **404 on real vercel deploys of a brand-new project.** confirm the build
  log shows the `node -e` step running without error, and inspect the
  deployed `dist/404.html` (it should be a copy of `index.html`).

## caching

- `/assets/*` and `/_expo/static/*` get `Cache-Control: max-age=31536000,
  immutable` so hashed bundles stay cached for a year.
- `index.html` and `404.html` are NOT cached at the edge, so every deploy
  updates the entry hash the client sees.
