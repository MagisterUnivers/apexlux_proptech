# Database & Prisma Documentation

**Complexity Level:** ⭐⭐⭐ (Moderate for understanding migrations)

**Role:** Data persistence layer using PostgreSQL and Prisma ORM. Handles schema definition, type safety, and migrations.

---

## 🗄️ Database Overview

### Technology Stack

- **Database:** PostgreSQL (relational)
- **ORM:** Prisma 6.0.0 (TypeScript-first)
- **Connection:** Environment variable `DATABASE_URL`
- **Driver:** @prisma/client

### Why Prisma?

```
Benefits:
✅ Type-safe queries (TypeScript)
✅ Automatic migrations
✅ Relations/includes (no manual joins)
✅ Transactions with rollback
✅ Query optimization
✅ IDE autocomplete

Alternatives considered:
❌ Raw SQL - error-prone, no types
❌ TypeORM - more boilerplate
❌ Sequelize - less type-safe
```

---

## 📊 Schema Overview

### Entity Relationship Diagram (ERD)

```
Property (1)
├── id (UUID)
├── name (String, unique)
├── managementType (Enum: WEG, MV)
├── propertyManager (String)
├── accountant (String)
├── divisionDeclarationUrl (String, optional)
└── buildings (Building[])
         ↓
    Building (N:1 Property)
    ├── id (UUID)
    ├── street (String)
    ├── houseNumber (String)
    ├── propertyId (FK → Property)
    ├── property (Property) [relation]
    └── units (Unit[])
         ↓
    Unit (N:1 Building)
    ├── id (UUID)
    ├── number (String)
    ├── type (Enum: APARTMENT, OFFICE, GARDEN, PARKING)
    ├── floor (String)
    ├── entrance (String)
    ├── size (Float, m²)
    ├── coOwnershipShare (Decimal, %)
    ├── constructionYear (Int, YYYY)
    ├── rooms (Int)
    ├── buildingId (FK → Building)
    └── building (Building) [relation]

Cascade delete:
Delete Property → Deletes Buildings → Deletes Units
```

---

## 📋 Schema File Breakdown

### File: `backend/prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Generator:**

- Generates `@prisma/client` TypeScript types
- Provides type-safe query methods

**Datasource:**

- PostgreSQL provider
- Connection URL from `.env` file
- Example: `postgresql://user:password@localhost:5432/database_name`

---

## 🔑 Models & Fields

### Property Model

```prisma
model Property {
  id                     String         @id @default(cuid())
  managementType         ManagementType
  name                   String         @db.VarChar(100)
  propertyManager        String         @db.VarChar(100)
  accountant             String         @db.VarChar(100)
  divisionDeclarationUrl String?        @db.VarChar(500)
  buildings              Building[]
  createdAt              DateTime       @default(now())
  updatedAt              DateTime       @updatedAt
}

enum ManagementType {
  WEG
  MV
}
```

**Field Explanations:**

| Field                    | Type       | Constraints       | Purpose                                  |
| ------------------------ | ---------- | ----------------- | ---------------------------------------- |
| `id`                     | String     | @id, CUID         | Unique identifier                        |
| `managementType`         | Enum       | Required          | Building type (WEG=apartment, MV=office) |
| `name`                   | String     | Max 100           | Property name (displayed to users)       |
| `propertyManager`        | String     | Max 100           | Contact name                             |
| `accountant`             | String     | Max 100           | Accounting contact                       |
| `divisionDeclarationUrl` | String?    | Optional, max 500 | URL to document                          |
| `buildings`              | Building[] | Relation (1:N)    | All buildings in property                |
| `createdAt`              | DateTime   | Auto-set          | ISO timestamp                            |
| `updatedAt`              | DateTime   | Auto-update       | Updated on any change                    |

**Example Record:**

```javascript
{
  id: "clxyz123",
  managementType: "WEG",
  name: "Downtown Complex",
  propertyManager: "John Manager",
  accountant: "Jane Smith",
  divisionDeclarationUrl: "https://...",
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-02-20T14:45:00Z",
  // buildings: [Building[], Building[]] - Not loaded unless explicitly included
}
```

---

### Building Model

```prisma
model Building {
  id          String    @id @default(cuid())
  street      String    @db.VarChar(150)
  houseNumber String    @db.VarChar(10)
  propertyId  String
  property    Property  @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  units       Unit[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

**Key Relations:**

```
propertyId (Foreign Key)
  └─ References Property.id
  └─ onDelete: Cascade
     (When property deleted → this building deleted)

property (Relation Object)
  └─ Can access: building.property.name, etc.

units (Relation Array)
  └─ All units in this building
```

**Cascade Behavior:**

```
DELETE FROM properties WHERE id = "prop123"
  ↓
Database trigger: Find all buildings with propertyId = "prop123"
  ↓
For each building: DELETE FROM buildings
  ↓
Database trigger: Find all units with buildingId = "building123"
  ↓
For each unit: DELETE FROM units
  ↓
All cascades complete
```

---

### Unit Model

```prisma
model Unit {
  id               String    @id @default(cuid())
  number           String    @db.VarChar(20)
  type             UnitType
  floor            String    @db.VarChar(20)
  entrance         String    @db.VarChar(20)
  size             Float
  coOwnershipShare Decimal   @db.Decimal(10, 4)
  constructionYear Int
  rooms            Int
  buildingId       String
  building         Building  @relation(fields: [buildingId], references: [id], onDelete: Cascade)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}

enum UnitType {
  APARTMENT
  OFFICE
  GARDEN
  PARKING
}
```

**Field Details:**

| Field              | Type        | Range                              | Purpose                     |
| ------------------ | ----------- | ---------------------------------- | --------------------------- |
| `number`           | String      | "101", "A2", etc.                  | Unit identifier in building |
| `type`             | Enum        | APARTMENT\|OFFICE\|GARDEN\|PARKING | Unit classification         |
| `floor`            | String      | "1", "G", "B1", etc.               | Floor level                 |
| `entrance`         | String      | "A", "B", etc.                     | Building entrance           |
| `size`             | Float       | > 0                                | Square meters               |
| `coOwnershipShare` | Decimal     | 0-100                              | Ownership percentage        |
| `constructionYear` | Int         | YYYY                               | Year built                  |
| `rooms`            | Int         | ≥ 0                                | Number of rooms             |
| `buildingId`       | String (FK) | —                                  | References building         |

**Data Type Specifics:**

```prisma
size: Float
  └─ 75.5 m²
  └─ Precision: ±1e-10

coOwnershipShare: Decimal @db.Decimal(10, 4)
  └─ Total 10 digits, 4 after decimal
  └─ Example: 5.2500 (5.25%)
  └─ Prevents rounding float errors

constructionYear: Int
  └─ 2020, 1995, 2024, etc.

rooms: Int
  └─ 0 (studio/parking), 1, 2, 3, 4+, etc.
```

---

## 🔄 Prisma Operations

### Prisma Client Singleton

**File:** `backend/src/client/prisma.ts`

```typescript
import { PrismaClient } from "@prisma/client";

export const prismaSingleton = new PrismaClient();
```

**Why Singleton?**

```
❌ Bad: Create new PrismaClient every request
new PrismaClient()  // New connection pool each time
new PrismaClient()  // Another new pool
// Results in 100s of connections → DB connection limit exceeded

✅ Good: Reuse single instance
const prisma = new PrismaClient()  // Once at startup
// All requests reuse same connection pool
```

### Query Examples

**Create:**

```typescript
const property = await prismaSingleton.property.create({
  data: {
    name: "Downtown",
    managementType: "WEG",
    // ...
  },
});
```

**Read Single:**

```typescript
const property = await prismaSingleton.property.findUnique({
  where: { id: "prop123" },
  include: { buildings: { include: { units: true } } },
});
```

**Read Multiple:**

```typescript
const properties = await prismaSingleton.property.findMany({
  skip: 0,
  take: 20,
  orderBy: { createdAt: "desc" },
  include: { buildings: true },
});
```

**Update:**

```typescript
const updated = await prismaSingleton.property.update({
  where: { id: "prop123" },
  data: { name: "New Name" },
  include: { buildings: true },
});
```

**Delete:**

```typescript
await prismaSingleton.property.delete({
  where: { id: "prop123" },
  // Cascade deletes buildings and units automatically
});
```

---

## 💾 Transactions

### Atomic Operations

**Concept:** Multiple database operations that must all succeed or all fail.

**Example: Create Property with Nested Data**

```typescript
const result = await prismaSingleton.$transaction(async (tx) => {
  // All operations use 'tx' (transaction context)

  // Check for duplicate
  const existing = await tx.property.findFirst({
    where: { name: "Downtown" },
  });
  if (existing) throw new Error("Duplicate");

  // Create property
  const property = await tx.property.create({
    data: { name: "Downtown", ... },
  });

  // Create buildings (related to property)
  for (const buildingData of data.buildings) {
    await tx.building.create({
      data: {
        street: buildingData.street,
        propertyId: property.id,  // Link to property
      },
    });
  }

  return property;
});

// If any operation fails:
// ├─ Error thrown and caught
// ├─ Transaction automatically rolled back
// └─ No partial data in database
```

**Transaction Guarantees:**

```
BEGIN TRANSACTION
├─ Step 1: Execute
├─ Step 2: Execute
├─ Step 3: Execute
├─ ...all steps succeed?
│  ├─ YES → COMMIT (all changes permanent)
│  └─ NO → ROLLBACK (undo all changes)
└─ Either:
   ├─ All applied, or
   └─ None applied
   (Atomic: all-or-nothing)
```

### Parallel Transactions (for performance)

```typescript
const [properties, total] = await prismaSingleton.$transaction([
  // Query 1: Fetch paginated results
  prismaSingleton.property.findMany({
    skip: 0,
    take: 20,
  }),

  // Query 2: Count total (in parallel)
  prismaSingleton.property.count(),
]);

// Both queries executed in parallel
// Results: [properties, total]
// Faster than sequential: findMany then count
```

---

## 📦 Migrations

### Migration Files

**Location:** `backend/prisma/migrations/`

**File Naming:** `[timestamp]_[description]/migration.sql`

**Example:**

```
migrations/
├── 20240101120000_initial_schema/
│   └── migration.sql
├── 20240115140000_add_division_url/
│   └── migration.sql
└── 20240220150000_update_unit_type_enum/
    └── migration.sql
```

### Running Migrations

**Development (with Prisma Studio):**

```bash
npm run db:dev
# Or: prisma migrate dev --name "description"
```

**Steps:**

1. Detects changes in schema.prisma
2. Generates new migration file
3. Applies to development database
4. Regenerates Prisma client

**Production:**

```bash
npx prisma migrate deploy
```

**Steps:**

1. Applies all pending migrations
2. Updates \_prisma_migrations table
3. No code generation

### Example Migration (SQL)

```sql
-- (auto-generated, human-readable for audit)

-- CreateTable "Property"
CREATE TABLE "Property" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "managementType" TEXT NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "propertyManager" VARCHAR(100) NOT NULL,
  "accountant" VARCHAR(100) NOT NULL,
  "divisionDeclarationUrl" VARCHAR(500),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Property_name_key" UNIQUE ("name")
);

-- CreateTable "Building"
CREATE TABLE "Building" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "street" VARCHAR(150) NOT NULL,
  "houseNumber" VARCHAR(10) NOT NULL,
  "propertyId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Building_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable "Unit"
CREATE TABLE "Unit" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "number" VARCHAR(20) NOT NULL,
  "type" TEXT NOT NULL,
  "floor" VARCHAR(20) NOT NULL,
  "entrance" VARCHAR(20) NOT NULL,
  "size" DOUBLE PRECISION NOT NULL,
  "coOwnershipShare" DECIMAL(10,4) NOT NULL,
  "constructionYear" INTEGER NOT NULL,
  "rooms" INTEGER NOT NULL,
  "buildingId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Unit_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Building_propertyId_idx" ON "Building"("propertyId");
CREATE INDEX "Unit_buildingId_idx" ON "Unit"("buildingId");
```

---

## 🔍 Database Queries

### SELECT Examples

```sql
-- All properties with counts
SELECT p.*, COUNT(DISTINCT b.id) as building_count, COUNT(u.id) as unit_count
FROM Property p
LEFT JOIN Building b ON p.id = b.propertyId
LEFT JOIN Unit u ON b.id = u.buildingId
GROUP BY p.id;

-- Buildings by property
SELECT b.* FROM Building b WHERE b.propertyId = $1;

-- Units in building
SELECT u.* FROM Unit u WHERE u.buildingId = $1;
```

### Indexes

Prisma automatically creates indexes on:

- Foreign keys (propertyId in Building, buildingId in Unit)
- @id fields
- Explicitly defined @unique fields

**Result:** Fast lookups, foreign key enforcement, cascade performance

---

## 🚨 Common Issues & Solutions

### Issue 1: Connection Pool Exhausted

**Symptom:**

```
Error: sorry, too many clients already
```

**Cause:** Creating multiple PrismaClient instances

**Solution:**

```typescript
// ❌ Wrong
import { PrismaClient } from "@prisma/client";
export const prisma = new PrismaClient(); // Per file

// ✅ Right
// Use prismaSingleton imported from client/prisma.ts
```

### Issue 2: Cascading Delete Not Working

**Problem:** Delete property, but buildings remain

**Cause:** Missing `onDelete: Cascade` in schema

**Solution:**

```prisma
// ✅ Correct
model Building {
  propertyId  String
  property    Property  @relation(fields: [propertyId], references: [id], onDelete: Cascade)
}

// Then run migration:
// prisma migrate dev --name "add_cascade_delete"
```

### Issue 3: Type Mismatch (Float vs Decimal)

**Problem:** Size field stores 75.5, retrieved as "75.5" (string)

**Cause:** Decimal(10,4) in schema requires explicit handling

**Solution:**

```typescript
// Store as Float in TypeScript
size: 75.5;

// When querying Decimal field:
const unit = await prisma.unit.findUnique({ where: { id } });
const share = Number(unit.coOwnershipShare); // Convert to number
```

---

## 📊 Performance Optimization

### N+1 Query Problem (Bad)

```typescript
// ❌ 1 + N queries
const properties = await prisma.property.findMany();
for (const prop of properties) {
  prop.buildings = await prisma.building.findMany({
    where: { propertyId: prop.id },
  });
}
// If 100 properties → 101 queries (slow!)
```

### Solution: Relations (Good)

```typescript
// ✅ 1 query
const properties = await prisma.property.findMany({
  include: { buildings: true }, // Join in single query
});
// 100 properties returned with buildings included
```

### Deep Relations

```typescript
// ✅ Single query, deep nesting
const properties = await prisma.property.findMany({
  include: {
    buildings: {
      include: { units: true },
    },
  },
});
// Returns: Properties → Buildings → Units
```

---

## ✅ Summary

**Database & Prisma** provides type-safe data access:

- ✅ PostgreSQL for reliability
- ✅ Prisma for type safety
- ✅ Singleton client for connection pooling
- ✅ Transactions for atomicity
- ✅ Migrations for schema versioning
- ✅ Cascade delete for referential integrity
- ✅ Relations/includes for query optimization

**Next:** See service documentation for transaction examples.

---

**Created with ❤️ by** [Andrii Shaposhnikov](https://github.com/MagisterUnivers) (@MagisterUnivers) — MIT License
