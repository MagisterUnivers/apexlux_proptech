# Web Architecture Overview

## Application Layout

```
app/layout.tsx          Root: HTML wrapper, global fonts
├── (root)/layout.tsx   Minimal layout (no header) — landing page
└── (app)/layout.tsx    App shell: Header + ToastContainer
    ├── (concierge-flow)/concierge/
    ├── (member-flow)/proposals/
    └── (member-flow)/proposal/[id]/
```

Route groups `(name)` organize code without affecting URLs. The `(concierge-flow)` and `(member-flow)` groups make intent obvious — both inherit the `(app)` layout (header + toasts).

---

## Two Portals, One Codebase

```
/concierge                   Concierge Portal
└── ConciergeDashboardWrapper
    Manages: create proposal, add/remove items, edit notes,
             send to member, delete proposal

/proposals                   Member Portal — proposal grid
└── ProposalCardList
    Displays: all proposals as cards with photo + status

/proposal/:id                Member Portal — proposal detail
└── ProposalView
    Handles: approve proposal, pay & lock in
```

The `Header` detects the current route via `usePathname()` and labels itself accordingly: "Concierge Portal" or "Member Portal".

---

## Why State Machine Approach in ConciergeDashboardWrapper

The concierge dashboard holds all proposals in `useState` and updates them locally (optimistically) on every action. This is not arbitrary — it follows a deliberate pattern:

**Proposals have a defined lifecycle.** A proposal can only move forward through statuses (DRAFT → SENT → APPROVED → PAID) and only specific actions are valid at each stage. This is the definition of a state machine.

**Immediate UI feedback.** When the concierge sends a proposal, the row updates to "Sent" instantly — before the server responds. If the server fails, the optimistic update is rolled back and a toast explains what happened. This makes the UI feel instant and responsive without being dishonest about state.

**Single source of truth during the session.** The wrapper owns the canonical list of proposals. Child components (ProposalElement, AddItemModal, EditNotesModal) receive data as props and emit events upward via callbacks. They never modify the list themselves. This means the list is always consistent — no two children can hold conflicting views of the same proposal.

**Predictable rollback.** Because state only updates on `setProposals(...)` — called only after a confirmed server action, or conditionally after an optimistic update — reverting is trivial: just don't call `setProposals`. The previous state is the implicit rollback.

**Comparison:**

| Approach | UI feel | Consistency | Complexity |
|---|---|---|---|
| Server-only (revalidate on every action) | Sluggish, full page blink | Always accurate | Low |
| Optimistic (update local state, sync server) | Instant | Accurate after recovery | Moderate |
| Global store (Redux/Zustand) | Instant | Depends on implementation | High |

The optimistic local state approach hits the sweet spot for a single-screen dashboard managing one concierge's proposals.

---

## Data Fetching Strategy

```
Server component (page.tsx)
    ↓
Server action (app/actions.ts)
    ↓
fetch() → Express backend (NEXT_PUBLIC_API_URL)
    ↓
Passed as props to client wrapper
    ↓
useState(initialProposals) — client owns state from here
```

Pages fetch data on the server (no loading spinners, data is ready at render). The client component receives `initialProposals` as a prop and hydrates its state from it. After that, all mutations go directly from the client through server actions.

**Why server actions, not direct fetch?**

Server actions (`"use server"`) run on the server, so sensitive env variables (API URL, auth headers) never reach the browser. They also integrate with Next.js cache: `revalidateTag("proposals")` after any mutation invalidates the server-side cache for the proposals page.

---

## Component Responsibility Split

```
page.tsx (server)
└── Fetch initial data, pass to wrapper

ConciergeDashboardWrapper (client)
└── Own all mutation state
└── All callbacks: handleSend, handleDelete, handleAddItem, handleNotesUpdate, handleItemDelete
└── Render ProposalList, pass callbacks down

ProposalElement (client)
└── Display single proposal row
└── Call parent callbacks on user actions (no API calls here)

EditNotesModal / AddItemModal (client)
└── Controlled by parent's open state
└── Emit save data upward, parent calls the action
```

Modals don't call server actions themselves. They emit data to the parent (wrapper), which calls the action and updates state. This keeps the data flow strictly unidirectional.

---

## ProposalView — Member State Machine

The member-facing proposal view is also a local state machine, simpler:

```
initial.status === "PAID"?
    └── Yes → Show confirmed screen (skip full view)
    └── No  → Show full proposal

canApprove = status === "SENT"
canPay     = status === "APPROVED"

handleApprove() → updateProposalStatusAction(id, "APPROVED")
                → setProposal(updated)

handlePay() → updateProposalStatusAction(id, "PAID")
           → setPaid(true)
           → transition to confirmed screen
```

The `paid` flag drives the confirmation screen separately from `proposal.status` to allow an animated transition on the same render pass.

---

## Image Strategy

Proposal cards and the ProposalView hero use `picsum.photos/seed/{id}/...` — a public API that generates deterministic images based on a seed string. This gives each proposal a unique, consistent photo without requiring real assets. The domain is whitelisted in `next.config.js` under `images.remotePatterns`.

---

## Semantic HTML and Accessibility

Semantic elements are used throughout:

| Element | Used for |
|---|---|
| `<article>` | Proposal cards and rows |
| `<ul><li>` | Proposal lists, item lists |
| `<ol>` | Itinerary items (ordered by scheduledAt) |
| `<dl><dt><dd>` | Stats row (label + value pairs) |
| `<time dateTime>` | All date displays |
| `<blockquote>` | Proposal notes |
| `<section aria-label>` | Named page regions |
| `<header>` | Page headings |

Focus rings (`focus-visible:ring-2`) and ARIA attributes (`aria-label`, `aria-expanded`, `aria-busy`, `aria-current`) are applied to all interactive elements.

---

## Scaling Paths

**Static generation** — Proposal cards on `/proposals` are currently `cache: "no-store"`. For members with stable proposals, switching to ISR (`revalidate: 60`) would serve cached HTML and dramatically reduce backend load.

**Auth layer** — No authentication is implemented. Adding Clerk, NextAuth, or middleware-based JWT would plug into Next.js middleware (`middleware.ts`) without requiring changes to pages or server actions.

**Multiple villas / multi-tenant** — Currently seeded with one reservation. The backend schema already supports multiple reservations per member. The frontend would need a reservation selector and scoped proposal fetching.

**Real-time updates** — If concierge and member need to see changes live, Server-Sent Events or WebSockets can be added to the backend. The frontend would replace `fetchProposalsAction` polling with an event stream subscription.

**Caching** — Reservation data (`GET /reservations`) rarely changes. Adding a `revalidate: 300` tag would serve it from cache for 5 minutes between concurrent requests.

---

**Next:** See `ConciergeDashboardWrapper.tsx` and `ProposalView.tsx` in `/web/views/` for the core view implementations.

**Created by** [Andrii Shaposhnikov](https://github.com/MagisterUnivers) — MIT License
