# Fiesta Gas PGI — LPG Monitoring & Delivery System

Next.js 16 (App Router, backend inside Next.js via Server Actions) + Convex (database and functions).

## What it does

**Public landing page** — animated hero, features, delivery map with customer pins, how it works, contact (0998 586 1976).

**Client portal** (`/portal`) — log in with mobile number; see estimated gas left (11 kg / 2.7 kg tank); request a refill or send an inquiry; chat with PGI; receive notifications; edit address and pin the house on the map.

**Admin** (`/admin`) — dashboard of clients who are low on gas; client list and detail; Google Map of all clients colored by gas status; requests (accept → schedule → delivered); record deliveries; compose reminders; **SMS outbox** (one-tap "Open SMS app" prefilled with the number and message, then "Mark sent") — SMS stays manual from the PGI phone, as requested.

## First-time setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Connect to the Convex deployment (one time, opens the browser to log in):
   ```bash
   npx convex dev
   ```
   This links the project to `https://elegant-giraffe-604.convex.cloud`, pushes the functions in `convex/`, fills `CONVEX_DEPLOYMENT` in `.env.local`, and regenerates `convex/_generated/`. Keep it running while developing.
3. In another terminal, start Next.js:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000/setup` and create the first **admin** account (works only once).
5. Clients can register at `/register`, or the admin can add them at `/admin/clients/new`.

## Environment (`.env.local`)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Convex cloud URL (already set). |
| `CONVEX_DEPLOYMENT` | Filled by `npx convex dev`. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional. Enables the interactive Google Maps (click-to-pin, all-clients map). Without it, the app still works: pins via "Use my current location" / pasted coordinates, Google Maps embeds and links. |

## How the gas estimate works

`lib/gas.ts` — remaining gas = 1 − (days since last delivery ÷ usual days per tank). Default 30 days for 11 kg, 14 days for 2.7 kg; the admin can tune "usual days per tank" per client. Status: Good → Getting low (≤40 %) → Almost empty (≤20 %) → Likely empty (≤5 %).

## Project layout

- `app/page.tsx` + `components/landing/*` — landing page
- `app/(auth)/*` — login, register, setup (server actions in `app/actions/auth.ts`)
- `app/(app)/portal/*` — client portal; `app/(app)/admin/*` — admin
- `components/shell/AppShell.tsx` — sidebar/topbar shell with live badges
- `convex/schema.ts` — tables: users, sessions, deliveries, requests, messages, notifications
- `convex/auth.ts` — Node action: password hashing (scrypt) and session tokens; `proxy.ts` guards routes by cookie
