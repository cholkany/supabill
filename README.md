# Supabill

Supabill is a MikroTik billing platform inspired by Mikhmon, rebuilt as a multitenant TypeScript application with room for future custom business modules.

## What is included

- Multitenant billing data model for tenants, memberships, routers, plans, customers, subscriptions, invoices, payments, WireGuard peers, and custom features
- Production router onboarding flow with persisted setup sessions, persisted managed routers, and persistent router logs
- Provision token endpoint that generates a RouterOS script and tracks physical router fetch events
- Live MikroTik probing through RouterOS API for connectivity tests, ethernet port extraction, hotspot data, logs, and system stats
- Next.js flow: sign in/up -> routers list -> multistep add-router setup -> router dashboard with sidebar pages

## Stack

- Next.js 16
- Hono
- Drizzle ORM
- PostgreSQL
- Better Auth
- Tailwind CSS
- Turborepo

## Key endpoints

- `GET /api/platform/overview`
- `GET /api/platform/tenant/:slug`
- `GET /api/platform/wireguard/:routerId/:peerId`
- `GET|POST /api/auth/*`
- `GET /api/routers`
- `POST /api/routers/setup/start`
- `GET /api/routers/setup/:setupId`
- `POST /api/routers/setup/:setupId/test`
- `POST /api/routers/setup/:setupId/complete`
- `GET /api/routers/:routerId`
- `GET /provision/:provisionToken`

## Setup

1. Install dependencies with `pnpm install`
2. Configure your environment variables for the server and web apps:
   - `DATABASE_URL`
   - `BETTER_AUTH_SECRET`
   - `BETTER_AUTH_URL`
   - `CORS_ORIGIN`
   - `ROUTER_CREDENTIALS_KEY` (min 32 chars, for encrypted router API credentials at rest)
   - `ROUTER_PROVISION_BASE_URL` (optional public base URL used in generated provision scripts)
   - `ROUTER_API_TIMEOUT_MS` (optional, defaults to `7000`)
3. Start PostgreSQL or use the included database compose setup
4. Push the schema with `pnpm run db:push`
5. Start the workspace with `pnpm run dev`

The web app runs on [http://localhost:3001](http://localhost:3001) and the API runs on [http://localhost:3000](http://localhost:3000).

## Notes for production

- Ensure your Supabill API is reachable from physical routers for the `/provision/:provisionToken` flow
- Router setup and dashboard endpoints now require authenticated Better Auth sessions (cookie-based), not user ID headers
- Restrict inbound provisioning and API access with firewall rules and TLS termination
- Rotate `ROUTER_CREDENTIALS_KEY` through a managed secret system and use backup/recovery procedures
- Create dedicated RouterOS API users with minimal permissions per deployment policy
- Extend the `business_feature` table when you add new custom workflows
