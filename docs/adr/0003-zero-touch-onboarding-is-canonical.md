# Zero-touch onboarding is canonical

Two onboarding flows existed: a guided provision-token flow (fetch script, test connectivity, select ports) and a zero-touch flow (claim code, bootstrap script, register callback, sync job). We chose zero-touch as the only flow. The operator enters the Router's name and location, runs one Bootstrap Script on the device, and the Router dials the WireGuard Hub, registers with its Claim Code, reports its ports and identity, and is configured by a sync job.

The Router row exists from setup start in `pending`; Router Setup is the onboarding process attached to it, not a prerequisite for the Router's existence. Status is split into Connection (`pending/connected/offline`) and Configuration (`pending/syncing/ready/error`).

## Considered Options

- **Guided provision-token flow** — already wired into the wizard, but requires manual reachability tests and conflicts with the zero-touch firewall rules on ports 8728/8729.
- **Support both** — doubles maintenance and already produced mutually incompatible scripts.

## Consequences

The provision-token path, its fetch endpoint, and its duplicated script generator are deleted. Connectivity tests are replaced by registration and heartbeat. `completedRouterId` is renamed to reflect that it is the Router being set up, not a completed one.
