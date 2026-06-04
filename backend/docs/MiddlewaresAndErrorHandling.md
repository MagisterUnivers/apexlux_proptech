# Middlewares & Error Handling Documentation

**Complexity Level:** ⭐⭐⭐ (Moderate for understanding cross-cutting concerns)

**Role:** Validation, error handling, rate limiting, and promise error catching across all routes.

---

## 🏗️ Middleware Pipeline Architecture

### Request Flow

```
HTTP Request
    ↓
[1] express.json()
    └── Parse JSON body
    ↓
[2] CORS middleware
    └── Validate origin
    ↓
[3] rateLimiter
    └── Check request rate
    ↓
[4] setupSwagger()
    └── Swagger routes
    ↓
[5] Route matching
    └── Find route definition
    ↓
[6] validationMiddleware (Zod)
    └── Validate request body/params
    ↓
[7] asyncHandler wrapper
    ├─ Call controller method
    └─ Catch any thrown errors
    ↓
[8] errorHandler
    └── Format error response
    ↓
HTTP Response
```

---

## 🔑 Core Middlewares

### 1. asyncHandler - Promise Error Catcher

**Purpose:** Catch errors thrown in async route handlers and pass to errorHandler.

**Problem Without It:**

```javascript
// ❌ Without asyncHandler:
router.get("/data", async (req, res) => {
  const result = await db.query(); // If error thrown:
  // Error propagates up
  // Express doesn't catch it
  // Server logs unhandled rejection
  // Client gets no response
  // Server crashes (in some configurations)
});
```

**Solution With asyncHandler:**

```typescript
// ✅ With asyncHandler:
export const asyncHandler = (
  ctrl: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Wraps the async function
    ctrl(req, res, next).catch(next); // .catch(next) sends error to errorHandler middleware
  };
};

// Usage:
router.get(
  "/data",
  asyncHandler(async (req, res) => {
    const result = await db.query(); // Error caught by asyncHandler
    res.json(result);
  }),
);
```

**Flow:**

```
Error thrown in controller
    ↓
asyncHandler catches it
    ↓
Calls next(error)
    ↓
errorHandler middleware receives error
    ↓
Formats and returns JSON response
```

**Benefits:**

- ✅ Prevents server crashes
- ✅ Consistent error handling
- ✅ JSON error responses
- ✅ Centralized error management

---

### 2. validationMiddleware - Zod Schema Validation

**Purpose:** Validate request body against a Zod schema before the controller is called.

**Implementation:**

```typescript
export const validationMiddleware =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      logger.debug("ValidationMiddleware", "🔍 Validating request body...", {
        body: req.body,
      });
      // Parse body against schema (replaces body with the parsed value)
      req.body = schema.parse(req.body);
      next(); // Valid → continue to controller
    } catch (error) {
      if (error instanceof ZodError) {
        // Extract validation errors
        res.status(400).json({
          message: "Validation failed",
          errors: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        });
        return; // Stop processing
      }
      next(error); // Unexpected error → pass to errorHandler
    }
  };
```

**Usage in Routes:**

```typescript
router.post(
  "/",
  validationMiddleware(CreateProposalSchema), // Validates first
  proposalController.createProposal, // Only called if validation passes
);
```

**Validation Example:**

```javascript
// Request:
POST /api/v1/proposals/:id/items
{
  "category": "INVALID_CATEGORY",
  "title": "",                          // Empty
  "description": "Romantic dinner",
  "scheduledAt": "not-a-date",
  "price": -100                          // Must be positive
}

// Zod Schema validation:
CreateProposalItemSchema.parse(req.body)
    ↓
Validation fails on multiple fields
    ↓
ZodError thrown
    ↓
Middleware catches it
    ↓
Extracts error.issues

// Response: 400 Bad Request
{
  "message": "Validation failed",
  "errors": [
    {
      "path": "category",
      "message": "Invalid enum value"
    },
    {
      "path": "title",
      "message": "Too small: expected string to have >=1 characters"
    },
    {
      "path": "scheduledAt",
      "message": "Invalid datetime"
    },
    {
      "path": "price",
      "message": "Too small: expected number to be >0"
    }
  ]
}
```

**Schema Definitions (`proposal-schema.ts`):**

```typescript
const VALID_STATUSES = ["DRAFT", "SENT", "APPROVED", "PAID"] as const;
const VALID_CATEGORIES = [
  "DINING",
  "ACTIVITIES",
  "WELLNESS",
  "EXCURSIONS",
  "TRANSPORT",
  "EXPERIENCES",
] as const;

export const CreateProposalSchema = z.object({
  reservationId: z.string().min(1), // Required, non-empty
  notes: z.string().optional(), // Optional internal notes
});

export const CreateProposalItemSchema = z.object({
  category: z.enum(VALID_CATEGORIES), // Required, 6 enum values
  title: z.string().min(1).max(150), // Required, 1–150 chars
  description: z.string().min(1), // Required, non-empty
  scheduledAt: z.string().datetime(), // Required, ISO 8601
  price: z.number().positive(), // Required, > 0
});

export const UpdateProposalStatusSchema = z.object({
  status: z.enum(VALID_STATUSES), // Required, 4 enum values
});

export const UpdateProposalNotesSchema = z.object({
  notes: z.string().max(1000).nullable(), // Max 1000, null clears notes
});
```

**Validation Failures Caught:**

```
1. Wrong type
   price: "100"  (expected number)

2. String too long
   title: "very long title..."  (> 150 chars)

3. Invalid enum
   status: "INVALID"  (expected DRAFT | SENT | APPROVED | PAID)
   category: "FOOD"   (expected one of 6 ItemCategory values)

4. Missing required field
   (no "reservationId" provided)

5. Invalid datetime format
   scheduledAt: "16/03/2026"  (expected ISO 8601)

6. Non-positive number
   price: -100  or  price: 0  (must be > 0)
```

---

### 3. errorHandler - Global Error Handler

**Purpose:** Catch and format all errors in one central place.

**Implementation:**

The handler inspects the error type in order — `AppError` first, then the
Prisma error classes (mapping known Prisma codes to HTTP statuses), then a
catch-all 500.

```typescript
const PRISMA_NOT_FOUND = new Set(["P2001", "P2018", "P2025"]);
const PRISMA_CONFLICT = new Set(["P2002", "P2003"]);

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // 1. Expected business errors
  if (error instanceof AppError) {
    res.status(error.status).json({ code: error.code, message: error.message });
    return;
  }

  // 2. Known Prisma request errors → mapped HTTP status
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (PRISMA_NOT_FOUND.has(error.code)) {
      res.status(404).json({ code: "NOT_FOUND", message: "Record not found" });
      return;
    }
    if (PRISMA_CONFLICT.has(error.code)) {
      res.status(409).json({ code: "CONFLICT", message: "Unique or foreign-key constraint failed" });
      return;
    }
    if (error.code === "P2021") {
      res.status(500).json({ code: "DB_SCHEMA_ERROR", message: "Table does not exist — run prisma migrate deploy" });
      return;
    }
    res.status(500).json({ code: `PRISMA_${error.code}`, message: error.message });
    return;
  }

  // 3. Malformed query → 400
  if (error instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({ code: "INVALID_QUERY", message: "Invalid database query" });
    return;
  }

  // 4. DB unreachable → 503
  if (error instanceof Prisma.PrismaClientInitializationError) {
    res.status(503).json({ code: "DB_UNAVAILABLE", message: "Database connection failed — check DATABASE_URL and run migrations" });
    return;
  }

  // 5. Anything else → 500
  res.status(500).json({ code: "INTERNAL_ERROR", message: "Something went wrong" });
};
```

**Error Flow:**

```
Error thrown anywhere
    ↓
Service throws AppError(404, "404", "Proposal not found")
    ↓
asyncHandler catches it
    ↓
Calls next(error)
    ↓
errorHandler receives error
    ↓
Checks type in order:
    ├─ AppError?                       → use error.status + error.code
    ├─ PrismaClientKnownRequestError?  → map P-code to 404 / 409 / 500
    ├─ PrismaClientValidationError?    → 400 INVALID_QUERY
    ├─ PrismaClientInitializationError?→ 503 DB_UNAVAILABLE
    └─ otherwise                       → 500 INTERNAL_ERROR
```

**Error Types Handled:**

```typescript
// 1. AppError (expected business errors)
throw new AppError(404, "404", "Proposal not found");
→ Response: 404 { code: "404", message: "Proposal not found" }

// 2. Prisma known request error (e.g. record to update not found)
await prisma.proposal.update({ where: { id: "missing" }, data })
→ PrismaClientKnownRequestError P2025
→ Response: 404 { code: "NOT_FOUND", message: "Record not found" }

// 3. Prisma unique / FK constraint
await prisma.member.create({ data: { email: "duplicate@x.com" } })
→ PrismaClientKnownRequestError P2002
→ Response: 409 { code: "CONFLICT", ... }

// 4. Unexpected error (null pointer, thrown string, etc.)
→ Response: 500 { code: "INTERNAL_ERROR", message: "Something went wrong" }
```

**Note:** errorHandler is registered at the END of app.ts:

```typescript
app.use(errorHandler); // After all other middleware
```

---

### 4. rateLimiter - DDoS Protection

**Purpose:** Limit requests per IP to prevent abuse.

**Implementation:**

```typescript
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 30, // Max 30 requests per window
  standardHeaders: true, // Send RateLimit-* headers
  legacyHeaders: false,
  message: {
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests, please try again later",
  },
});
```

**Configuration:**

```
windowMs: 60 * 1000
  └─ 1 minute window (60,000 milliseconds)

max: 30
  └─ Maximum 30 requests per window
  └─ From same IP address

standardHeaders: true
  └─ Sends X-RateLimit-* response headers
  └─ RateLimit-Limit: 30
  └─ RateLimit-Remaining: 27 (after 3 requests)
  └─ RateLimit-Reset: 1234567890 (timestamp)
```

**Behavior:**

```javascript
// Request 1: 200 OK
// Request 2: 200 OK
// ...
// Request 30: 200 OK
// Request 31: 429 Too Many Requests

Response: 429 Too Many Requests
{
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests, please try again later"
}

// Wait 60 seconds (window resets)
// Request 31: 200 OK (counter reset)
```

**Per-IP Tracking:**

```javascript
Client A from 192.168.1.1:
├─ 30 requests in 1 minute ✓
└─ Request 31: 429 Too Many Requests ❌

Client B from 192.168.1.2:
├─ 5 requests in 1 minute ✓
└─ Request 6: 200 OK (different IP, separate counter)
```

**Use Case:**

- Prevents brute force attacks
- Protects against accidental request storms
- Fair usage policy enforcement

---

## 💾 Data Structures

### AppError Class

```typescript
export class AppError extends Error {
  constructor(
    public status: number, // HTTP status code (400, 404, 409, etc.)
    public code: string, // Error identifier ("404", "DUPLICATE", etc.)
    message: string, // Human-readable message
  ) {
    super(message);
  }
}
```

**Usage:**

```typescript
// Throw custom error
throw new AppError(409, "CANNOT_DELETE", "Cannot delete an approved or paid proposal");

// Caught by errorHandler
// Response: { status: 409, code: "CANNOT_DELETE", message: "..." }
```

---

## 🔄 Complete Error Handling Example

### Scenario: Send a Proposal That Has No Items

```
1. Frontend sends request:
   POST /api/v1/proposals/:id/send

2. Express receives the request (no body to parse)

3. No validationMiddleware on this route (no body)
   → Goes straight to the controller

4. asyncHandler wraps controller
   → Calls proposalController.sendProposal(req, res)

5. Controller extracts params
   → id = req.params.id

6. Controller calls service
   → await proposalService.sendProposal(id)

7. Service loads the proposal and checks its items
   → proposal.items.length === 0
   → Throws: new AppError(400, "400", "Cannot send a proposal with no items")

8. Error propagates up (not caught in service)
   → Promise rejects

9. asyncHandler catches rejection
   → Calls next(error)

10. errorHandler receives error
    → Checks: error instanceof AppError? YES
    → Uses error.status = 400
    → Uses error.code = "400"

11. errorHandler sends response:
    res.status(400).json({
      code: "400",
      message: "Cannot send a proposal with no items"
    })

12. Response sent to frontend
    HTTP Status: 400 Bad Request
    Body: { code: "400", message: "..." }

13. Frontend receives error
    → Shows error message to user
    → "Cannot send a proposal with no items"
```

---

## ✅ Error Handling Best Practices

### DO ✅

```typescript
// 1. Throw AppError with appropriate status
if (!exists) {
  throw new AppError(404, "404", "Proposal not found");
}

// 2. Use asyncHandler for all route handlers
router.get(
  "/",
  asyncHandler(async (req, res) => {
    // ...
  }),
);

// 3. Let validation middleware handle input validation
router.post(
  "/",
  validationMiddleware(CreateProposalSchema),
  proposalController.createProposal,
);

// 4. Specific error codes for different scenarios
throw new AppError(409, "409", "Duplicate"); // Conflict
throw new AppError(404, "404", "Not found"); // Not found
throw new AppError(422, "422", "Invalid data"); // Unprocessable
```

### DON'T ❌

```typescript
// 1. Throw generic Error
throw new Error("Something went wrong"); // No status code
// Result: 500 error (not appropriate)

// 2. Send response directly from service
res.status(500).json({ error: "..." }); // Service shouldn't access res

// 3. Forget asyncHandler
router.get("/", async (req, res) => {
  // Missing asyncHandler
  // Error not caught
});

// 4. Mix error handling styles
throw new Error("...");
res.status(400).json("...");
next(error);
// Inconsistent patterns
```

---

## 📊 Middleware Order Matters

```
CORRECT ORDER:
1. express.json()         (parse before validation)
2. CORS                   (security first)
3. Rate limiter           (protect before processing)
4. Swagger setup
5. Routes
6. errorHandler           (last, catches everything)

WRONG ORDER:
- errorHandler before routes?
  → Can't catch errors from routes

- Rate limiter after routes?
  → Too late, already processed

- express.json() after validation?
  → req.body not yet parsed
```

---

## ✅ Summary

**Middlewares & Error Handling** manage cross-cutting concerns:

- ✅ asyncHandler catches promise errors
- ✅ validationMiddleware validates input
- ✅ errorHandler formats responses (AppError + Prisma error classes)
- ✅ rateLimiter protects from abuse
- ✅ AppError class for business errors
- ✅ Consistent error responses

**Next:** See `ArchitectureOverview.md` for the proposal state machine and service layer, `LOGGING.md` for the structured logger.

---

**Created with ❤️ by** [Andrii Shaposhnikov](https://github.com/MagisterUnivers) (@MagisterUnivers) — MIT License
