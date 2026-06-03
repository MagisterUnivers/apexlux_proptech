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
[6] propertyValidationMiddleware (Zod)
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

### 2. propertyValidationMiddleware - Zod Schema Validation

**Purpose:** Validate request body/params against Zod schema before controller is called.

**Implementation:**

```typescript
export const propertyValidationMiddleware =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Parse body against schema
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
  propertyValidationMiddleware(CreatePropertySchema), // Validates first
  propertyController.createNewProperty, // Only called if validation passes
);
```

**Validation Example:**

```javascript
// Request:
POST /api/v1/properties
{
  "name": "This name is way too long and exceeds the 100 character maximum",
  "managementType": "INVALID_TYPE",
  "propertyManager": "",  // Empty
  "accountant": "Jane"
}

// Zod Schema validation:
CreatePropertySchema.parse(req.body)
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
      "path": "name",
      "message": "String must contain at most 100 character(s)"
    },
    {
      "path": "managementType",
      "message": "Invalid enum value. Expected 'WEG' | 'MV'"
    },
    {
      "path": "propertyManager",
      "message": "String must contain at least 1 character(s)"
    }
  ]
}
```

**Schema Definition Example:**

```typescript
// File: property-schema.ts

export const CreatePropertySchema = z.object({
  name: z.string().max(100), // Required, max 100 chars
  managementType: z.enum(["WEG", "MV"]), // Required, 2 enum values
  propertyManager: z.string().max(100), // Required, max 100
  accountant: z.string().max(100), // Required, max 100
  divisionDeclarationUrl: z.string().max(500).nullable().optional(), // Optional, URL, max 500
  buildings: z.array(BuildingSchema).optional(), // Optional array of buildings
});

export const UpdatePropertySchema = z.object({
  name: z.string().max(100).optional(),
  managementType: z.enum(["WEG", "MV"]).optional(),
  propertyManager: z.string().max(100).optional(),
  accountant: z.string().max(100).optional(),
  divisionDeclarationUrl: z.string().max(500).nullable().optional(),
});
```

**Validation Failures Caught:**

```
1. Wrong type
   name: 123  (expected string)

2. String too long
   name: "very long name..."  (> 100 chars)

3. Invalid enum
   managementType: "INVALID"  (expected "WEG" or "MV")

4. Missing required field
   (no "name" provided)

5. Invalid URL format
   divisionDeclarationUrl: "not a url"

6. Wrong array item type
   buildings: [{ street: 123 }]  (street should be string)
```

---

### 3. errorHandler - Global Error Handler

**Purpose:** Catch and format all errors in one central place.

**Implementation:**

```typescript
export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (error instanceof AppError) {
    // Custom business logic error
    res.status(error.status).json({
      code: error.code,
      message: error.message,
    });
    return;
  }

  // Unknown/unexpected error
  console.error(error);
  res.status(500).json({
    code: "INTERNAL_ERROR",
    message: "Something went wrong",
  });
};
```

**Error Flow:**

```
Error thrown anywhere
    ↓
Service throws AppError(404, "NOT_FOUND", "Property not found")
    ↓
asyncHandler catches it
    ↓
Calls next(error)
    ↓
errorHandler receives error
    ↓
Checks: Is error instanceof AppError?
    ├─ YES: Use error.status, error.code
    │   └─ Response: 404 + { code: "NOT_FOUND", message: "..." }
    └─ NO: Use 500 (unknown error)
        └─ Response: 500 + { code: "INTERNAL_ERROR", message: "..." }
```

**Error Types Handled:**

```typescript
// 1. AppError (expected business errors)
throw new AppError(404, "404", "Property not found");
→ Response: 404 { code: "404", message: "Property not found" }

// 2. Database constraint error
await db.property.update({ invalid data })
→ Error thrown by Prisma
→ Caught by errorHandler
→ Response: 500 { code: "INTERNAL_ERROR", ... }

// 3. Unexpected null pointer
const x = null;
x.property  // ❌ TypeError
→ Caught by errorHandler
→ Response: 500

// 4. Network error
await fetch(url)  // Connection timeout
→ Caught by errorHandler
→ Response: 500
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
throw new AppError(409, "409", 'Property "Downtown" already exists');

// Caught by errorHandler
// Response: { status: 409, code: "409", message: "..." }
```

---

## 🔄 Complete Error Handling Example

### Scenario: Create Property with Duplicate Name

```
1. Frontend sends request:
   POST /api/v1/properties { name: "Downtown" }

2. Express receives and parses JSON
   → body = { name: "Downtown", ... }

3. propertyValidationMiddleware validates
   → Schema.parse(req.body)
   → Zod checks: string, max 100, etc.
   → Validation passes ✓
   → Calls next()

4. asyncHandler wraps controller
   → Calls propertyController.createNewProperty(req, res)

5. Controller extracts body
   → data = req.body

6. Controller calls service
   → await propertyService.publishNewProperty(data)

7. Service checks duplicate
   → Finds existing property with name "Downtown"
   → Throws: new AppError(409, "409", "Property \"Downtown\" already exists")

8. Error propagates up (not caught in service)
   → Promise rejects

9. asyncHandler catches rejection
   → Calls next(error)

10. errorHandler receives error
    → Checks: error instanceof AppError? YES
    → Uses error.status = 409
    → Uses error.code = "409"

11. errorHandler sends response:
    res.status(409).json({
      code: "409",
      message: 'Property "Downtown" already exists'
    })

12. Response sent to frontend
    HTTP Status: 409 Conflict
    Body: { code: "409", message: "..." }

13. Frontend receives error
    → Shows error message to user
    → "Property \"Downtown\" already exists"
```

---

## ✅ Error Handling Best Practices

### DO ✅

```typescript
// 1. Throw AppError with appropriate status
if (!exists) {
  throw new AppError(404, "404", "Property not found");
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
  propertyValidationMiddleware(Schema),
  asyncHandler(controller.method),
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
- ✅ propertyValidationMiddleware validates input
- ✅ errorHandler formats responses
- ✅ rateLimiter protects from abuse
- ✅ AppError class for business errors
- ✅ Consistent error responses

**Next:** See [PropertyService.md, BuildingService.md, UnitService.md] for implementation details.

---

**Created with ❤️ by** [Andrii Shaposhnikov](https://github.com/MagisterUnivers) (@MagisterUnivers) — MIT License
