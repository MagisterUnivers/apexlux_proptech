# ApexLux Backend Documentation

Express + TypeScript REST API for the ApexLux luxury concierge itinerary system.

## Documentation Files

### 1. ArchitectureOverview.md — START HERE

- Why Express over Next.js API routes
- Layered module structure
- Request flow: route → controller → service → database
- Error handling strategy (AppError + Prisma errors)
- Proposal state machine (DRAFT → SENT → APPROVED → PAID)

### 2. RouteAndController.md — HTTP Layer

- All endpoints with methods and paths
- Controller pattern (asyncHandler wrapper)
- Request/response formats

### 3. DatabaseAndPrisma.md — Data Layer

- Schema: Reservation, Member, Proposal, ProposalItem, SentEmail
- Prisma singleton pattern
- Migration strategy (dev vs deploy)

### 4. MiddlewaresAndErrorHandling.md — Cross-Cutting Concerns

- Zod validation middleware
- Global error handler (AppError + Prisma error classes)
- asyncHandler wrapper

### 5. LOGGING.md — Observability

- Structured logger utility
- Log levels (DEBUG / INFO / WARN / ERROR)
- Emoji-based quick scan format

---

## Request Flow

```
HTTP Request
    ↓
[CORS + express.json()]
    ↓
Route Matching → /api/v1/proposals/:id
    ↓
[validationMiddleware] → Zod schema parse
    ↓
Controller → extract params, call service
    ↓
Service → business logic, Prisma queries
    ↓
Database (SQLite / Prisma)
    ↓
Service returns data or throws AppError
    ↓
Controller → res.json({ data })
    ↓
[errorHandler] → catches AppError, formats JSON
    ↓
HTTP Response
```

---

## Directory Structure

```
backend/
├── src/
│   ├── app.ts                    # Express app setup, middleware, routes
│   ├── index.ts                  # Server entry point
│   ├── client/
│   │   └── prisma.ts             # Prisma singleton
│   ├── dto/
│   │   └── proposal.dto.ts       # TypeScript interfaces for request bodies
│   ├── errors/
│   │   └── app-error.ts          # Custom error class
│   ├── middlewares/
│   │   ├── async-handler.ts      # Wraps async route handlers
│   │   ├── error-handler.ts      # Global error handler (AppError + Prisma)
│   │   └── validation-handler.ts # Zod schema validation
│   ├── modules/
│   │   ├── proposals/
│   │   │   ├── controllers/proposal.controller.ts
│   │   │   ├── services/proposal.service.ts
│   │   │   ├── routes/index.ts
│   │   │   └── schemas/proposal-schema.ts
│   │   └── reservations/
│   │       ├── controllers/reservation.controller.ts
│   │       ├── services/reservation.service.ts
│   │       └── routes/index.ts
│   └── utils/
│       └── logger.ts             # Structured logger
├── prisma/
│   ├── schema.prisma             # Database schema
│   ├── seed.ts                   # Seed data (villa, member, proposals)
│   └── migrations/
├── docs/                         # ← You are here
├── entrypoint.sh                 # Docker: migrate + seed + start
└── DockerFile
```

---

## API Endpoints

```
GET    /api/v1/reservations                       Active reservation + member
GET    /api/v1/proposals?page=1&limit=20          All proposals (paginated)
GET    /api/v1/proposals/:id                      Single proposal with items
POST   /api/v1/proposals                          Create new DRAFT proposal
PATCH  /api/v1/proposals/:id                      Update status
PATCH  /api/v1/proposals/:id/notes                Update internal notes
DELETE /api/v1/proposals/:id                      Delete (DRAFT or SENT only)
POST   /api/v1/proposals/:id/items                Add item to DRAFT proposal
DELETE /api/v1/proposals/:id/items/:itemId        Remove item from DRAFT proposal
POST   /api/v1/proposals/:id/send                 Send to member (DRAFT → SENT)
```

---

## Error Codes

```
400 Bad Request       Zod validation failed
404 Not Found         Resource doesn't exist
409 Conflict          Status transition blocked / item not in proposal
422 Unprocessable     Prisma validation error
503 DB_UNAVAILABLE    Prisma init error (database unreachable)
500 Internal          Unexpected error
```

---

## Proposal Status Machine

```
DRAFT ──(send)──→ SENT ──(approve)──→ APPROVED ──(pay)──→ PAID
  ↑                 ↑
  └── can delete    └── can delete

APPROVED and PAID are immutable — cannot be deleted or modified.
```

---

## Running Locally with Docker

```bash
docker compose up --build
```

Backend starts on `http://localhost:8000`. Runs migrate + seed automatically via `entrypoint.sh`.

---

## Testing

Tests use real Prisma against the local SQLite database (`dev.db`). Each test creates data with a `TEST_MEMBER_` prefix and cleans up via cascade delete in `afterEach`.

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Test files

| File | Type | What it covers |
|------|------|----------------|
| `src/__tests__/proposal.service.test.ts` | Service (real DB) | All ProposalService methods — happy paths, 404/409/400 edge cases, state machine rules, data persistence |
| `src/__tests__/reservation.service.test.ts` | Service (real DB) | All ReservationService methods — includes, ordering, 404 handling |
| `src/__tests__/proposals.spec.ts` | Integration (HTTP + real DB) | All proposal endpoints — status codes, response shape, validation, pagination clamping |
| `src/__tests__/reservations.spec.ts` | Integration (HTTP + real DB) | All reservation endpoints — nested includes, 404, empty proposals |
| `src/__tests__/middlewares/error-handler.test.ts` | Unit | AppError, all Prisma error classes → correct HTTP status + code |
| `src/__tests__/middlewares/validation-handler.test.ts` | Unit | Valid/invalid bodies, ZodError format, non-Zod passthrough |

### Test data strategy

All test data is created under `TEST_MEMBER_` names. Cleanup in `afterEach` deletes members matching that prefix — Prisma cascades delete the linked reservations, proposals, items, and emails automatically. Seed data (James Whitfield) is never touched.

---

**Created by** [Andrii Shaposhnikov](https://github.com/MagisterUnivers)
**Related:** Frontend at `/web/docs/` | OpenAPI spec at `docs/openapi.yaml`
