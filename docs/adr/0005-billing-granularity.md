# Billing granularity: Subscription, Invoice, Voucher

A Subscription is a recurring service relationship between one Customer, one Plan, and one Router. Prepaid hotspot sales are Vouchers, not Subscriptions. An Invoice bills exactly one Subscription for one billing period, and a Payment applies to exactly one Invoice. Plan price is for one validity period, so MRR is derived from `price × (30 / validityDays)`.

Customer status is `active | suspended`; Subscription status is `active | suspended | expired`; Invoice status is `draft | issued | paid | void`. Grace and overdue are derived from due dates and balances, never stored. RouterOS remains the source of truth for RouterOS Profiles and Hotspot Users; Supabill owns the commercial records and pushes Desired Configuration.

## Considered Options

- **Subscription covers prepaid passes too** — overloads `mikrotikUsername`, `renewsAt`, and `serviceType`, and makes one-day passes look like contracts.
- **Invoice per Customer with line items** — better for multi-subscription customers, but adds a line-item model before the business needs it.
- **Payment allocation ledger** — accounting-correct end state; deferred until one payment must settle multiple invoices.

## Consequences

A Customer with two Subscriptions receives two invoices. Voucher revenue is reported from Vouchers, not Payments. Multi-subscription consolidated billing and customer credit will require a new decision, not a reinterpretation of these records.
