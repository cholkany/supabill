# Supabill

Supabill is a billing and operations platform for MikroTik-based ISPs. Each ISP business operates in its own Tenant.

## Language

### Tenancy & Access

**Tenant**:
An ISP business that owns its routers, customers, plans, and billing data. The primary ownership boundary in Supabill.
_Avoid_: Organization, workspace, account, team

**Tenant Status**:
A Tenant's commercial lifecycle: trial, active, or suspended.
_Avoid_: Plan status, subscription status

**User**:
A person who signs in to Supabill.
_Avoid_: Account, operator, admin

**Active Tenant**:
The Tenant whose data the User is currently viewing, identified in the URL.
_Avoid_: Current team, selected workspace

**Membership**:
The link granting a User a role (owner, admin, finance, support) within a Tenant.
_Avoid_: Seat, team member, user account

**Owner**:
A Membership role with full control of a Tenant, including settings and members.
_Avoid_: Super admin, root

**Admin**:
A Membership role that manages routers, plans, customers, subscriptions, and vouchers, but not members or Tenant settings.
_Avoid_: Manager, operator

**Finance**:
A Membership role that manages invoices and payments and reads customer, plan, and subscription data.
_Avoid_: Accountant, billing user

**Support**:
A Membership role that operates routers and reads data, without writing billing records or settings.
_Avoid_: Technician, operator

### Routers

**Router**:
A MikroTik device enrolled in a Tenant and managed by Supabill.
_Avoid_: Managed router, device, node, CPE, gateway

**Router Setup**:
The transient onboarding record for a Router before enrollment completes.
_Avoid_: Provisioning session, wizard, claim

**Claim Code**:
A short code that identifies a Router and authorizes it to enroll with Supabill.
_Avoid_: Token, key, PIN

**Bootstrap Script**:
The one-time RouterOS script that connects a Router to the WireGuard Hub and enrolls it with Supabill.
_Avoid_: Provision script, setup script, config script

**WireGuard Hub**:
The Supabill-operated WireGuard endpoint that Routers connect to.
_Avoid_: Server, VPN, gateway

**Router Tunnel**:
The encrypted link between a Router and the WireGuard Hub, used for management traffic.
_Avoid_: VPN, peer, connection

**Connection Status**:
Whether the Router is currently reachable through its Router Tunnel.
_Avoid_: Online status, health

**Configuration Status**:
Whether the Router's desired configuration has been applied.
_Avoid_: Sync status, readiness

**RouterOS Profile**:
A bandwidth and session policy on a Router. Plans are materialized into RouterOS Profiles.
_Avoid_: Plan, package, tier

**Hotspot User**:
A hotspot credential and its live session on a Router.
_Avoid_: Guest, subscriber, customer, member

**Desired Configuration**:
The configuration Supabill intends a Router to have.
_Avoid_: Config, state, desired state

### Billing

**Customer**:
A person or business that buys service from a Tenant. Customers do not sign in.
_Avoid_: User, client, subscriber, account holder

**Plan**:
A commercial offering sold by a Tenant, defining the price for one validity period, service type, and speed limits. It maps to a RouterOS profile name but is not itself a RouterOS profile.
_Avoid_: Package, product, profile, tier

**Subscription**:
A recurring service relationship between one Customer and one Plan, provisioned on one Router.
_Avoid_: Service, account, package, contract

**Customer Status**:
A Customer's account standing: active or suspended.
_Avoid_: Grace, overdue, offline

**Subscription Status**:
A Subscription's service lifecycle: active, suspended, or expired. Expired is derived from its renewal date.
_Avoid_: Offline, grace, overdue

**Invoice Status**:
The issued state of an Invoice: draft, issued, paid, or void. Overdue is derived.
_Avoid_: Open, overdue

**Invoice**:
A request for payment for one Subscription for one billing period.
_Avoid_: Bill, statement

**Voucher**:
A prepaid access code for a Plan, sold without a Subscription. Redeeming it creates the hotspot credential.
_Avoid_: Pass, ticket, coupon, code

**Payment**:
Money received from a Customer and applied to exactly one Invoice.
_Avoid_: Receipt, transaction, settlement
