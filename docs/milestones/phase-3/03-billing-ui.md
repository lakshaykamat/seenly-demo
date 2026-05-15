# Step 3: Billing UI

> **Goal:** Billing page at `/settings/billing` — subscribe to a paid plan or manage an existing one.

Admin only. Single page, two states: no subscription and has subscription.

---

## No subscription

When `hasSubscription` is false:

- Three plan cards (Starter, Growth, Enterprise) with key limits from `PLAN_LIMITS`
- "Current plan" badge on Starter
- Upgrade buttons on Growth and Enterprise → call `POST /api/billing/checkout` → redirect to Stripe

| Limit | Starter | Growth | Enterprise |
|-------|---------|--------|------------|
| Runs/month | 50 | 500 | Unlimited |
| Crawl pages | 3 | 10 | 30 |
| Queries per run | 5+2 | 10+5 | 20+15 |
| AI engines | 2 | 3 | 3 |
| Competitors | 3 | 5 | 10 |

---

## Has subscription

When `hasSubscription` is true:

- Current plan name + status badge (`active` → green, `past_due` → yellow)
- Current period end date
- **Manage subscription** button → `POST /api/billing/portal` → redirect to Stripe portal

If `subscription_status = 'past_due'`: warning banner — "Your payment failed. Update your payment method to avoid interruption." Button links to portal.

---

## Navigation

Add "Billing" (`CreditCard` icon) to the sidebar for admin users.

---

## Done when

- [ ] Page renders at `/settings/billing`, admin only
- [ ] No-subscription state shows plan cards with upgrade buttons
- [ ] Has-subscription state shows plan, status, period end
- [ ] Manage button redirects to Stripe portal
- [ ] Past due warning banner shown when `subscription_status = 'past_due'`
- [ ] Skeleton loading state while status fetches
- [ ] Billing nav item visible to admins
