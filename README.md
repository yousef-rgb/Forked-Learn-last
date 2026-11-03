# Forked Learn — gamified CS, Python & JavaScript learning

React 19 + TypeScript + Vite + React Router + Framer Motion, with **Supabase** (auth + Postgres) for accounts and
cloud-saved progress. Deployed as a static SPA on **Vercel**.

```bash
npm install
cp .env.example .env     # fill in the two Supabase values
npm run dev              # http://localhost:5173
npm run typecheck && npm run lint && npm run build
```

## Environment variables (Vercel → Project → Settings → Environment Variables, and local `.env`)

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → **Project URL** |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API → **Publishable** (or legacy **anon**) key |

Both are public by design. **Never** put the `service_role` / secret key in a `VITE_*` variable. Vite reads variables at
build time, so redeploy after changing them. Without them the app shows a "not configured" screen instead of crashing.

## One-time Supabase setup

1. **Database** — SQL Editor → run [`supabase/schema.sql`](supabase/schema.sql). It is idempotent and non-destructive: creates
   `profiles` / `game_states` if missing, enables Row Level Security (each user can only read/write their own rows), and adds a
   trigger that creates the profile (keeping the name typed at signup) when an account is created.
2. **Redirect URLs** — Authentication → URL Configuration:
   - **Site URL**: your production URL, e.g. `https://your-app.vercel.app`
   - **Redirect URLs** (add all): `https://your-app.vercel.app/**`, `http://localhost:5173/**`, and, if you use preview
     deployments, `https://*-your-team.vercel.app/**`
3. **Email** — Authentication → Providers → Email: keep *Confirm email* on if you want confirmation. (Supabase's built-in
   mailer is rate-limited; configure custom SMTP for real traffic.)
4. **GitHub** — create an OAuth App at github.com/settings/developers; *Authorization callback URL* =
   `https://<project-ref>.supabase.co/auth/v1/callback`. Paste Client ID/Secret into Authentication → Providers → GitHub and enable it.
5. **Google** — Google Cloud Console → APIs & Services → Credentials → *OAuth client ID* (Web application); *Authorized
   redirect URI* = `https://<project-ref>.supabase.co/auth/v1/callback`. Paste Client ID/Secret into Authentication → Providers →
   Google and enable it (configure the OAuth consent screen first).

## How it works

- `src/store/auth.tsx` — the single source of truth for auth: `loading | authenticated | unauthenticated`, derived only from
  `supabase.auth.onAuthStateChange`. Routes never redirect while `loading` (this is what fixes OAuth-return and refresh bounces).
- `src/layouts/AuthLayout.tsx` — `GuestOnly` / `RequireAuth` guards; post-login destinations are validated as same-site paths.
- `/auth/callback` handles OAuth and email-confirmation returns; `/reset-password` handles recovery links (PKCE flow).
- `src/store/game.tsx` + `src/services/progress.ts` — progress is keyed **per user**; loads from the cloud, keeps a per-user local
  backup, saves debounced with retry/backoff, merges before saving so a stale device can't overwrite newer progress, and wipes the
  local copy on logout once the cloud has the data.
- `src/store/engine.ts` — the XP / level / quest economy as pure functions (XP is derived, never stored).
- `vercel.json` — SPA fallback so `/app/...` deep links and refreshes work, plus security headers and a CSP.

## Not built yet (shown honestly as "Coming soon" in the UI)
Code Playground, Challenge Arena, Project Workshop, Leaderboard, Global search, Flashcards, Analytics, Code comparison.
Settings for sound, language, and reminder/summary notifications save a preference only; the features arrive later.

## AI Bot (dashboard assistant)

Chat + image generation inside the dashboard (`/app`, and full screen at `/app/assistant`). Code lives in `src/components/bot/`, `src/store/useBot.ts` and `src/services/{botApi,imageGen,intent}.ts`.

### Environment variables (URLs only)
| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Chat backend base URL. The bot calls `POST {base}/chat` and `POST {base}/chat/clear`. |
| `VITE_IMAGE_WORKER_URL` | Cloudflare Worker URL for image generation. If empty, the bot works as chat only (Image mode is disabled). |

These are bundled into the browser, so they must never contain tokens. `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_IMAGE_MODEL` (default `@cf/black-forest-labs/flux-2-klein-4b`) belong **only** to the Worker (`wrangler secret put CLOUDFLARE_API_TOKEN`). The Worker/backend must allow this app's origin in CORS.
`vercel.json` CSP allows `*.vercel.app` and `*.workers.dev` in `connect-src`; add your own domain there if you use a custom one.

### Contracts
- **Chat:** `POST {base}/chat` with JSON `{ message, sessionId }` (or `multipart/form-data` with `files`) → `{ success, data: { response } }` (markdown). Every request carries `Authorization: Bearer <Supabase access token>`.
- **Image Worker:** `POST {worker}` with JSON `{ prompt, width, height, references?: dataURL[], sessionId }` and the same Bearer token → either `image/*` bytes, or `{ success: true, data: { imageUrl } }` / `{ success: true, data: { imageBase64, mimeType? } }`. The Worker must verify the token, rate-limit per user, re-validate size (256–1920 px) and references (≤ 4), and map the request to the Workers AI model call.
