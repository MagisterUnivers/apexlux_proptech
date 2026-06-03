# ProposalView

**File:** `web/views/ProposalView.tsx`
**Type:** Client component (`"use client"`)
**Route:** `/proposal/:id` — member-facing proposal detail page

---

## Role

The member-facing view for a single itinerary proposal. Displays the full proposal with all items and allows the member to approve or pay. Manages the proposal's lifecycle transitions locally via `useState`.

---

## State

```typescript
const [proposal, setProposal] = useState<Proposal>(initial);
const [loading, setLoading] = useState(false);
const [paid, setPaid] = useState(initial.status === "PAID");
```

`paid` is a separate flag from `proposal.status` — it drives the "confirmed" screen transition on the same render pass as the payment, allowing an immediate screen switch without waiting for a re-fetch.

---

## Render Logic

```
paid === true && proposal.status === "PAID"
    → Confirmed screen (CheckCircle, villa name, dates)

Otherwise
    → Full proposal view
        ├── Hero section (background photo + dark overlay)
        │   ├── Status badge + ref number
        │   ├── Villa name (h1)
        │   ├── Destination + date range + nights
        │   ├── "Curated for {member.name}"
        │   └── Notes (if present, blockquote)
        ├── Itinerary items — grouped by day, ordered chronologically
        │   ├── "Saturday, March 16" header
        │   │   ├── 08:00 AM · Surf Lesson
        │   │   ├── 01:00 PM · Beachside Lunch
        │   │   └── 06:30 PM · Sunset Tasting
        │   └── "Tuesday, March 18" header
        │       └── 07:30 AM · Snorkel Tour
        └── Summary + CTA
            ├── Item count + total price
            ├── "Approve Proposal" (if SENT)
            ├── "Pay & Lock In" (if APPROVED)
            ├── "Itinerary confirmed" (if PAID)
            └── "Being prepared..." (if DRAFT)
```

---

## Status → Available Actions

```
DRAFT    → No action (message: being prepared by concierge)
SENT     → Approve Proposal button
APPROVED → Pay & Lock In button
PAID     → Confirmed badge only
```

---

## Handlers

```typescript
handleApprove()
    → updateProposalStatusAction(proposal.id, "APPROVED")
    → setProposal(updated)
    → toast.success(...)

handlePay()
    → updateProposalStatusAction(proposal.id, "PAID")
    → setProposal(updated)
    → setPaid(true)               ← triggers confirmed screen
    → toast.success(...)
```

Both handlers set `loading = true` during the request and `loading = false` in `finally`. The CTA buttons reflect this with `aria-busy` and "Processing…" label.

---

## Hero Image

```tsx
<img
  src={`https://picsum.photos/seed/${proposal.id}/1200/600`}
  className="absolute inset-0 w-full h-full object-cover"
/>
<div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/70" />
```

`proposal.id` as the seed means the image is unique per proposal and consistent across refreshes. The dark gradient overlay ensures text on top is always legible regardless of the image content.

---

## Day-by-Day Grouping

Items in the proposal are grouped by their `scheduledAt` date using a `reduce` on the frontend. Since the backend returns items sorted `scheduledAt ASC`, the groups appear in chronological order automatically — no secondary sort needed.

```typescript
const grouped = proposal.items.reduce<Record<string, ProposalItem[]>>((acc, item) => {
  const key = new Date(item.scheduledAt).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });
  if (!acc[key]) acc[key] = [];
  acc[key].push(item);
  return acc;
}, {});
```

Each group renders as a `<section aria-label={day}>` with an `<h3>` date header and an `<ol>` of items. The time displayed on each item is simplified to `HH:MM AM/PM` since the date is already in the group header.

This was a stretch goal from the spec — implemented.

---

## Confirmation Screen Animation

When `handlePay()` succeeds and `setPaid(true)` fires, the confirmed screen renders with staggered CSS keyframe animations (no Framer Motion):

| Element | Animation | Delay |
|---|---|---|
| Checkmark circle | `scale-in` (spring curve) | 0ms |
| Name + message | `fade-up` | 250ms |
| Destination + dates | `fade-up` | 450ms |
| Brand footer | `fade-up` | 600ms |

Keyframes are defined in `tailwind.config.js` under `extend.keyframes`. The `both` fill-mode keeps elements at `opacity: 0` before their delay fires.

---

## SEO

`generateMetadata` in `page.tsx` fetches the proposal server-side and builds dynamic metadata:

```typescript
title: `Itinerary — ${villa}`
description: `Your personalized luxury itinerary for ${villa}, ${destination}...`
openGraph: { title, description, type: "website", locale: "en_US" }
```

Falls back to `"Itinerary Proposal | ApexLux"` on fetch error, so the page never renders with missing meta.

---

**Created by** [Andrii Shaposhnikov](https://github.com/MagisterUnivers) — MIT License
