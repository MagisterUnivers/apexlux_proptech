# ApexLux Web Documentation

Next.js 14 App Router frontend for the ApexLux luxury concierge itinerary system.

## Documentation Files

### 1. ArchitectureOverview.md — START HERE

- App Router route group structure
- Server vs client component strategy
- Data fetching via Server Actions
- Why state machine approach for the concierge dashboard
- Tailwind JIT content config (critical — missed paths = silent no styles)

### 2. CreatePropertyPageWrapper.md → ConciergeDashboardWrapper

- Most complex view in the app
- Optimistic state management pattern
- All handler methods explained
- Modal coordination

### 3. ViewPropertyPageWrapper.md → ProposalView

- Member-facing proposal view
- Client state machine (approve / pay transitions)
- Hero image with dark overlay
- Confirmed state animation

### 4. PropertyShowdownWrapper.md → State Management Patterns

- When to use server vs client components
- Optimistic updates and local state sync
- useCallback patterns used throughout

---

## Route Structure

```
app/
├── layout.tsx                        Root layout (HTML, fonts)
├── actions.ts                        All server actions (fetch + mutate)
├── (root)/
│   └── page.tsx                      Landing / home page (no header)
└── (app)/
    ├── layout.tsx                    App shell (Header + ToastContainer)
    ├── (concierge-flow)/
    │   └── concierge/
    │       ├── page.tsx              Concierge dashboard (server component)
    │       └── error.tsx             Error boundary
    └── (member-flow)/
        ├── proposals/
        │   ├── page.tsx              Member proposals grid
        │   └── error.tsx             Error boundary
        └── proposal/[id]/
            ├── page.tsx              Single proposal view
            └── error.tsx             Error boundary
```

**URL mapping:**
- `/` — Landing page
- `/concierge` — Concierge dashboard
- `/proposals` — Member proposals grid
- `/proposal/:id` — Member proposal detail

---

## Component Directory

```
web/
├── app/
│   └── actions.ts              Server actions (all API calls live here)
├── views/
│   ├── ConciergeDashboardWrapper.tsx   Client — stateful dashboard
│   └── ProposalView.tsx               Client — member proposal view
├── components/
│   ├── Cards/ProposalCard.tsx          Member grid card (server-compatible)
│   ├── Lists/
│   │   ├── ProposalList/               Concierge list + ProposalElement
│   │   └── ProposalCardList/           Member grid list + ProposalCardElement
│   ├── Modals/
│   │   ├── AddItemModal.tsx
│   │   └── EditNotesModal.tsx
│   ├── Badges/ProposalStatusBadge.tsx
│   ├── Layout/Header.tsx
│   └── ui/                             shadcn/ui components
├── types/itinerary.ts                  All shared TypeScript types
└── constants/
    ├── categories-icons.ts
    └── order-status.ts
```

---

## Key Design Decisions

### Server Components by Default

Pages and static components are server components — they render on the server, reducing JS bundle size and enabling streaming. Client components (`"use client"`) are used only where browser APIs or interactivity are needed:

- `ConciergeDashboardWrapper` — manages proposal state
- `ProposalView` — handles approve/pay actions
- `Header` — uses `usePathname()`
- `ProposalElement` — expand/collapse, modals
- `ProposalCardElement` — photo loading behavior

### Server Actions (app/actions.ts)

All API communication happens through server actions marked `"use server"`. These are functions that run on the server but can be called from client components. Benefits:

- No exposed API keys in browser
- Automatic `revalidateTag` for cache invalidation
- TypeScript-safe request/response shapes

### Error Boundaries (error.tsx)

Each route has an `error.tsx` client component that catches rendering and fetch errors. Pattern:

```tsx
"use client";
export default function XError({ error, reset }: Props) {
  useEffect(() => { console.error(error); }, [error]);
  return <ErrorView heading="..." reset={reset} />;
}
```

---

## Critical: Tailwind Content Config

`web/tailwind.config.js` must include all directories that contain Tailwind classes:

```js
content: [
  "./pages/**/*.{ts,tsx}",
  "./components/**/*.{ts,tsx}",
  "./app/**/*.{ts,tsx}",
  "./views/**/*.{ts,tsx}",    // ← required for ProposalView, ConciergeDashboardWrapper
  "./src/**/*.{ts,tsx}",
],
```

Missing `views/` means all classes in those files are silently dropped — styles appear to work in dev (hot reload) but classes are not in the generated CSS.

---

## Proposal Status Display

```
DRAFT      → gray badge, concierge sees: Add Item / Send / Edit Notes / Delete
SENT       → blue badge,  member sees: Approve button
APPROVED   → amber badge, member sees: Pay & Lock In button
PAID       → emerald badge, locked — no actions available
```

---

**Related:** Backend at `/backend/docs/` | OpenAPI spec at `/backend/docs/openapi.yaml`

**Created by** [Andrii Shaposhnikov](https://github.com/MagisterUnivers)
