# supabill

MikroTik ISP billing platform. Turborepo + pnpm; Next.js 16 web, Hono API, Postgres/Drizzle, Better Auth. Tenant is the ownership boundary; `CONTEXT.md` is the canonical domain glossary — use its terms.

## Layout and entrypoints

- `apps/web` — Next app on port 3001. Pages in `src/app`; API client/types in `src/lib/router-flow.ts`; `src/middleware.ts` proxies `/api/*`, `/provision/*`, `/bootstrap/*` and `/router/*` to the API. Build output is `standalone`.
- `apps/server` — Hono API on port 3000. Most routes are registered in `src/index.ts`; sub-routers in `src/routes/`; onboarding and WireGuard logic in `src/lib/`. Build is `tsdown` → `dist/index.mjs`.
- `packages/db` — Drizzle schema, migrations, and `@supabill/db`, `@supabill/db/schema`, `@supabill/db/tenancy` entrypoints.
- `packages/auth` — Better Auth instance; the server mounts it at `/api/auth/*`. There is no Next-side auth API route.
- `packages/env` — split schemas: `@supabill/env/server` for API/DB code, `@supabill/env/web` for Next code.
- Workspace packages export TS source directly (`exports` → `src/*.ts`); the server bundles them via `tsdown` `noExternal`. Don't add package build steps or import `dist`.
- Two router models coexist: `managedRouter`/`managedRouterWireguard` is the active onboarding model; `router`/`wireguardPeer` in `schema/platform.ts` are legacy and no longer read by the API. Don't mix them.
- Tenancy is only partially applied: sign-up and `requireAuthenticatedUser` ensure a personal Tenant, but active `managedRouter` queries still filter by `userId`. Don't assume every query is Tenant-scoped yet.
- `docs/adr/` records target decisions that are not all implemented (e.g. ADR 0002's `kernel/tenancy/routers/billing` packages and ADR 0003's removal of the provision-token flow). Verify against `src` before following an ADR.

## Commands

```bash
pnpm install          # required before any turbo command
pnpm db:start         # Postgres via packages/db/docker-compose.yml
pnpm dev              # web :3001 + API :3000
pnpm dev:web
pnpm dev:server
pnpm check-types
pnpm test
pnpm build
pnpm db:generate      # schema change -> migration SQL
pnpm db:migrate       # existing DB; custom baseline + drizzle runner
pnpm db:push          # fresh DB only
pnpm db:studio
```

- There is no `lint` script at the root or in any package. Only `apps/server` has tests (`node:test` via `tsx`, safe to run without a database); other packages have none.
- Only `apps/server` defines `check-types`; `pnpm check-types` does not typecheck `apps/web`. Use `pnpm --filter web build` for web/Next typechecking.

## Environment and runtime

- API env: `apps/server/.env` (loaded by dotenv under the standard turbo scripts). Web env: `apps/web/.env.local` (loaded by Next). No example env file is committed.
- Required API env: `DATABASE_URL`, `BETTER_AUTH_SECRET` (32+ chars), `BETTER_AUTH_URL`, `CORS_ORIGIN`.
- Set `ROUTER_CREDENTIALS_KEY`. If omitted, router-credential encryption falls back to `BETTER_AUTH_SECRET`, so rotating the auth secret makes stored router credentials unreadable.
- WireGuard needs `WG_SERVER_PRIVATE_KEY`/`WG_SERVER_PUBLIC_KEY`; `WG_CONFS_DIR` is where peer configs are written for the Docker WireGuard container. `SERVER_PUBLIC_URL` is embedded in the guided provision URL and the zero-touch bootstrap/register callback (falls back to the request origin).
- `drizzle.config.ts` loads `apps/server/.env` for `db:generate` and `db:push`. `db:migrate` (`migrate.js`) does **not** load dotenv — export `DATABASE_URL` first.
- Browser calls use relative URLs and rely on the Next middleware proxy. Server components/actions call `INTERNAL_SERVER_URL ?? NEXT_PUBLIC_SERVER_URL`.
- Better Auth trusts only `CORS_ORIGIN` plus `TRUSTED_ORIGINS`; `BETTER_AUTH_URL` also decides secure/SameSite cookie behavior.

## Gotchas

- `packages/db/migrate.js` is a custom runner: it baselines existing databases, patches enums/columns, then calls Drizzle. Preserve that behavior; don't replace it with plain `drizzle-kit migrate`.
- Onboarding currently has both flows live: guided `/api/routers/setup/*` + `/provision/:token`, and zero-touch `/bootstrap/:claimCode` + `/router/register/:claimCode` + pg-boss jobs. Provision links expire after 24h; the claim code is cleared once the router registers. ADR 0003 calls zero-touch canonical, but both remain.
- Supabill is the WireGuard hub. `managedRouterWireguard` names don't follow the prefix: `routerPrivateKeyEncrypted`/`routerPublicKey` are the MikroTik's keys and `peerPrivateKeyEncrypted`/`peerPublicKey` are the hub's, but `routerTunnelIp` is the hub's address while `peerTunnelIp` is the MikroTik's; `routerListenPort` is the hub's port. Read `wireguard.ts:314-327` and `router-bootstrap.ts` before using these fields.
- pg-boss shares the app Postgres and starts on API boot (the API exits if the queue cannot start). Queues: `router-provision`, `router-sync`.
- Server relative imports use `.js` suffixes. Web uses `@/*` and typed routes; cast dynamic `href` values as `Route`.
- `CLAUDE.md` and `.cursorrules` just point here; keep this file as the single source.
