# Step 2: Stripe Integration

> **Goal:** Checkout, portal, webhooks, and plan sync. Users can subscribe, upgrade, downgrade, and cancel.

---

## Setup

**Install:** `pnpm add stripe`

### Products in Stripe dashboard

| Product | Price ID env var |
|---------|-----------------|
| Growth | `STRIPE_GROWTH_PRICE_ID` |
| Enterprise | `STRIPE_ENTERPRISE_PRICE_ID` |

Starter is free — no Stripe product needed.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Server-side API calls |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `STRIPE_GROWTH_PRICE_ID` | Maps to growth plan |
| `STRIPE_ENTERPRISE_PRICE_ID` | Maps to enterprise plan |

### `lib/stripe.ts`

- Initialize `new Stripe(STRIPE_SECRET_KEY)`
- Export `PRICE_TO_PLAN: Record<string, Plan>` — price ID → plan name
- Export `PLAN_TO_PRICE: Record<Plan, string>` — plan name → price ID

---

## API routes

### POST `/api/billing/checkout`

Admin only. Creates a Stripe Checkout session.

1. If `stripe_customer_id` exists on the org → use it. Otherwise `stripe.customers.create()` and store the ID.
2. Create session: `mode: "subscription"`, `line_items` with the requested plan's price ID, `metadata: { org_id }`, `success_url` / `cancel_url` → `/settings/billing`.
3. Return `{ url: session.url }`. Frontend redirects.

### POST `/api/billing/portal`

Admin only. Opens the Stripe billing portal for managing the existing subscription.

1. Look up org's `stripe_customer_id`
2. `stripe.billingPortal.sessions.create({ customer, return_url: "/settings/billing" })`
3. Return `{ url: session.url }`

### GET `/api/billing/status`

Any tenant. Reads from `organizations` — no Stripe API call.

```json
{ "plan": "growth", "subscriptionStatus": "active", "currentPeriodEnd": "2026-04-15T00:00:00Z", "hasSubscription": true }
```

---

## Webhook handler

### POST `/api/webhooks/stripe`

No `withTenant()`. Auth via Stripe signature:

```ts
const event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
```

### Events

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Store `stripe_customer_id` + `stripe_subscription_id`, set plan from price ID, `subscription_status = 'active'` |
| `customer.subscription.updated` | Map new price → plan, update `organizations.plan` + `subscription_status` + `current_period_end` |
| `customer.subscription.deleted` | `plan = 'starter'`, `subscription_status = 'canceled'` |
| `invoice.paid` | `subscription_status = 'active'`, update `current_period_end`, create notification + send email |
| `invoice.payment_failed` | `subscription_status = 'past_due'`, create notification + send email |

**Reconciliation:** `checkout.session.completed` uses `metadata.org_id`. Subscription events look up org by `stripe_subscription_id`.

**Idempotency:** All DB writes are naturally idempotent (SET operations). No event-ID tracking needed.

**Error handling:**
- Bad signature → 400
- Org not found → log + 200 (don't force Stripe retries)
- DB failure → 500 (Stripe retries)

---

## Done when

- [ ] `lib/stripe.ts` exports client + price-plan maps
- [ ] `POST /api/billing/checkout` creates session with org_id metadata
- [ ] `POST /api/billing/portal` creates portal session
- [ ] `GET /api/billing/status` returns current state from DB
- [ ] Webhook verifies signature and handles all 5 events
- [ ] Plan changes apply immediately after webhook
- [ ] Duplicate webhook events are harmless
