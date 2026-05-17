# 🌍 soluXYZon World Clock

> **A GIS-centric world clock for people who actually work across time zones.**

## 🚀 Live App

# **[worldclock-by-soluxyzon.vercel.app](https://worldclock-by-soluxyzon.vercel.app/)**

*(Custom domain coming soon at `worldclock.soluxyzon.com`)*

---

## What it is

Most world clock apps are settings widgets — a list of cities and the local time, stacked in a sidebar. They tell you *what* time it is in Tokyo, but never *why that matters right now*.

**soluXYZon World Clock** treats time zones as a geographic and operational problem, not a label. It opens to a full-screen map of the world, with a live solar terminator showing exactly where it's currently night, color-coded pins for the people and places you care about, and a meeting-finder heatmap that tells you — at a glance — when everyone on your map is actually awake at the same time.

It is built for distributed teams, remote workers, international consultants, founders with clients on three continents, and anyone whose calendar is regularly betrayed by daylight savings.

---

## ⭐ Key features

| Feature | What it does |
|---|---|
| 🌐 **Full-screen interactive map** | MapLibre + OpenFreeMap tiles. No login wall — the demo is instant. |
| 🌒 **Live solar terminator** | Real-time day/night overlay computed from solar geometry. Watch sunrise sweep across continents. |
| 📍 **Color-coded pins** | Categorize cities as Client / Family / Friend / Professor / Team / Other. Each gets a distinct color and label. |
| ⏱️ **Time scrubber (±24h)** | Drag a slider and the terminator, every clock, and the heatmap all update together. ±15 min steps with keyboard modifiers (Shift = 1h, Alt = 6h). |
| 🎯 **Meeting Finder heatmap** | A horizontal strip under the slider colors the next 48 hours by how many of your cities are within working hours. Green = full overlap. Click anywhere → slider jumps there. "Find next overlap" button auto-snaps to the next ≥80% availability window. |
| 🔍 **Live city search** | Any city, town, or village on Earth — powered by Photon (OpenStreetMap). Timezone auto-detected from coordinates. |
| 📍 **Use my location** | One click → browser geolocation → reverse-geocoded → "Home" pin dropped at your real city with your precise IANA timezone. |
| 🔐 **Sign in to sync** | Email + password, magic link, or Google OAuth. Your cities follow you across every device. |
| 📦 **Guest mode** | The app works fully without an account. localStorage keeps your cities. On sign-in, you're offered to import them. |
| 🎨 **soluXYZon branding** | Wordmark, favicon, dark theme with green accents. Designed to look at home in a professional workspace. |

---

## 🧰 Tech stack

| Layer | Choice | Why |
|---|---|---|
| **Framework** | Next.js 16 (App Router, Turbopack) | Best-in-class React framework; static export means edge-fast delivery |
| **Language** | TypeScript | Catches errors at write time, not 3 AM |
| **Map engine** | MapLibre GL JS 5.24 | Open-source vector maps, no API keys, WebGL rendering |
| **Map tiles** | OpenFreeMap (positron style) | Free, no rate limits, no attribution requirement |
| **Geocoding** | Photon (komoot.io) | OpenStreetMap-backed, no API key, generous rate limit |
| **Timezone lookup** | `tz-lookup` (npm) | Coordinates → IANA timezone, offline, ~50KB |
| **Solar math** | Custom (`lib/sun.ts`) | Subsolar point + great-circle terminator polygon |
| **Auth + database** | Supabase (Postgres + Auth) | Row-Level Security, JWT sessions, OAuth providers out of the box |
| **Styling** | Inline styles + Tailwind 4 | Co-located, no class soup, fast to iterate |
| **Hosting** | Vercel | Native Next.js, zero-config CI/CD on `git push` |
| **Repo** | GitHub | Source of truth; Vercel watches `main` |

---

## 🧠 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    soluXYZon World Clock                │
│                                                         │
│   ┌──────────────────────────────────────────────────┐  │
│   │  WorldMap.tsx  (orchestrator, ~520 lines)        │  │
│   │   ┌──────────────────────────────────────────┐   │  │
│   │   │  MapLibre WebGL canvas (full-screen)     │   │  │
│   │   │   • OpenFreeMap "positron" base style    │   │  │
│   │   │   • GMT meridian lines + labels          │   │  │
│   │   │   • Solar terminator overlay (live)      │   │  │
│   │   │   • City pins (circle layer, WebGL)      │   │  │
│   │   └──────────────────────────────────────────┘   │  │
│   │                                                  │  │
│   │   ┌──────────────────────────────────────────┐   │  │
│   │   │  Floating UI (DOM overlays)              │   │  │
│   │   │   • Logo (top-left)                      │   │  │
│   │   │   • 📍 Use my location  (top-right)      │   │  │
│   │   │   • 👤 Sign in / account chip            │   │  │
│   │   │   • ⏱️ Time scrubber + Meeting Finder    │   │  │
│   │   │   • 🏙️ City panel (bottom dock)          │   │  │
│   │   └──────────────────────────────────────────┘   │  │
│   └──────────────────────────────────────────────────┘  │
│                                                         │
│        State: cities[], selectedId, virtualTime         │
│        useAuth() → user, session                        │
│                                                         │
│   ┌──────────────────────────────────────────────────┐  │
│   │  lib/storage.ts (adapter)                        │  │
│   │   guest? → localStorage                          │  │
│   │   signed-in? → Supabase (per-mutation upsert)    │  │
│   └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
            ┌───────────────────────────────┐
            │  Supabase (managed Postgres)  │
            │   • auth.users                │
            │   • public.cities             │
            │     RLS: own rows only        │
            └───────────────────────────────┘
```

### Codebase layout

```
worldclock/
├── app/
│   ├── layout.tsx           # Root layout, metadata, favicon
│   ├── page.tsx             # Renders <WorldMap />
│   └── globals.css          # Resets, scrollbar, popup tweaks
├── components/
│   ├── WorldMap.tsx         # The orchestrator — state, map init, all overlays
│   ├── CityList.tsx         # Bottom panel container
│   ├── CityWidget.tsx       # One row per city (time, note, controls)
│   ├── CitySearch.tsx       # + Add City modal (Photon search, tz-lookup)
│   ├── TimelineSlider.tsx   # Time scrubber + Meeting Finder heatmap
│   └── AuthButton.tsx       # Sign-in modal + account chip
├── lib/
│   ├── types.ts             # City, LabelKey, LABEL_COLORS, DEFAULT_CITIES
│   ├── sun.ts               # Solar terminator + meridian GeoJSON builders
│   ├── storage.ts           # Storage adapter (localStorage ↔ Supabase)
│   ├── useAuth.ts           # React hook over supabase.auth.onAuthStateChange
│   └── supabase/
│       └── client.ts        # Singleton browser client
├── supabase/
│   └── migrations/
│       └── 0001_init_cities.sql   # Table + RLS policies + grants
├── types/
│   └── tz-lookup.d.ts       # TypeScript declarations for tz-lookup
├── public/
│   ├── logo-wordmark.png
│   └── logo-icon.png
├── .env.local.example
└── package.json
```

### Data model

```sql
public.cities (
  user_id     uuid  → auth.users(id)  -- RLS scope
  id          text                    -- client-side id
  name        text
  country     text
  lat         double precision
  lng         double precision
  timezone    text                    -- IANA, e.g. "Europe/London"
  label       enum                    -- Client | Family | Friend | Professor | Team | Other
  custom_label text
  enabled     boolean
  created_at  timestamptz
  updated_at  timestamptz             -- auto-touched by trigger
  primary key (user_id, id)
)
```

Four RLS policies enforce `auth.uid() = user_id` on every select / insert / update / delete. Each user is database-level isolated; there is no application code path that could leak across users.

---

## 🛠️ Build journey

The app was built in four phases, each ending in a `git push` and Vercel auto-deploy.

### Phase 1 — Foundation
- Next.js scaffold + MapLibre integration
- Initial dark map style, hard-coded list of demo cities
- Basic pin markers, click-to-select

### Phase 2 — GIS workspace
- Full-screen layout, floating bottom dock for the city panel
- Solar terminator overlay (real-time day/night)
- GMT meridian lines every 60° + labels
- Switched map style from dark to **positron** so day=bright, night=dark
- Live city search via Photon (OpenStreetMap) + `tz-lookup` for tz inference
- localStorage persistence
- Time scrubber with ±24h range, "Now" + UTC readouts, Reset button
- "Use my location" → reverse geocode → drop Home pin
- ±15 min step buttons (Shift = 1h, Alt = 6h)
- soluXYZon wordmark + favicon

### Phase 3 — Meeting Finder
- 48-hour overlap heatmap under the slider, sampled at 30-min intervals
- Color scale: green (full overlap) → amber → red (mostly night) → grey (nobody)
- Click anywhere on the strip → slider jumps to that time
- Live `X / Y in work hours` counter
- "Find next overlap →" button auto-snaps to next ≥80% availability window

### Phase 4 — Multi-user
- Supabase project + initial SQL migration (table, RLS, grants)
- `lib/storage.ts` adapter — localStorage for guests, Supabase for signed-in
- `lib/useAuth.ts` hook over `onAuthStateChange`
- AuthButton: Google OAuth + magic link + email/password + signup
- First-sign-in migration prompt: "Import your guest cities?"
- Vercel auto-deploys every push to `main`

---

## 🐛 Problems we faced (and how we debugged them)

This section is honest. Production-quality apps are 30% feature work and 70% finding out why your map is lying to you.

### 🟢 Solved

#### 1. MapLibre HTML markers drifted at low zoom
**Symptom:** Pins appeared in the wrong geographic locations when the map was zoomed all the way out (world view). They snapped to correct positions only when zoomed in.

**Root cause:** MapLibre's HTML Marker system applies CSS `transform: translate()` based on internal projection math. At zoom 0 immediately after `fitBounds()`, the WebGL viewport and the DOM layout aren't synchronized. The library computes pixel offsets against a transform that hasn't fully settled, and the markers end up in stale positions.

**Mitigations attempted, didn't fully fix:**
- `map.once('idle', ...)` before adding markers
- `box-sizing: border-box` on the pin elements
- `map.resize()` before `fitBounds`
- `requestAnimationFrame` wrappers

**Eventual fix:** **Switched from HTML markers to WebGL `circle` layers.** Pins are now rendered as GeoJSON features on a `circle` layer painted directly onto the map canvas. There is no CSS transform involved at all — coordinates go straight from lng/lat to the GPU using the map's own projection. Pixel-perfect at every zoom, no possibility of drift.

> ⚠️ **This is the fix that finally worked for gross alignment.** See the open issue below — there is still a related quality issue at low zoom that is *not* alignment-related.

#### 2. Hydration mismatch (React error #418)
**Symptom:** Production console showed a minified React #418 error on first paint.

**Root cause:** The TimelineSlider rendered strings that depend on `Intl.DateTimeFormat().resolvedOptions().timeZone` and `new Date()`. The server pre-rendered with UTC and build-time clock; the browser rendered with the user's tz and current clock. Mismatch.

**Fix:** Gate the entire TimelineSlider behind a `mounted` flag (`useEffect` flips it). Returns `null` on the server pre-render; full UI after the first client tick.

#### 3. "permission denied for table cities" after signing in
**Symptom:** Auth worked, but `upsertRemoteCity` failed silently. No data in Supabase Table Editor.

**Root cause:** Tables created via Supabase's **Table Editor UI** auto-grant `select/insert/update/delete` to the `authenticated` role. Tables created via **raw SQL migrations do not.** PostgREST therefore returned `permission denied` *before* RLS policies even ran.

**Fix:** Added explicit `GRANT` statements to the migration:
```sql
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.cities to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
```

(That last `alter default privileges` is preventive medicine for the next table we create.)

#### 4. Magic link redirected to localhost
**Symptom:** User got a Supabase magic-link email but clicking it landed on `http://localhost:3000` regardless of where they requested it from.

**Root cause:** Supabase's "Site URL" defaulted to localhost and the Redirect URLs allowlist was empty.

**Fix:** In Supabase **Authentication → URL Configuration**:
- Set **Site URL** to the production URL
- Added both `http://localhost:3000/**` and `https://worldclock-by-soluxyzon.vercel.app/**` to **Redirect URLs**

#### 5. Email confirmation was on by default; signup looked broken
**Symptom:** User signed up, then immediately tried to sign in with the same password — failed silently.

**Fix:** Disabled "Confirm email" in Supabase **Authentication → Sign In / Providers → Email** for development. (Will re-enable before broader launch.)

---

### 🔴 Open issue — **Help wanted**

#### Pin sub-pixel positioning + base-tile resolution at world zoom

**Status:** Active. The WebGL switch (above) fixed *gross* pin alignment, but the world-zoom view still has two related quality issues we have not solved:

1. **Pin sub-pixel positioning at very low zoom.** At zoom 0–1 (the world view), the underlying tile pixel density is so low that a single screen pixel can represent ~500 km. Pins at adjacent cities can visually overlap or appear "snapped" to the same point even though their coordinates differ by hundreds of kilometers. This is not a bug in our code — it's a fundamental limitation of representing the whole Earth on a ~1500px-wide screen — but it makes the demo feel imprecise. We are looking for ideas around:
   - Adaptive pin clustering at low zoom (e.g., Supercluster integration)
   - Sub-pixel position smoothing (anti-aliased pin centers)
   - Auto-spread / collision avoidance at low zoom

2. **Base map tile resolution at world view.** The OpenFreeMap positron tile pyramid bottoms out at low zoom, and the resulting map can look pixelated / lower-fidelity than the same view in Mapbox or Google Maps. Options being considered:
   - Switching to a different tile provider (Mapbox, MapTiler, Stadia Maps — most require API keys / paid plans)
   - Composing a custom world view from higher-resolution tiles
   - Rendering a stylized vector-only world layer for zoom 0–2

**🙏 If you have experience with MapLibre, vector tiles, point clustering, or general cartography — please open an issue or a PR.** This is the single biggest visual polish issue remaining in the product, and we genuinely want help solving it. Even pointers to good reference implementations would be welcome.

GitHub: **[github.com/sehmilo/worldclock/issues](https://github.com/sehmilo/worldclock/issues)**

---

## 🗺️ Roadmap — what we're building next

Ranked by impact-to-effort. Items 1–5 are pure frontend or single-Edge-Function jobs and can each ship in a focused sprint. Items 6–7 are larger architectural moves.

### 1. Outlook calendar integration *(Microsoft Graph)*
Sign in with a Microsoft account → fetch real Outlook meetings via Microsoft Graph → render them as ghost markers on the time scrubber. The Meeting Finder then respects everyone's actual availability, not just a static 9-5 window. Includes one-click "Schedule in Outlook" / "Open in Teams" actions when you find a slot.

### 2. Google Calendar parity
Same code shape as Graph, doubles the addressable user base. Read events via the Calendar API, write back via direct add.

### 3. Per-city working hours
Override the default 9–17 window on a per-city basis. Required for accurate meeting-finding with people whose schedules don't match the default (night-shift workers, hospitality, etc.). Adds two input fields to each city's expanded view and a working-hours-per-city map in state.

### 4. Share links
`/share/abc123` shows a read-only view of a curated set of cities at a frozen point in time. "Here is the moment everyone is awake — share this link with your team." Pure frontend, no backend needed. URL encodes city IDs + timestamp; the recipient sees a snapshot they can interact with but not modify.

### 5. Custom domain
Move from `worldclock-by-soluxyzon.vercel.app` to `worldclock.soluxyzon.com`. Five minutes of DNS + Vercel config; massive brand uplift.

### 6. MCP server
Expose the app's primitives (list cities, find next overlap, schedule meeting) as MCP tools so Claude and other AI agents can drive it directly. Could be hosted on Supabase Edge Functions or a small dedicated service. This is where the AI-era differentiation lives.

### 7. Mobile-responsive polish + offline support
Current layout assumes ≥768px viewport. Touch interactions for the slider, collapsible city panel, and a service worker for offline-capable map cache.

> Roadmap items are **not contractual** — they are the current best guess at the highest-leverage moves. If you have feedback on what would be most valuable, please open a discussion on GitHub.

---

## 🚀 Local development

### Prerequisites
- Node 20+
- A Supabase project (free tier is fine — see below)

### Setup

```bash
# 1. Clone
git clone https://github.com/sehmilo/worldclock.git
cd worldclock

# 2. Install
npm install

# 3. Configure environment
cp .env.local.example .env.local
# Edit .env.local and add:
#   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...

# 4. Run database migration
# Open Supabase Dashboard → SQL Editor → New query →
# paste the contents of supabase/migrations/0001_init_cities.sql →
# Run.

# 5. (Optional) Disable email confirmation for faster dev:
# Supabase → Authentication → Sign In / Providers → Email →
# toggle "Confirm email" OFF.

# 6. Start the dev server
npm run dev

# Open http://localhost:3000
```

The app gracefully degrades to **guest mode (localStorage only)** if Supabase env vars are missing — so you can develop UI changes without ever touching the database layer.

---

## 🤝 Contributing

Issues, PRs, ideas, and **especially help with the pin alignment / map resolution at low zoom challenge** described above are all welcome.

Open a GitHub issue or PR at **[github.com/sehmilo/worldclock](https://github.com/sehmilo/worldclock)**.

Coding conventions:
- TypeScript everywhere, no `any` unless absolutely necessary
- Inline styles for component-local presentation, Tailwind for layout primitives
- Commits follow the pattern: `<verb> <subject>` + a short body paragraph explaining the *why*
- Every PR should pass `npx tsc --noEmit` and `npm run build`

---

## 📜 License

**Proprietary — All Rights Reserved.** Copyright © 2026 soluXYZon.

This repository is **source-available**, not open-source. You may view, study, and run the code locally for personal use, and submit contributions back. You may **not** redistribute, sublicense, sell, or operate the Software as a commercial service without prior written permission from soluXYZon.

See [`LICENSE`](./LICENSE) for the full terms, or contact us via GitHub for commercial licensing inquiries.

---

## 🏷️ Credits

Built by **[soluXYZon](https://github.com/sehmilo)**.

Powered by the open-source ecosystem:
- [MapLibre GL JS](https://maplibre.org/)
- [OpenFreeMap](https://openfreemap.org/)
- [Photon (komoot)](https://photon.komoot.io/)
- [tz-lookup](https://www.npmjs.com/package/tz-lookup)
- [Next.js](https://nextjs.org/) · [React](https://react.dev/) · [TypeScript](https://www.typescriptlang.org/)
- [Supabase](https://supabase.com/) (Postgres + Auth)
- [Vercel](https://vercel.com/) (hosting)

---

# **🌍 [Try it now → worldclock-by-soluxyzon.vercel.app](https://worldclock-by-soluxyzon.vercel.app/)**
