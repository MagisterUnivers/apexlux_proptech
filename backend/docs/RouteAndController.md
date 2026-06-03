# Routes & Controllers Documentation

**Complexity Level:** ⭐⭐⭐ (Moderate)

**Role:** HTTP request handling layer. Controllers extract data from requests and delegate to services. Routes map URL paths to handlers.

---

## 📋 Architecture Pattern

### Request Processing

```
HTTP Request
    ↓
Route Matching (by path and method)
    ↓
Validation Middleware (Zod schema)
    ↓
Controller Method (extract params)
    ↓
Service Method (business logic)
    ↓
Response Formatting (JSON)
    ↓
Error Handler (if error thrown)
    ↓
HTTP Response
```

### The asyncHandler Wrapper

**Problem:** Promise rejections in async route handlers crash the server.

```javascript
// ❌ Bad: No error handling
router.get("/api/data", async (req, res) => {
  const data = await db.query(); // If error → server crashes
  res.json(data);
});

// ✅ Good: asyncHandler catches errors
router.get(
  "/api/data",
  asyncHandler(async (req, res) => {
    const data = await db.query(); // Error caught → sent to errorHandler
    res.json(data);
  }),
);
```

**Implementation:**

```typescript
export const asyncHandler = (
  ctrl: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    ctrl(req, res, next).catch(next); // .catch(next) sends error to errorHandler
  };
};
```

---

## 🔑 Properties Module - Complete Example

### Route Definitions

```typescript
// File: /backend/src/modules/properties/routes/index.ts

const propertyRouter = Router();

// ✅ GET /api/v1/properties
propertyRouter.get("/", propertyController.getAllProperties);

// ✅ GET /api/v1/properties/light
propertyRouter.get("/light", propertyController.getAllPropertiesLight);

// ✅ GET /api/v1/properties/:id
propertyRouter.get("/:id", propertyController.getPropertyById);

// ✅ POST /api/v1/properties (with Zod validation)
propertyRouter.post(
  "/",
  propertyValidationMiddleware(CreatePropertySchema),
  propertyController.createNewProperty,
);

// ✅ PATCH /api/v1/properties/:id (with Zod validation)
propertyRouter.patch(
  "/:id",
  propertyValidationMiddleware(UpdatePropertySchema),
  propertyController.updateProperty,
);

// ✅ DELETE /api/v1/properties/:id
propertyRouter.delete("/:id", propertyController.deleteProperty);

export default propertyRouter;
```

### Controller Methods

```typescript
// File: /backend/src/modules/properties/controllers/property.controller.ts

class PropertyController {
  // GET /api/v1/properties
  public getPropertyById = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      const property = await propertyService.getPropertyById(id);
      res.status(200).json({ data: property });
    },
  );

  // GET /api/v1/properties?offset=0&limit=20
  public getAllProperties = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const offset = parseInt((req.query.offset as string) ?? "0");
      const limit = parseInt((req.query.limit as string) ?? "20");
      const result = await propertyService.takeAllProperties(offset, limit);
      res.status(200).json({ data: result });
    },
  );

  // GET /api/v1/properties/light
  public getAllPropertiesLight = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const result = await propertyService.takeAllPropertiesLight();
      res.status(200).json({ data: result });
    },
  );

  // POST /api/v1/properties
  public createNewProperty = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const data: CreatePropertyDto = req.body; // Already validated by middleware
      const property = await propertyService.publishNewProperty(data);
      res.status(201).json({ data: property });
    },
  );

  // PATCH /api/v1/properties/:id
  public updateProperty = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      const data: UpdatePropertyDto = req.body; // Already validated by middleware
      const updated = await propertyService.updateProperty(id, data);
      res.status(200).json({ data: updated });
    },
  );

  // DELETE /api/v1/properties/:id
  public deleteProperty = asyncHandler(
    async (req: AuthenticatedRequest, res: Response) => {
      const { id } = req.params;
      const result = await propertyService.deleteProperty(id);
      res.status(200).json({ data: result });
    },
  );
}

export const propertyController = new PropertyController();
```

---

## 🔑 Endpoint Details

### GET /api/v1/properties

**Purpose:** List all properties with pagination

**Query Parameters:**

```
offset: number (default: 0)
limit: number (default: 20)
```

**Usage Example:**

```javascript
// Page 1:
GET /api/v1/properties?offset=0&limit=20

// Page 2:
GET /api/v1/properties?offset=20&limit=20

// Page 3:
GET /api/v1/properties?offset=40&limit=20
```

**Response (200 OK):**

```javascript
{
  "data": {
    "properties": [
      {
        "id": "prop1",
        "name": "Downtown Complex",
        "managementType": "RESIDENTIAL",
        "buildings": [
          {
            "id": "build1",
            "street": "Main St",
            "units": [...]
          }
        ]
      },
      // ... more properties
    ],
    "total": 156,      // Total count for pagination UI
    "offset": 0,
    "limit": 20
  }
}
```

---

### GET /api/v1/properties/light

**Purpose:** Get all properties without relations (for dropdowns)

**Usage Example:**

```javascript
GET / api / v1 / properties / light;
```

**Response (200 OK):**

```javascript
{
  "data": [
    { "id": "prop1", "name": "Downtown Complex" },
    { "id": "prop2", "name": "Suburb Complex" },
    { "id": "prop3", "name": "Airport Complex" }
  ]
}
```

---

### GET /api/v1/properties/:id

**Purpose:** Get single property with all relations

**Path Parameter:**

```
id: string (property ID)
```

**Usage Example:**

```javascript
GET / api / v1 / properties / abc123;
```

**Response (200 OK):**

```javascript
{
  "data": {
    "id": "abc123",
    "name": "Downtown Complex",
    "managementType": "RESIDENTIAL",
    "propertyManager": "John Manager",
    "accountant": "Jane Accountant",
    "buildings": [
      {
        "id": "b1",
        "street": "Main St",
        "houseNumber": "123",
        "units": [
          { "id": "u1", "number": "101", "type": "APARTMENT", ... },
          { "id": "u2", "number": "102", "type": "APARTMENT", ... }
        ]
      }
    ]
  }
}
```

**Error Response (404 Not Found):**

```javascript
{
  "code": "404",
  "message": "Property not found"
}
```

---

### POST /api/v1/properties

**Purpose:** Create new property with nested buildings and units

**Validation:** CreatePropertySchema (Zod)

**Request Body:**

```javascript
{
  "name": string (required, max 100),
  "managementType": "RESIDENTIAL" | "COMMERCIAL" (required),
  "propertyManager": string (required),
  "accountant": string (required),
  "divisionDeclarationUrl": string (optional, URL format),
  "buildings": [
    {
      "street": string,
      "houseNumber": string,
      "units": [
        {
          "number": string,
          "type": "APARTMENT" | "PARKING" | "STORAGE",
          "floor": number,
          "entrance": string,
          "size": number (> 0),
          "coOwnershipShare": number (0-100),
          "constructionYear": number,
          "rooms": number
        }
      ]
    }
  ]
}
```

**Usage Example:**

```javascript
POST /api/v1/properties
{
  "name": "Premium Complex",
  "managementType": "RESIDENTIAL",
  "propertyManager": "John Manager",
  "accountant": "Jane Accountant",
  "buildings": [
    {
      "street": "Main Street",
      "houseNumber": "123",
      "units": [
        {
          "number": "101",
          "type": "APARTMENT",
          "floor": 1,
          "entrance": "A",
          "size": 75,
          "coOwnershipShare": 5.5,
          "constructionYear": 2020,
          "rooms": 3
        }
      ]
    }
  ]
}
```

**Response (201 Created):**

```javascript
{
  "data": {
    "id": "prop_abc123",
    "name": "Premium Complex",
    // ... full data with all relations
  }
}
```

**Error Responses:**

```javascript
// 400 Bad Request - Validation failed
{
  "message": "Validation failed",
  "errors": [
    {
      "path": "name",
      "message": "String must contain at most 100 character(s)"
    },
    {
      "path": "buildings.0.units.0.size",
      "message": "Number must be greater than 0"
    }
  ]
}

// 409 Conflict - Duplicate name
{
  "code": "409",
  "message": "Property \"Premium Complex\" already exists"
}
```

---

### PATCH /api/v1/properties/:id

**Purpose:** Update property details (partial update)

**Validation:** UpdatePropertySchema (Zod, all fields optional)

**Path Parameter:**

```
id: string (property ID)
```

**Request Body (all optional):**

```javascript
{
  "name": string,
  "managementType": string,
  "propertyManager": string,
  "accountant": string,
  "divisionDeclarationUrl": string | null
}
```

**Usage Example:**

```javascript
PATCH /api/v1/properties/abc123
{
  "name": "Updated Name",
  "propertyManager": "New Manager"
}
// Only name and propertyManager updated
```

**Response (200 OK):**

```javascript
{
  "data": {
    "id": "abc123",
    "name": "Updated Name",
    "managementType": "RESIDENTIAL",
    "propertyManager": "New Manager",  // Updated
    "accountant": "Jane Accountant",   // Unchanged
    // ... full data with relations
  }
}
```

**Error Responses:**

```javascript
// 404 Not Found
{
  "code": "404",
  "message": "Property not found"
}

// 409 Conflict (duplicate name)
{
  "code": "409",
  "message": "Property \"Updated Name\" already exists"
}
```

---

### DELETE /api/v1/properties/:id

**Purpose:** Delete property (cascade deletes buildings and units)

**Path Parameter:**

```
id: string (property ID)
```

**Usage Example:**

```javascript
DELETE / api / v1 / properties / abc123;
```

**Response (200 OK):**

```javascript
{
  "data": {
    "id": "abc123",
    "deleted": true
  }
}
```

**Error Responses:**

```javascript
// 404 Not Found
{
  "code": "404",
  "message": "Property not found"
}
```

---

## 🏗️ Building Routes (Similar Pattern)

```
POST   /api/v1/buildings           Create building (needs propertyId)
PATCH  /api/v1/buildings/:id       Update building
DELETE /api/v1/buildings/:id       Delete building
```

## 🏗️ Unit Routes (Similar Pattern)

```
POST   /api/v1/units               Create single unit
POST   /api/v1/units/bulk          Create multiple units (atomic)
PATCH  /api/v1/units/:id           Update unit
DELETE /api/v1/units/:id           Delete unit
```

---

## 🛡️ Middleware Pipeline

### Request Lifecycle for POST /api/v1/properties

```
1. Express receives request
   ├─ Parses JSON body (express.json())
   └─ Logs request

2. CORS middleware
   ├─ Checks origin in Allow-Origin list
   └─ Allows request to continue

3. Rate limiter
   ├─ Checks request rate < limit
   └─ Continues or rejects with 429

4. Route matching
   ├─ POST /api/v1/properties
   └─ Found route handler

5. propertyValidationMiddleware (Zod)
   ├─ Parse body with CreatePropertySchema
   ├─ Validates types, lengths, enums
   ├─ If valid → calls next()
   └─ If invalid → returns 400 error (request stops)

6. Controller method (PropertyController.createNewProperty)
   ├─ Wrapped in asyncHandler
   ├─ Receives req.body (already validated)
   ├─ Calls propertyService.publishNewProperty()
   ├─ If error thrown → caught by asyncHandler
   └─ If success → returns 201 response

7. Error handler (if error in step 6)
   ├─ If AppError → uses error.status
   ├─ If other Error → uses 500
   └─ Returns formatted JSON error

8. Response sent to client
```

---

## 📊 Controller Method Pattern

**All controllers follow this pattern:**

```typescript
public methodName = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    // 1. Extract parameters
    const { id } = req.params;
    const { field1, field2 } = req.body;  // Already validated!

    // 2. Call service method
    const result = await serviceInstance.methodName(id, data);

    // 3. Format response
    res.status(200).json({ data: result });

    // 4. If error thrown anywhere above:
    //    → asyncHandler catches it
    //    → Passes to errorHandler
    //    → errorHandler formats response
  }
);
```

---

## ✅ Guidelines for Adding New Endpoints

1. **Create Route Handler:**

   ```typescript
   // In routes/index.ts
   router.post("/new-path", controller.newMethod);
   ```

2. **Create Controller Method:**

   ```typescript
   public newMethod = asyncHandler(async (req, res) => {
     // Extract data
     // Call service
     // Format response
   });
   ```

3. **Add Service Method** (if needed):
   - Business logic goes in service, not controller

4. **Add Zod Validation** (if input):

   ```typescript
   router.post(
     "/new-path",
     propertyValidationMiddleware(NewSchema),
     controller.newMethod,
   );
   ```

5. **Error Handling:**
   - Throw AppError with appropriate status
   - Let asyncHandler + errorHandler catch it

---

## 📝 Response Format

### Success Response

```typescript
Endpoint that modifies:
  status: 201 (Created) or 200 (OK/Updated)
  body: { "data": result }

Endpoint that reads:
  status: 200
  body: { "data": result }
```

### Error Response

```typescript
{
  "code": string,      // Error identifier
  "message": string    // Human-readable message
}

Status codes:
  400 - Bad Request (validation failed)
  401 - Unauthorized (no auth)
  403 - Forbidden (no permission)
  404 - Not Found (resource doesn't exist)
  409 - Conflict (duplicate, constraint violation)
  422 - Unprocessable Entity (database validation)
  429 - Too Many Requests (rate limited)
  500 - Internal Server Error (unexpected error)
```

---

## ✅ Summary

**Controllers & Routes** form the HTTP layer:

- ✅ Route definitions map URLs to handlers
- ✅ Middleware validates before controller
- ✅ Controllers extract parameters
- ✅ asyncHandler catches promise errors
- ✅ Services handle business logic
- ✅ Error handler formats responses

**Next:** See [MiddlewaresAndErrorHandling.md] for validation details.

---

**Created with ❤️ by** [Andrii Shaposhnikov](https://github.com/MagisterUnivers) (@MagisterUnivers) — MIT License
