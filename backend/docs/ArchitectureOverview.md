# Backend Architecture Overview

## Why a Separate Express Backend (Not Next.js API Routes)

Next.js API routes are convenient for small apps, but the decision to use a standalone Express server was intentional:

**Scalability** — The backend can be containerized and scaled independently. If proposal processing becomes compute-heavy (e.g., PDF generation, email queues), the backend can be moved to a separate server or replicated without touching the frontend.

**Deployment flexibility** — A dedicated Express service can be deployed on any Node-compatible host (Railway, Fly.io, EC2) independently of Vercel or any Next.js-specific platform. Swapping the frontend entirely doesn't require touching the API.

**Middleware chain clarity** — Express gives you a predictable, explicit middleware pipeline. Zod validation, logging, CORS, rate limiting, and error handling are all first-class citizens in the chain rather than being bolted onto Next.js route handlers.

**Why Express over Fastify/Hono/etc.** — Express is mature, widely understood, and has zero friction for a project of this scope. The performance difference only matters at scale levels far beyond a single-villa concierge system.

---

## System Architecture

```
┌─────────────────────────────────────────────┐
│  HTTP REQUEST                               │
│  GET/POST/PATCH/DELETE /api/v1/...         │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│  MIDDLEWARE LAYER                           │
│  • CORS                                     │
│  • express.json()                           │
│  • Zod validation (per route)               │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│  ROUTING LAYER                              │
│  • /api/v1/reservations                     │
│  • /api/v1/proposals                        │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│  CONTROLLER LAYER                           │
│  • Extract params / body                    │
│  • Call service method                      │
│  • Format HTTP response                     │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│  SERVICE LAYER (Business Logic)             │
│  • Status transition rules                  │
│  • Prisma queries                           │
│  • AppError for expected failures           │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│  DATABASE LAYER                             │
│  • Prisma client (singleton)                │
│  • SQLite (dev) — swappable to PostgreSQL   │
└─────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────┐
│  HTTP RESPONSE                              │
│  { data: any } or { status, message, code } │
└─────────────────────────────────────────────┘
```

---

## Module Structure

Each feature module follows the same internal pattern:

```
module/
├── controllers/      # HTTP handlers — extract request data, call service, return JSON
├── services/         # Business logic — rules, Prisma queries, AppError throws
├── routes/           # Route definitions with validation middleware attached
└── schemas/          # Zod schemas for request body validation
```

Currently two modules:

- **proposals** — core domain, most logic lives here
- **reservations** — read-only, single active reservation

---

## Proposal State Machine

A proposal moves through four statuses. The service enforces valid transitions:

```
          add items      send
DRAFT ────────────── → SENT
  │                      │
  └── delete allowed      └── delete allowed
                          │
                     member approves
                          ↓
                       APPROVED
                          │
                      member pays
                          ↓
                        PAID
                   (immutable — no delete, no edit)
```

**Enforcement in service layer:**

- `addItemToProposal` → throws 409 if status ≠ DRAFT
- `removeItemFromProposal` → throws 409 if status ≠ DRAFT
- `updateProposalNotes` → business decision: only on DRAFT (notes are working notes)
- `deleteProposal` → throws 409 if status is APPROVED or PAID
- `sendProposal` → throws 409 if status ≠ DRAFT or items.length === 0

---

## Error Handling

### AppError (expected business errors)

```typescript
throw new AppError(404, "404", "Proposal not found");
throw new AppError(409, "CANNOT_DELETE", "Cannot delete an approved proposal");
```

### Prisma error handling (in error-handler middleware)

```
PrismaClientKnownRequestError
  P2025 (not found) → 404
  P2002 (unique)    → 409
  P2021 (no table)  → 503 DB_SCHEMA_ERROR (run migrate)

PrismaClientValidationError → 422

PrismaClientInitializationError → 503 DB_UNAVAILABLE
```

### asyncHandler wrapper

All controller methods are wrapped in `asyncHandler`, which catches thrown errors (both `AppError` and unexpected `Error`) and passes them to the global error middleware. No try/catch needed in controllers.

---

## Data Relationships

```
Member (1)
    └──> (N) Reservation
               └──> (N) Proposal
                          ├──> (N) ProposalItem
                          └──> (N) SentEmail
```

**Seeded data (via prisma/seed.ts):**

- 1 Member — James Whitfield
- 1 Reservation — Villa Punta Mita, Punta Mita Mexico
- 6 Proposals in various statuses, each with items

---

## Pagination

`GET /proposals` supports `?page=1&limit=20`. Defaults to page 1, limit 20, max limit 100.

Implementation uses `$transaction([findMany, count])` — two queries in one round-trip, returns:

```json
{
  "data": [...],
  "meta": { "page": 1, "limit": 20, "total": 6, "totalPages": 1 }
}
```

---

## Scaling Paths

**Horizontal scaling** — The Express server is stateless. Add a load balancer and run multiple instances. The only shared state is the database.

**Database migration** — Switch from SQLite to PostgreSQL by changing `DATABASE_URL` in `.env` and the Prisma provider in `schema.prisma`. No application code changes required — Prisma abstracts the driver.

**Email queue** — Currently `sendProposal` writes a `SentEmail` record as a mock. In production, replace with a real queue (BullMQ + Redis) or a transactional email service (Resend, SendGrid). The service method is already isolated, so the swap is surgical.

**Caching** — Reservation data is effectively static per session. A Redis cache in front of `GET /reservations` would eliminate redundant DB reads. Proposals change frequently, so cache-busting on mutations would be needed.

**Auth** — No authentication is implemented (single-tenant demo). Adding JWT middleware to the Express pipeline would not require changes to controllers or services — it slots into the middleware chain before routes.

---

**Next:** See `RouteAndController.md` for endpoint details, `DatabaseAndPrisma.md` for schema, `README.md` for test coverage.

---

## Test Coverage

Tests use **real Prisma** against the local SQLite database — no mocks for data. Each test file follows the same pattern: `createTestMember()` → test logic → `afterEach` cascade cleanup via `member.deleteMany({ where: { name: startsWith "TEST_MEMBER_" } })`.

| Layer | File | Tests |
|-------|------|-------|
| Service | `proposal.service.test.ts` | getAllProposals pagination, createProposal, addItem, updateStatus, removeItem, updateNotes, delete (APPROVED/PAID guard), sendProposal (items guard, atomicity) |
| Service | `reservation.service.test.ts` | getActiveReservation ordering, getReservationById nested includes |
| HTTP (supertest) | `proposals.spec.ts` | All 9 endpoints — status codes, response shape, Zod validation, pagination clamping |
| HTTP (supertest) | `reservations.spec.ts` | Both endpoints — nested includes, empty proposals, 404 |
| Middleware | `error-handler.test.ts` | AppError, P2025/P2001/P2002/P2003/P2021, PrismaValidationError, PrismaInitError, unknown errors |
| Middleware | `validation-handler.test.ts` | Valid pass-through, ZodError → 400, non-Zod passthrough, real schema smoke test |

---

**Created by** [Andrii Shaposhnikov](https://github.com/MagisterUnivers) — MIT License
