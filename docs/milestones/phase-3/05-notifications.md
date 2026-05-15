# Step 5: In-App Notifications

> **Goal:** Bell icon in the header with unread count and a notification dropdown.

Notifications are the in-app mirror of emails — same events, second channel.

---

## `lib/notifications.ts`

```ts
async function createNotification({
  orgId: string,
  userId?: string,   // null = org-wide, shown to all members
  type: string,
  title: string,
  message: string,
}): Promise<void>
```

Uses the admin Supabase client. Logs on failure, never throws.

---

## Events

| Event | Type | Title | Recipient | Triggered by |
|-------|------|-------|-----------|-------------|
| Run completed | `run_completed` | "Analysis complete" | Run creator | Worker (after run_scores written) |
| Run failed | `run_failed` | "Analysis failed" | Run creator | Worker (on pipeline error) |
| Payment confirmed | `payment_success` | "Payment confirmed" | Org admins | `invoice.paid` webhook |
| Payment failed | `payment_failed` | "Payment failed" | Org admins | `invoice.payment_failed` webhook |
| Plan changed | `plan_changed` | "Plan updated to {plan}" | Org admins | `customer.subscription.updated` webhook |
| Role changed | `role_changed` | "Your role was updated" | Affected user | `PATCH /api/members/[id]` |

Run notifications set `user_id` (targeted). Payment and plan notifications set `user_id = null` (org-wide).

---

## API routes

### GET `/api/notifications`

Tenant auth. Returns last 20 notifications, newest first.

Query: `org_id` matches AND (`user_id = auth.uid()` OR `user_id IS NULL`).

```json
[{ "id": "uuid", "type": "run_completed", "title": "Analysis complete", "message": "...", "read": false, "createdAt": "..." }]
```

### PATCH `/api/notifications/read`

Tenant auth. Two modes:

- `{ "id": "uuid" }` — mark a single notification read
- `{ "all": true }` — mark all unread read for this user

---

## UI: Notification bell

**Component:** `components/dashboard/notification-bell.tsx` — lives in `TenantHeader`.

- Outline `Bell` icon when no unread; filled bell + red badge (capped at "9+") when unread
- Unread count derived from the notifications list (`items.filter(n => !n.read).length`)
- Click opens dropdown with last 20 notifications
- Each item: icon (by type), title, truncated message, time ago
- Unread items highlighted
- Click item → mark read + navigate:
  - `run_completed` / `run_failed` → `/runs/{id}`
  - `payment_success` / `payment_failed` / `plan_changed` → `/settings/billing`
  - `role_changed` → `/members`
- **"Mark all as read"** button at top
- Empty state: "No notifications yet"

**Realtime:** Subscribe to `notifications` table INSERT events via Supabase Realtime. When a new row arrives for this org, invalidate the `["notifications"]` query — no polling needed.

```ts
supabase
  .channel("notifications")
  .on("postgres_changes", {
    event: "INSERT",
    schema: "public",
    table: "notifications",
    filter: `org_id=eq.${orgId}`,
  }, () => queryClient.invalidateQueries({ queryKey: ["notifications"] }))
  .subscribe();
```

Unsubscribe on unmount.

---

## Done when

- [ ] `createNotification()` works, never throws
- [ ] All 6 notification events fire from their triggers
- [ ] `GET /api/notifications` returns last 20 for the user
- [ ] `PATCH /api/notifications/read` marks single or all read
- [ ] Bell shows in header with correct unread badge
- [ ] Clicking a notification marks it read and navigates
- [ ] "Mark all as read" works
- [ ] New notifications appear instantly via Realtime (no polling)
