# Bienvenue — Guide d'arrivée à Montréal 🍁

**Bilingual (FR/EN) newcomer toolkit for Montréal.** Arrival checklist, first-90-days timeline, scam warnings, real organizations & official links, money & banking guide, Québec housing basics. Built by someone who's been through it.

Scaffolded with [`create-bb24-app`](https://www.npmjs.com/package/create-bb24-app).

## Run it

```sh
npm run install:all

# dev (backend :3000, frontend :5173)
npm run dev:backend   # terminal 1
npm run dev:frontend  # terminal 2

# production build + serve
npm run build
JWT_SECRET=$(openssl rand -hex 32) npm start
```

## What's inside

- **frontend/** — React + Vite single-page app. Fully bilingual (FR default, EN toggle);
  every string lives in `frontend/src/content.js`. Arrival checklist with progress bar
  persisted in `localStorage` (`bienvenue-checklist`), language preference persisted
  (`bienvenue-lang`). Warm, mobile-first custom CSS — no framework.
- **backend/** — Express + SQLite (`node:sqlite`) with JWT auth powered by
  [`express-jwt-refresh`](https://www.npmjs.com/package/express-jwt-refresh)
  (rotation + reuse detection). Currently serves the frontend in production and exposes
  the auth API for future features (e.g. cloud-synced checklists). Not required for v1.
- **Dockerfile** + **render.yaml** — one-click deploy to Render (see below).

### Content rules

- French is the default language and must stay proper, natural French — no Franglais.
- Resources directory links **real organizations and official sources only**
  (IRCC, MIFI, RAMQ, Service Canada, TAL, CNESST, Aide juridique, Collectif Bienvenue, CSAI).
- Never invent phone numbers, addresses, fees, or deadlines — link to the official
  source instead of stating specifics.
- Partner/affiliate slots are marked with `data-affiliate-slot` attributes and a
  visible "Lien partenaire / Partner link" badge. See **MONETIZATION.md**.

## Deploy to Render

1. Push this folder to a GitHub repo.
2. In Render: **New → Blueprint**, point it at the repo (uses `render.yaml`).
   Or **New → Web Service** with:
   - Build command: `npm run install:all && npm run build`
   - Start command: `npm start`
   - Env: `JWT_SECRET` → generate a random 32+ byte value.
3. Node version is pinned to 22.14.0 in `render.yaml`.

## Environment

| Variable     | Purpose                                   |
|--------------|-------------------------------------------|
| `PORT`       | HTTP port (default 3000)                  |
| `JWT_SECRET` | HMAC secret, 32+ random bytes (required in production) |

## Project structure

```
bienvenue-mtl/
├── backend/src/        # Express API (auth + serves frontend in prod)
├── frontend/
│   ├── src/
│   │   ├── App.jsx     # views: home, checklist, timeline, scams, resources, money, housing
│   │   ├── content.js  # ALL bilingual content (FR/EN) — edit text here
│   │   └── styles.css  # warm mobile-first design
│   ├── ios/            # Capacitor iOS project (Xcode) — App Store binary
│   ├── android/        # Capacitor Android project (Android Studio) — Play .aab
│   ├── capacitor.config.json  # appId com.bb24.bienvenue, webDir dist
│   └── index.html
├── Dockerfile
├── render.yaml
├── README.md
├── MOBILE.md           # iOS/Android store submission guide
└── MONETIZATION.md     # every affiliate/ad slot + how to activate
```

## Mobile apps (iOS & Android)

The same web build is wrapped with [Capacitor](https://capacitorjs.com) —
one codebase for web, App Store, and Google Play.

```sh
npm run mobile:build   # vite build + capacitor sync → ios/ + android/
```

See **MOBILE.md** for the store submission steps (Apple Developer $99/yr,
Google Play $25 one-time, icon/splash generation, review tips).

---
BUILT WITH LOVE AND CAFFEINE BY BB24
