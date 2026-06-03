# ApexLux — Concierge Itinerary Proposal System

A full-stack luxury travel concierge platform for **Exclusive Resorts**. Concierges build personalized trip itinerary proposals for members, send them, and members can review, approve, and pay to lock in their experience.

**Created by [Andrii Shaposhnikov](https://github.com/MagisterUnivers)**

---

## Stack

| Layer     | Technology                                                      |
| --------- | --------------------------------------------------------------- |
| Frontend  | Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui |
| Backend   | Express.js · TypeScript · Prisma ORM                            |
| Database  | SQLite (via Prisma)                                             |
| Email sim | Toast notification + `sent_emails` DB table                     |

---

## Getting Started

### Option A — Docker (one command)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) running.

```bash
npm run docker:run
```

Starts backend (port 8000) and frontend (port 3000) in containers with the database seeded. Open [http://localhost:3000](http://localhost:3000).

---

### Option B — Manual Setup

### Prerequisites

- Node.js 18+
- npm 9+

### 1. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd /web
npm install
```

### 2. Set up the database

```bash
cd backend

# Create SQLite DB + run migration
npx prisma migrate dev --name init_apexlux

# Seed: James Whitfield + 5 proposals in various states
npm run seed
```

### 3. Start both servers

**Terminal 1 — Backend (port 8000)**

```bash
cd backend
npm run develop
```

**Terminal 2 — Frontend (port 3000)**

```bash
cd web
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

> **Note:** Update `web/.env` to use `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1` for local development (default is Docker networking).

---

## Routes

| Route            | Who       | Description                            |
| ---------------- | --------- | -------------------------------------- |
| `/`              | Public    | ApexLux landing page                   |
| `/concierge`     | Concierge | Build, manage, and send proposals      |
| `/proposals`     | Member    | Browse all itinerary proposals (cards) |
| `/proposal/[id]` | Member    | Luxury proposal view — approve & pay   |

---

## API Endpoints

| Method   | Endpoint                              | Description                                 |
| -------- | ------------------------------------- | ------------------------------------------- |
| `GET`    | `/api/v1/reservations`                | Active reservation with member data         |
| `GET`    | `/api/v1/proposals?page=1&limit=20`   | All proposals, newest first (paginated)     |
| `GET`    | `/api/v1/proposals/:id`               | Single proposal with all items              |
| `POST`   | `/api/v1/proposals`                   | Create draft proposal                       |
| `PATCH`  | `/api/v1/proposals/:id`               | Update proposal status                      |
| `PATCH`  | `/api/v1/proposals/:id/notes`         | Update concierge notes (DRAFT only)         |
| `DELETE` | `/api/v1/proposals/:id`               | Delete proposal (DRAFT or SENT only)        |
| `POST`   | `/api/v1/proposals/:id/items`         | Add item to a DRAFT proposal                |
| `DELETE` | `/api/v1/proposals/:id/items/:itemId` | Remove item from a DRAFT proposal           |
| `POST`   | `/api/v1/proposals/:id/send`          | Send proposal (logs email + returns record) |

---

## Full Flow

1. **Concierge** visits `/concierge` → sees James Whitfield's reservation (Villa Punta Mita, Mar 15–22)
2. Clicks **New Proposal** → DRAFT created, Add Item modal opens
3. Selects category (Dining, Activities, Wellness, etc.), fills title/description/date/price
4. Clicks **Send** → status → `SENT`, `sent_emails` record created, toast shown
5. **Member** visits `/proposals` → sees proposal cards with status badges
6. Clicks a `SENT` card → luxury proposal view at `/proposal/[id]`
7. Clicks **Approve Proposal** → status → `APPROVED`
8. Clicks **Pay & Lock In** → status → `PAID`, confirmation screen shown

---

## Seeded Data

Pre-seeded with:

- **Member**: James Whitfield (`james.whitfield@exclusive-resorts.com`)
- **Reservation**: Villa Punta Mita, Punta Mita Mexico — March 15–22, 2025
- **5 Proposals** covering different statuses:
  - `DRAFT` — surf lesson + airport transfer
  - `SENT` × 2 — curated dining/wellness/excursions; cultural experiences
  - `APPROVED` — wellness & sunset cocktails
  - `PAID` — sailing + bonfire + helicopter + ATV (confirmed trip)

---

## Design Decisions

**Architecture — Express + Next.js (separate services)**  
The codebase already had a well-structured Express backend with service/controller/DTO/Zod-validation pattern. Keeping separation of concerns means the API can serve mobile or other clients independently, and the clear module boundaries make the backend testable in isolation.

**SQLite**  
Self-contained, zero-config persistence. Prisma manages migrations transparently. Perfect for a demo; switching to PostgreSQL for production is a 2-line schema change.

**Email simulation**  
`POST /proposals/:id/send` creates a `sent_emails` record (audit trail) and the frontend displays a toast with the recipient email and message — fulfills the spec without SMTP complexity.

**Two visual registers**

- `/concierge` — dense, efficient, professional. Concierge staff move fast; clarity over decoration.
- `/proposal/[id]` — premium luxury feel: gradient hero, generous whitespace, emoji category icons, full-screen payment confirmation.

**shadcn/ui**  
Allowed per spec. Provides accessible Radix primitives and consistent design tokens without reinventing the wheel.

---

## Assumptions

- Single member and reservation (James Whitfield / Villa Punta Mita) — the spec calls for a seeded record, not multi-tenant
- The "send email" action is fully simulated — toast notification + DB record, no SMTP
- "Pay" is a status transition only — no real payment gateway
- Proposals can only move forward through the state machine: `DRAFT → SENT → APPROVED → PAID`

**On DRAFT visibility in the member view:**
The member proposal grid (`/proposals`) intentionally excludes `DRAFT` proposals — a member should only see what the concierge has explicitly sent to them. During development, DRAFTs were visible to demonstrate the full state machine in action and verify the system end-to-end. Filtering is a single `.filter(p => p.status !== "DRAFT")` on the frontend and could equally be enforced at the API layer in seconds if a stricter separation is required.

---

## Stretch Goals Completed

All required features plus every stretch goal from the spec were implemented:

- **Notes field** — concierge can add/edit internal notes on DRAFT proposals; notes render in the member view as a styled blockquote
- **Edit draft before sending** — concierge can add and remove individual items from any DRAFT proposal before it is sent
- **Day-by-day timeline** — itinerary items in the member proposal view (`/proposal/:id`) are grouped by date with a labelled section header per day, and ordered chronologically by `scheduledAt`
- **Optimistic UI** — all concierge dashboard mutations (create, send, delete, add/remove items, edit notes) update local state immediately without waiting for a server round-trip; error path leaves state unchanged (implicit rollback)
- **Payment confirmation animation** — the "You're all set" screen uses pure CSS keyframe animations (no Framer Motion): the checkmark scales in with a spring curve, then text and address fade up sequentially with staggered delays

## What I'd Improve Given More Time

- **Auth** — JWT or session-based authentication to properly separate concierge and member contexts. Concierge routes would require a staff token; member routes would be scoped to a reservation link or member ID. This is the most important production gap — without it, any user can access any proposal by ID.
- **Multiple members** — concierge dashboard with a member selector, so staff can manage proposals across multiple active reservations from one screen
- **Tests** — integration tests for the proposal state machine (valid and invalid transitions) and contract tests for the API routes

---

## What I Found Most Interesting

Designing two distinct UX registers from the same component library. The concierge view needs to be _fast and dense_ — they're building itineraries under pressure. The member view needs to feel _premium and unhurried_ — generous whitespace, refined typography, a sense of occasion. Getting both right within Tailwind was an interesting constraint that pushed me to think carefully about what "luxury" looks like in CSS.
