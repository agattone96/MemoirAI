# Memoir.AI

Memoir.AI is a private, web-based memory archive. It ingests Facebook Messenger exports, organizes memories into timeline eras/moments, computes relationship signals, and exposes AI actions through direct UI triggers (not a chatbot).

## Repo layout

- `client/` React + TypeScript + Vite UI
- `server/` Express API/server runtime
- `shared/` shared schema/types
- `script/build.ts` production build pipeline

## Implemented product features

- Auth and RBAC
  - Roles: `member`, `tenant_admin`, `super_admin`
  - Permission mapping in `client/src/lib/rbac.ts`
  - Forced first-login reset supported through `must_reset_password`
- Data ingestion (MVP)
  - Messenger JSON parsing in `client/src/lib/memoirArchive.ts`
  - Import UI in `Imports`
- Timeline spine
  - Era/moment presentation in `Timeline`
- Relationship intelligence
  - Contact interaction counts, tone shift, and story arc in `People`
- Invisible AI actions
  - Month summary + chapter draft in `Studio`
- Visual direction
  - Premium dark editorial look with glass surfaces and restrained blue/magenta accents

## Local development

Recommended runtime: Node 20 LTS.

1. Install dependencies:

```bash
npm ci
```

2. Run full-stack dev server:

```bash
npm run dev
```

3. Optional client-only dev server:

```bash
npm run dev:client
```

Default local URL: `http://localhost:5000`

## Scripts

- `npm run dev` start Express + Vite dev integration
- `npm run dev:client` start Vite client directly
- `npm run test` run unit tests (`node --test`)
- `npm run check` run TypeScript checks
- `npm run build` build client + server (`script/build.ts`)
- `npm run start` run built server from `dist/index.cjs`
- `npm run provision:user` provision Supabase users via admin API

## Tests currently included

- `client/src/lib/__tests__/memoirArchive.test.ts`
- `client/src/lib/__tests__/rbac.test.ts`

## Environment variables

Client/runtime auth needs:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Admin provisioning script additionally needs:

- `SUPABASE_SERVICE_ROLE_KEY`

## Super-admin provisioning example

```bash
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

This creates a super-admin with temporary credentials and forces a password reset at first login.

## Deployment

Auto-deploy from `main` is supported, but this is a full-stack app (not client-only static).

### Vercel

Use Node server deployment settings:

- Install command: `npm ci`
- Build command: `npm run build`
- Start command: `npm run start`
- Production branch: `main`
- Environment: set Supabase vars above

### Netlify

For UI-only static hosting, publish `dist/public` (no server routes).
For full feature parity (auth server/API behavior), use a Node-capable host and run `npm run start`.
