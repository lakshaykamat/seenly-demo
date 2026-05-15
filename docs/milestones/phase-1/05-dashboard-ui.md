# Step 5: Dashboard UI

> **When:** Day 7–11
>
> **Goal:** Working dashboard with four pages, shared layout, role-aware navigation, and responsive design.

The dashboard is what users see after login. It needs to feel polished even though there's no analysis data yet — empty states, skeleton loading, and clear calls to action matter here.

---

## Layout

The dashboard layout (`app/(dashboard)/layout.tsx`) has three parts:

1. **TenantHeader** — sticky top bar with logo, org name, and user avatar dropdown
2. **SidebarNav** — desktop sidebar (left) + mobile bottom nav (fixed bottom)
3. **Main content** — the page content area

Everything is wrapped in `QueryProvider` (React Query) and `AuthProvider` (auth state context).

> Mobile layout uses `pb-20` padding on main content to clear the bottom nav bar.

---

## Pages

### Dashboard (`/dashboard`)

The landing page after login. Shows at a glance what the user has access to.

- **Greeting** with user's email
- **Role badge** and **plan badge**
- **Quota progress** — `Progress` component showing runs used vs limit
- **Feature cards** — three cards (Settings, Runs, Analytics) with icons and colored backgrounds. Each links to its page.

> The "Account details" debug card was removed during the UI polish pass. Only useful info stays.

### Runs (`/runs`)

Visible to admins and analysts. In Phase 1, this is mostly an empty state.

- **Skeleton loading** while data fetches
- **Empty state** — dashed border, `Play` icon, "No runs yet" message
- When runs exist: list with status badges (pending only in Phase 1)

### Members (`/members`)

Admin only. Manage who's in the org.

- **Skeleton loading** with placeholder rows
- **Member table** — email, role (dropdown for admin), join date
- **Empty state** — dashed border, `Users` icon, "No members" message (rare — admin is always a member)
- **Role change** — dropdown selector, toast on success/error
- **Safety** — can't change own role, dropdown disabled for self

### Settings (`/settings`)

Admin only. Org configuration and account management.

- **Invite code** — display code, copy button (uses `toast.success`), regenerate button with `RefreshCw` icon
- **Delete account** — opens shadcn `Dialog` for confirmation, requires typing to confirm
- **Skeleton loading** while settings fetch
- **Toast feedback** on all mutations (copy, regenerate, delete)

---

## Components

### TenantHeader (`components/dashboard/tenant-header.tsx`)

Sticky header bar at the top of every dashboard page.

- Logo on the left
- Org name with `Building2` icon (desktop only)
- Avatar on the right — shows first letter of email
- Clicking avatar opens a `DropdownMenu` with:
  - Email (display only)
  - Role and plan (display only)
  - Separator
  - Logout button

> Replaced the old design (exposed email + bare logout button) with the avatar dropdown during the UI polish pass.

### SidebarNav (`components/dashboard/sidebar-nav.tsx`)

Navigation that adapts to screen size.

**Desktop:** Vertical sidebar on the left with icon + label for each item:
- `LayoutDashboard` — Dashboard
- `Play` — Runs
- `Users` — Members
- `Settings` — Settings

**Mobile:** Fixed bottom navigation bar (`md:hidden`) with the same items as icons only.

Items are **role-filtered** — analysts don't see Settings or Members. The active item is highlighted based on the current route.

### MemberList (`components/dashboard/member-list.tsx`)

Reusable member table used on the Members page.

- Skeleton rows during loading
- Avatar + email + role dropdown + join date
- Empty state with dashed border and icon
- Toast notifications on role change (success + error)

### Can (`components/can.tsx`)

RBAC render guard. Wraps UI that should only show for specific roles:

```tsx
<Can roles={["admin"]}>
  <DeleteButton />
</Can>
```

Renders nothing if the user's role doesn't match.

### UpgradeMessage (`components/upgrade-message.tsx`)

Shows when a feature requires a higher plan. Links to `/settings/billing` (which exists in Phase 3).

---

## Loading & empty states

Every page and data section has proper loading and empty states:

| Component | Loading | Empty |
|-----------|---------|-------|
| Dashboard | Skeleton placeholders | N/A (always has content) |
| Runs list | Skeleton rows | Dashed border + Play icon + "No runs yet" |
| Member table | Skeleton rows | Dashed border + Users icon + "No members" |
| Settings | Skeleton blocks | N/A (settings always exist) |

---

## Done when

- [x] Dashboard shows greeting, badges, quota progress, feature cards
- [x] Runs page has skeleton loading and empty state
- [x] Members page shows member table with role management
- [x] Settings page has invite code management and account deletion
- [x] TenantHeader shows avatar dropdown with email, role, plan, logout
- [x] SidebarNav works on desktop (sidebar) and mobile (bottom nav)
- [x] Role-based nav filtering works (analysts don't see admin pages)
- [x] `<Can>` component gates UI by role
- [x] Toast feedback on all mutations
- [x] Skeleton loading on every page
- [x] Mobile-responsive layout
