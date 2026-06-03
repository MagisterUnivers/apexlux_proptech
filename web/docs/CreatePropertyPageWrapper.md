# ConciergeDashboardWrapper

**File:** `web/views/ConciergeDashboardWrapper.tsx`
**Type:** Client component (`"use client"`)
**Complexity:** High — owns all proposal state and orchestrates all mutations

---

## Role

The concierge dashboard wrapper is the single source of truth for the proposals list during a session. It receives initial data from the server (`initialProposals`, `reservation`) and owns all subsequent state changes through `useState`.

No child component mutates proposals directly — all changes flow up through callbacks and are applied in the wrapper.

---

## Data Flow

```
concierge/page.tsx (server)
    ↓ fetchProposalsAction(), fetchReservationAction()
    ↓
ConciergeDashboardWrapper (client)
    ├── useState<Proposal[]>(initialProposals)
    ├── ProposalList (display list)
    │   └── ProposalElement (single row)
    │       ├── EditNotesModal (edit notes on DRAFT)
    │       └── Callbacks: onSend, onAddItem, onDelete, onNotesUpdate, onItemDelete
    └── AddItemModal (add item to active proposal)
```

---

## State

```typescript
const [proposals, setProposals] = useState<Proposal[]>(initialProposals);
const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
const [loading, setLoading] = useState(false);
```

`loading` is only used for slow operations (create proposal, send proposal) where the UI needs a spinner.

---

## Handlers

| Handler | Action | State update |
|---|---|---|
| `handleNewProposal` | POST /proposals | prepend new proposal |
| `handleOpenAddItem` | — | set activeProposalId, open modal |
| `handleAddItem` | POST /proposals/:id/items | append item to matching proposal |
| `handleDelete` | DELETE /proposals/:id | filter out deleted proposal |
| `handleSend` | POST /proposals/:id/send | replace proposal with updated (status SENT) |
| `handleNotesUpdate` | PATCH /proposals/:id/notes | replace proposal with updated |
| `handleItemDelete` | DELETE /proposals/:id/items/:itemId | filter item out of matching proposal |

All handlers follow the same pattern:

```typescript
const handleX = useCallback(async (...args) => {
  try {
    const updated = await someAction(...args);
    setProposals(prev => prev.map(p => p.id === id ? updated : p));
    toast.success("...");
  } catch {
    toast.error("...");
  }
}, []);
```

On error, state is not modified — the previous state is the automatic rollback.

---

## ProposalElement Actions by Status

```
DRAFT    → Trash2 (delete) | Pencil (edit notes) | ExternalLink | Add Item | Send
SENT     → Trash2 (delete) | ExternalLink
APPROVED → ExternalLink only
PAID     → ExternalLink only
```

Item-level delete (Trash2 on hover) is visible only on DRAFT proposals.

---

## Stats Row

The wrapper computes counts from local state — no additional API call:

```typescript
const draftCount    = proposals.filter(p => p.status === "DRAFT").length;
const sentCount     = proposals.filter(p => p.status === "SENT").length;
const approvedCount = proposals.filter(p => p.status === "APPROVED").length;
const paidCount     = proposals.filter(p => p.status === "PAID").length;
```

These update instantly after any mutation because they derive from `proposals` state.

---

## Scaling Note

Currently handles one reservation. For multi-villa support, the wrapper would accept a `reservationId` prop and proposals would be scoped and filtered per reservation.

---

**Created by** [Andrii Shaposhnikov](https://github.com/MagisterUnivers) — MIT License
