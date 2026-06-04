# Logging Strategy

## Overview

The ApexLux backend uses a **custom, zero-dependency logging utility** designed for structured, readable console output during development and debugging.

**Location:** [`/backend/src/utils/logger.ts`](../src/utils/logger.ts)

## Why Custom Logger?

We chose a custom logger implementation over external libraries (Winston, Pino) because:

✅ **Zero Dependencies** - No external packages to manage  
✅ **Lightweight** - ~165 lines of code, minimal overhead  
✅ **Full Control** - Easy to extend or modify for future needs  
✅ **Clear Output** - Emoji-based visual indicators for quick scanning  
✅ **Structured** - JSON formatting for machine-readable logs

## Log Levels

The logger supports four severity levels with hierarchy-based filtering:

| Level     | Emoji | Use Case                                      | Filtered By                         |
| --------- | ----- | --------------------------------------------- | ----------------------------------- |
| **DEBUG** | 🔍    | Detailed diagnostic info (intermediate steps) | `LOG_LEVEL=DEBUG`                   |
| **INFO**  | ℹ️    | General operational info (success, start/end) | `LOG_LEVEL=DEBUG`, `INFO` (default) |
| **WARN**  | ⚠️    | Warning messages (recoverable errors)         | `LOG_LEVEL=DEBUG`, `INFO`, `WARN`   |
| **ERROR** | ❌    | Error messages (critical issues)              | Always shown                        |

## Configuration

Control logging verbosity with the `LOG_LEVEL` environment variable:

```bash
# Default - shows INFO, WARN, ERROR
npm run develop

# Show all including debug info
LOG_LEVEL=DEBUG npm run develop

# Show only warnings and errors
LOG_LEVEL=WARN npm run develop

# Production - only errors
LOG_LEVEL=ERROR npm run develop
```

## Usage

### Basic Import

```typescript
import { logger } from "@/utils/logger";

const SERVICE_NAME = "MyService";
```

### Method Signatures

All methods accept `(service: string, message: string, data?: any)`

**For errors:** `(service: string, message: string, error?: Error | unknown, data?: any)`

### Examples

#### INFO - Operation Start

```typescript
logger.info(SERVICE_NAME, "🔄 Adding item to proposal", {
  proposalId,
  category: data.category,
  title: data.title,
});
```

Console Output:

```
ℹ️  10:30:45.123 [ProposalService] 🔄 Adding item to proposal
{
  "proposalId": "clz5k...",
  "category": "DINING",
  "title": "Private Beach Dinner"
}
```

#### DEBUG - Intermediate Step

```typescript
logger.debug(SERVICE_NAME, "🔍 Validating request body...", {
  body: req.body,
});
```

Console Output:

```
🔍 10:30:45.200 [ValidationMiddleware] 🔍 Validating request body...
{
  "body": { "reservationId": "clz5k...", "notes": "VIP" }
}
```

#### WARN - Validation Issue

```typescript
logger.warn(SERVICE_NAME, "❌ Validation failed", {
  errors: [{ path: "price", message: "Too small: expected number to be >0" }],
});
```

Console Output:

```
⚠️  10:30:45.250 [ValidationMiddleware] ❌ Validation failed
{
  "errors": [{ "path": "price", "message": "Too small: expected number to be >0" }]
}
```

#### ERROR - Exception

```typescript
try {
  // ... operation
} catch (error) {
  logger.error(SERVICE_NAME, "❌ AppError", error, {
    context: "createUnit",
    operationId: "op-123",
  });
}
```

Console Output:

```
❌ 10:30:45.300 [ProposalService] ❌ AppError
{
  "context": "sendProposal",
  "proposalId": "clz5k..."
}
Stack trace:
Error: Proposal not found
    at ProposalService.sendProposal (...)
    at ProposalController.sendProposal (...)
```

## Best Practices

### 1. Include Clear Context

```typescript
// ✅ GOOD - Clear what happened and key data
logger.info(SERVICE_NAME, "✅ Proposal sent", {
  id: proposal.id,
  toEmail: proposal.reservation.member.email,
});

// ❌ AVOID - Too vague
logger.info(SERVICE_NAME, "Done");
```

### 2. Use Meaningful Emojis in Messages

```typescript
// ✅ Helpful visual indicator
logger.info(SERVICE_NAME, "🔄 Starting update operation");

// ❌ No indication what's happening
logger.info(SERVICE_NAME, "Update operation");
```

### 3. Wrap Operations in Try/Catch

```typescript
// ✅ Pattern used throughout services
public async createProposal(data: CreateProposalDto) {
  logger.info(SERVICE_NAME, "🔄 Creating proposal", {
    reservationId: data.reservationId,
  });

  const reservation = await prismaSingleton.reservation.findUnique({
    where: { id: data.reservationId },
  });
  if (!reservation) {
    throw new AppError(404, "404", "Reservation not found");
  }

  const proposal = await prismaSingleton.proposal.create({ data: { ... } });
  logger.info(SERVICE_NAME, "✅ Proposal created", { id: proposal.id });
  return proposal;
}
```

### 4. Log at Right Granularity

```typescript
// ✅ GOOD - Log data flows, decisions, results
logger.debug(SERVICE_NAME, "🔍 Validating request body...", { body });
logger.info(SERVICE_NAME, "✅ Status updated", { id, status });

// ❌ AVOID - Too verbose, logging every line
logger.debug("Incrementing counter");
logger.debug("Checking condition");
```

### 5. Include Metrics When Relevant

```typescript
// ✅ Useful for operations that compute a summary
logger.info(SERVICE_NAME, "✅ Proposal sent", {
  id: proposal.id,
  itemCount: proposal.items.length,
});

// For pagination/list operations
logger.info(SERVICE_NAME, "✅ Proposals fetched", {
  count: proposals.length,
  total: 6,
  page: 1,
});
```

## Implemented Services

All ApexLux services use structured logging:

### ProposalService

- `getAllProposals()` - Paginated list with count
- `getProposalById()` - Fetch single proposal with items
- `createProposal()` - Create DRAFT linked to reservation
- `addItemToProposal()` - Add item to DRAFT proposal
- `removeItemFromProposal()` - Remove item from DRAFT proposal
- `updateProposalStatus()` - Status transition
- `updateProposalNotes()` - Update internal notes
- `deleteProposal()` - Delete DRAFT or SENT proposal
- `sendProposal()` - Transition to SENT, create SentEmail record

### ReservationService

- `getActiveReservation()` - Fetch first upcoming reservation with member
- `getReservationById()` - Fetch reservation with member and proposals

## Format Specification

All log entries follow this format:

```
[EMOJI] [HH:MM:SS.mmm] [ServiceName] Message
{ JSON data }
```

**Example:**

```
ℹ️  10:30:45.123 [ProposalService] ✅ Proposal created
{
  "id": "clz5k9xyz123",
  "reservationId": "clz5kres456",
  "status": "DRAFT"
}
```

## Logger Instance

The logger is exported as a singleton:

```typescript
export const logger = new Logger();
```

This ensures consistent configuration and behavior across the application.

## Future Extensions

The logger utility is designed to be extensible. Potential enhancements:

- [ ] File output (rotating logs)
- [ ] Log aggregation service integration
- [ ] Request ID tracking for distributed tracing
- [ ] Performance metrics collection
- [ ] Different formats (JSON-only for production)
- [ ] Custom formatters for specific data types

## Related Documentation

- [Architecture Overview](./ArchitectureOverview.md) - System design
- [Error Handling](./MiddlewaresAndErrorHandling.md) - AppError integration
