# Tenant is the ownership boundary

Supabill had two parallel ownership models: the billing schema was Tenant-scoped, while the working router flow was User-scoped (`managedRouter.userId`). We decided that a Tenant owns all routers, customers, plans, subscriptions, invoices, and payments; Users act inside a Tenant through a Membership with one of four roles. Signup auto-creates a personal Tenant so a solo operator never sees tenancy, while ISP teams get shared data and role separation.

## Considered Options

- **User-owned data** — simpler and matched the existing code, but cannot support ISP staff roles or shared billing.
- **Hybrid** — User owns routers, Tenant groups billing; rejected because it preserves two ownership paths.

## Consequences

Every query and API call is Tenant-scoped. Existing `managedRouter` rows must be backfilled to a Tenant created for each User. Authorization is checked against Membership, not merely authentication.
