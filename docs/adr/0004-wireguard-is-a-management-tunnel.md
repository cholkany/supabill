# WireGuard is a management tunnel

Supabill uses WireGuard solely so the platform can reach the RouterOS API on routers that are NAT'd or not publicly reachable. Supabill is the **WireGuard Hub**; each Router dials out and maintains one **Router Tunnel**. Staff-device VPN peers are out of scope.

The existing code already implemented this direction, but the UI described the Router as the WireGuard server and the schema stored the Router's and Hub's tunnel IPs under inverted field names. We are making the code, schema, and UI agree on the Hub-and-Router vocabulary.

## Considered Options

- **Router as server, staff devices as peers** — the older `wireguardPeer` model; useful for field access but not needed for management.
- **Both** — would require two distinct entities and two key lifecycles.

## Consequences

The `managedRouterWireguard` record is renamed and its tunnel-IP fields corrected. The client-config export and staff-peer UI are removed. A future remote-access feature would be a separate context, not a widening of Router Tunnel.
