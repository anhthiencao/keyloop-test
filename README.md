# Unified Document Viewer — Keyloop Technical Assessment

**Scenario D · Backend Implementation**

A NestJS backend that aggregates vehicle documents from two independent dealership systems (Sales and Service) via a single VIN search. Built for resilience: parallel requests, circuit breakers, partial failure support, and structured observability.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment config
cp .env.example .env

# 3. Start PostgreSQL (Docker)
docker run -d \
  --name keyloop-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=document_viewer \
  -p 5432:5432 \
  postgres:16-alpine

# 4. Run the application
npm run start:dev
```

The app exposes:
- `GET /documents?vin=<VIN>` — main aggregation endpoint
- `GET /health` — health check with circuit breaker states
- `GET /api` — Swagger UI (OpenAPI spec)
- `GET /mock/sales/documents?vin=<VIN>` — mock Sales System API
- `GET /mock/service/documents?vin=<VIN>` — mock Service System API

---

## Running Tests

```bash
# All tests
npm test

# With coverage report
npm run test:cov

# Watch mode
npm test -- --watch
```

Test suite covers:

| File | What it tests |
|---|---|
| `documents.service.spec.ts` | Core business logic: merge, dedup, sort, partial failure, audit logging |
| `documents.controller.spec.ts` | HTTP layer: VIN validation, traceId propagation, status codes |
| `circuit-breaker.service.spec.ts` | Breaker lifecycle, state transitions, reuse |

---

## Example Request

```bash
# Happy path
curl "http://localhost:3000/documents?vin=1HGCM82633A123456"

# With custom traceId
curl -H "x-trace-id: my-trace-001" \
  "http://localhost:3000/documents?vin=1HGCM82633A123456"

# Health check (circuit breaker states)
curl "http://localhost:3000/health"
```

### Example Response

```json
{
  "traceId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "documents": [
    {
      "id": "service-1HGCM82633A123456-001",
      "vin": "1HGCM82633A123456",
      "title": "Service History — 10,000 km",
      "source": "service",
      "createdAt": "2024-06-15T11:00:00Z",
      "url": "https://storage.example.com/service/..."
    },
    {
      "id": "sales-1HGCM82633A123456-001",
      "vin": "1HGCM82633A123456",
      "title": "Purchase Agreement",
      "source": "sales",
      "createdAt": "2024-03-10T09:00:00Z"
    }
  ],
  "meta": {
    "salesApi":   { "status": "fulfilled", "count": 3 },
    "serviceApi": { "status": "fulfilled", "count": 3 },
    "isPartial": false,
    "totalCount": 6
  }
}
```

### Partial Failure Response

When one source is unavailable, documents from the healthy source are still returned:

```json
{
  "traceId": "...",
  "documents": [...],
  "meta": {
    "salesApi":   { "status": "fulfilled", "count": 3 },
    "serviceApi": { "status": "rejected", "count": 0, "reason": "Connection timeout" },
    "isPartial": true,
    "totalCount": 3
  }
}
```

---

## Architecture Decisions

### `Promise.allSettled` over `Promise.all`
Both external API calls run in parallel. Using `allSettled` instead of `all` ensures that a failure in one source never cancels the other — the client receives partial data rather than a total failure. The `meta` object in the response makes the partial state explicit and inspectable.

### Circuit Breaker (opossum)
Each adapter is wrapped in a named circuit breaker with a 3-second timeout. If a source API fails repeatedly, the breaker opens and subsequent requests fail fast (no waiting for timeout), protecting both the caller and the downstream system. State is exposed at `GET /health`.

### Adapter Pattern
`SalesAdapter` and `ServiceAdapter` share a `BaseAdapter` abstract class. This means swapping a mock API for a real one requires only changing the `baseUrl` env variable — no logic changes.

### Async Audit Log
PostgreSQL writes are fire-and-forget. A DB failure never impacts the document response. This is intentional: the audit log is an operational concern, not a user-facing one.

---

## Observability

Every request produces a structured log entry:

```json
{
  "traceId": "f47ac10b-...",
  "vin": "1HGCM82633A123456",
  "latency_ms": 312,
  "totalCount": 6,
  "isPartial": false,
  "salesStatus": "fulfilled",
  "serviceStatus": "fulfilled"
}
```

Errors carry `code` strings (`VIN_INVALID`, `INTERNAL_ERROR`) for programmatic handling without stacktrace parsing.

---

## AI Collaboration Narrative

### Strategy
AI was used as a **senior reviewer and executor**, never as the architect. Every structural decision (adapter pattern, `allSettled` over `all`, fire-and-forget audit log, circuit breaker placement) was made independently before any AI prompt was issued.

### Phase 1 — Design critique
After drafting the architecture, I prompted:
> *"You are a senior engineer who has shipped distributed systems in production. Here is my architecture draft. Identify the top 3 weaknesses with specific failure scenarios."*

The most useful output: AI flagged that `Promise.all` would silently discard partial data — which directly led to the `allSettled` + `meta.isPartial` design. It also pointed out the audit write could block the main response, which led to the fire-and-forget pattern.

Redis caching was suggested by AI and **rejected** — over-engineered for this scope. Documented as future improvement instead.

### Phase 2 — Implementation
AI generated boilerplate for each file given a precise spec: interface contracts, constructor signatures, and explicit constraints. Every generated file was read line-by-line before acceptance. Approximately 30% of generated code was rewritten — primarily error handling paths, the deduplication logic, and test scenario coverage.

### Phase 3 — Tests
Test *scenarios* were defined manually first (happy path, partial failure, full failure, dedup, sort, audit log). AI generated the boilerplate structure. Each assertion was verified against the actual service logic — AI-generated tests often missed the `isPartial` flag and the audit fire-and-forget timing (required `await Promise.resolve()` flush).

### Key Learning
AI is fastest at scaffolding and slowest at understanding intent. The most valuable prompts were constraints-first: *"implement X, given these interfaces, these rules, and do NOT do Y"* produced far better output than open-ended requests.
