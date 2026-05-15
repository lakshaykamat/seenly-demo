# Step 4: Transactional Emails

> **Goal:** Send emails for key events — welcome, run completed, and payment events.

---

## Setup

**Install:** `pnpm add resend`

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM` | Sender address (e.g. `noreply@seenly.app`) |

One-time: add SPF, DKIM, DMARC records and verify the sending domain in Resend. Without this, emails land in spam.

---

## `lib/email.ts`

A thin wrapper:

```ts
async function sendEmail({ to, subject, html }: EmailParams): Promise<void>
```

- Logs every send (to, subject, success/failure)
- Never throws — a failed email must not crash the caller
- No retry logic — Resend handles retries on their end

---

## Emails

| Email | Trigger | Recipient | Key content |
|-------|---------|-----------|-------------|
| Welcome | `POST /api/onboarding/create-org` | New user | Dashboard link, quick-start |
| Run completed | After `run_scores` written (worker) | Run creator | Seenly Score, pillar summary, link to results |
| Payment confirmed | `invoice.paid` webhook | Org admin | Amount, plan, next billing date |
| Payment failed | `invoice.payment_failed` webhook | Org admin | What failed, update payment link |
| Subscription canceled | `customer.subscription.deleted` webhook | Org admin | Plan reverted to starter, resubscribe link |

---

## Templates

Simple HTML, inline styles, single-column layout (max 600px). Include an unsubscribe link in every footer (CAN-SPAM).

---

## Done when

- [ ] `lib/email.ts` wrapper works, never throws
- [ ] Sending domain verified in Resend
- [ ] Welcome email sends on org creation
- [ ] Run completed email sends with score summary
- [ ] Payment confirmed email sends from `invoice.paid`
- [ ] Payment failed email sends from `invoice.payment_failed`
- [ ] Subscription canceled email sends from `customer.subscription.deleted`
- [ ] Unsubscribe link in every email
