# Memoir.AI

Private AI memory archive with a luxury editorial interface. The app ingests Facebook Messenger JSON exports, builds a timeline of eras and moments, computes relationship intelligence, and provides invisible AI actions (no chatbot surface) for month summaries and chapter drafts.

## Stack

- React + TypeScript + Vite (client under `client/`)
- Express + TS server (`server/`)
- Tailwind + shadcn/ui
- Supabase auth (multi-tenant metadata + RBAC)

## Core features implemented

- Messenger ingestion pipeline:
  - Import `message_*.json` files in **Imports**
  - Parser normalizes UTF text, attachments, timestamp, sender, sentiment
- Vertical timeline spine:
  - **Timeline** groups moments into month-level eras
- Relationship intelligence:
  - **People** computes interaction counts, tone shifts, and story arcs (meeting/peak/fade)
- Invisible AI layer:
  - **Studio** has direct actions for month summaries and chapter drafts
- Secure multi-tenant auth + RBAC:
  - Roles: `member`, `tenant_admin`, `super_admin`
  - Permissions resolved in `client/src/lib/rbac.ts`
  - Forced first-login password reset via `must_reset_password`
- Premium dark luxury UI:
  - Glass surfaces, soft glow, restrained electric blue/magenta accents

## Local setup

```sh
npm ci
npm run dev
```

Open:

- App: `http://localhost:5000`

## Quality checks

```sh
npm run test
npm run check
npm run build
```

## Super-admin provisioning

Use the admin provisioning script (requires Supabase service role key):

```sh
SUPABASE_URL=<your-supabase-url> \
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key> \
npm run provision:user -- \
  --email allisongattone@gmail.com \
  --password 123ChangeThis \
  --username "Allison Gattone" \
  --tenant memoir-ai \
  --role super_admin \
  --force-reset true
```

This creates a super-admin account with temporary credentials and forces password reset at first login.

## Deployment (main branch auto-live)

### Vercel

- Framework preset: `Vite`
- Build command: `npx vite build --config vite.config.ts`
- Output directory: `dist/public`
- Install command: `npm ci`
- Production branch: `main`
- Env vars:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### Netlify

- Build command: `npx vite build --config vite.config.ts`
- Publish directory: `dist/public`
- Production branch: `main`
- Env vars:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
