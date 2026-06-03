# State Management Patterns

Patterns used throughout the ApexLux frontend. Each pattern has a specific use case — choosing the wrong one adds unnecessary complexity.

---

## Pattern 1: Server Component (no client state)

**Used in:** `proposals/page.tsx`, `concierge/page.tsx`

```typescript
// page.tsx — runs on server, no "use client"
export default async function ProposalsPage() {
  const proposals = await fetchProposalsAction();
  return <ProposalCardList proposals={sorted} />;
}
```

Use when the component only displays data with no interactivity. Data is fetched at request time on the server, HTML is sent to the browser. Zero client-side JavaScript for the component itself.

**When not to use:** Any time the user can trigger mutations or the component needs browser APIs.

---

## Pattern 2: Optimistic Local State (client wrapper)

**Used in:** `ConciergeDashboardWrapper`

```typescript
"use client";
const [proposals, setProposals] = useState<Proposal[]>(initialProposals);

const handleDelete = useCallback(async (id: string) => {
  try {
    await deleteProposalAction(id);
    setProposals(prev => prev.filter(p => p.id !== id)); // optimistic
    toast.success("Deleted.");
  } catch {
    toast.error("Failed to delete.");
    // state unchanged = automatic rollback
  }
}, []);
```

**Key properties:**
- `setProposals` only called after server confirmation (conservative optimistic — not pre-emptive)
- Error path never touches state → previous state is the rollback
- All handlers wrapped in `useCallback` to avoid child re-renders on unrelated state changes

**When to use:** Any view that owns a list of items and supports mutations on them.

---

## Pattern 3: Local Status Machine (client view)

**Used in:** `ProposalView`

```typescript
const canApprove = proposal.status === "SENT";
const canPay     = proposal.status === "APPROVED";

// Derived boolean flags drive conditional rendering
// No switch/case — boolean expressions are clearer for 4-state machines
```

**Key properties:**
- Status-driven rendering: what the user sees is always derived from `proposal.status`
- `paid` flag is separate from status to drive a screen transition synchronously
- Both handlers use the same action (`updateProposalStatusAction`) with different target status

**When to use:** Any entity that has a finite set of states with different available actions per state.

---

## Pattern 4: Controlled Modal

**Used in:** `EditNotesModal`, `AddItemModal`

```typescript
// Parent
const [open, setOpen] = useState(false);
<EditNotesModal
  open={open}
  initialNotes={proposal.notes ?? ""}
  onClose={() => setOpen(false)}
  onSave={async (notes) => { await handleNotesUpdate(id, notes); }}
/>

// Modal — does not call server actions itself
const handleSave = async () => {
  await onSave(value);   // parent's callback
  onClose();
};
```

**Key properties:**
- Modal does not know about server actions or proposal state
- It only knows its own form state (`value`, `loading`)
- Parent decides what happens on save — the modal just emits data upward
- `onOpenChange` from Radix resets local form state when dialog closes

**When to use:** Any modal that collects user input and needs to pass it to a parent handler.

---

## Pattern 5: Prop Drilling vs Callback Lifting

The app uses **callback lifting** throughout:

```
ConciergeDashboardWrapper
    → handleDelete (defined here)
    ↓ passed as prop
ProposalList (onDelete)
    ↓ passed as prop
ProposalElement (onDelete)
    → calls onDelete(proposal.id) on user confirm
```

This is intentional. The wrapper owns state, child components are pure display. Adding a global store (Zustand, Redux) would be over-engineering for a single-screen dashboard.

**When to reach for a global store:** When the same state is needed in components that are not in a parent-child relationship, or when prop drilling exceeds 3 levels.

---

## useCallback Usage

All handlers in `ConciergeDashboardWrapper` are wrapped in `useCallback`:

```typescript
const handleDelete = useCallback(async (id: string) => { ... }, []);
```

**Why:** `ProposalList` and `ProposalElement` receive these as props. Without `useCallback`, a new function reference is created on every render of the wrapper — causing all child components to re-render even if their specific proposal didn't change. `useCallback` with an empty dependency array (or correct deps) stabilizes the reference.

---

## Server Actions (app/actions.ts)

All backend communication goes through `"use server"` functions:

```typescript
"use server";
export async function deleteProposalAction(id: string): Promise<void> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/proposals/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(...);
  revalidateTag("proposals");
}
```

`revalidateTag("proposals")` invalidates the Next.js cache for any `fetch` call tagged with `"proposals"`. This means the next page.tsx render will re-fetch fresh data from the backend.

Client components call server actions directly — Next.js handles the serialization over HTTP internally.

---

**Created by** [Andrii Shaposhnikov](https://github.com/MagisterUnivers) — MIT License
