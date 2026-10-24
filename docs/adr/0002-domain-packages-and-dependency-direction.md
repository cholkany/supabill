# Domain packages with a single dependency direction

We decided to replace the flat `apps/server/src/lib` layout with four domain packages: `kernel`, `tenancy`, `routers`, and `billing`. Dependencies flow one way: `kernel ← tenancy ← routers ← billing`. Billing orchestrates router provisioning through the routers package's public API; routers knows nothing about Plans or billing, accepting a `ProfileSpec` instead. `@supabill/db` remains shared infrastructure.

## Considered Options

- **Feature modules inside the server** — lower ceremony, but boundaries are unenforced and the web app still duplicates contracts.
- **Keep the flat layout** — only deletes dead code; leaves the ownership and dependency muddle intact.

## Consequences

Routers and Billing can evolve independently without a dependency cycle. Package entry points become the only cross-context import surface. Splitting the schema per package is deliberately deferred.
