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

Test suite — 27 cases across three spec files:

| File | Cases | What it tests |
|---|---|---|
| `documents.service.spec.ts` | 9 | Business logic: merge, sort, dedup, partial failure, full failure, audit log |
| `documents.controller.spec.ts` | 12 | HTTP layer: VIN validation, traceId propagation, status codes |
| `circuit-breaker.service.spec.ts` | 6 | Breaker lifecycle, state transitions, instance reuse |

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
    "salesApi":   { "status": "success", "count": 3 },
    "serviceApi": { "status": "success", "count": 3 },
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
    "salesApi":   { "status": "success", "count": 3 },
    "serviceApi": { "status": "failed", "count": 0, "reason": "Connection timeout" },
    "isPartial": true,
    "totalCount": 3
  }
}
```

---

## Architecture Decisions

### `Promise.allSettled` over `Promise.all`
Both external API calls run in parallel. `allSettled` ensures a failure in one source never cancels the other — the client receives partial data rather than a total failure. The `meta` object makes the partial state explicit and inspectable.

### Circuit Breaker (opossum)
Each adapter is wrapped in a named circuit breaker with a 3-second timeout. If a source API fails repeatedly, the breaker opens and subsequent requests fail fast — protecting both the caller and the downstream system. State is exposed at `GET /health`.

### Adapter Pattern
`SalesAdapter` and `ServiceAdapter` share a `BaseAdapter` abstract class. Swapping a mock API for a real one requires only changing the `baseUrl` env variable — no logic changes.

### Async Audit Log
PostgreSQL writes are fire-and-forget. A DB failure never impacts the document response. This is intentional: audit logging is an operational concern, not a user-facing one.

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
  "salesStatus": "success",
  "serviceStatus": "success"
}
```

Errors carry `code` strings (`VIN_INVALID`, `INTERNAL_ERROR`) for programmatic handling without stacktrace parsing.

---

## AI Collaboration Narrative

> **Guiding principle:** I am the architect. AI is the senior developer who executes to my specification. Every structural decision was made before AI wrote a single line of code.

---

### Step 1 — Understanding the domain (AI as tutor)

After reading the requirements, I used AI to deepen my understanding of the domain before touching any design decisions. Specifically, I asked AI to explain concepts I needed to be confident about:

- What VIN actually is, its structure, and why ISO 3779 excludes I, O, and Q
- How dealership systems typically separate Sales and Service data, and what kind of documents each system would own
- What "unified document view" means in the context of automotive retail

This step was about **building domain knowledge**, not making architecture decisions. I wanted to understand the business context well enough to make good assumptions — not just technically correct ones.

---

### Step 2 — Planning with Notion (no AI, structured breakdown)

With a solid understanding of the domain, I moved to planning. I used **Notion** to break the work into concrete, trackable tasks across two phases: System Design and Backend Implementation.

> Notion board: https://www.notion.so/346804d7a88e80b586e7c3e2ab9836e9

Each task was scoped small enough to be executed and verified independently. This structure served two purposes: it kept me focused on one thing at a time, and it gave AI clear, bounded specs to work against later.

---

### Step 3 — Architecture draft and critique (no AI, then AI as reviewer)

Component structure, tech stack, and API contract were drafted independently. Key decisions — Adapter pattern, `Promise.allSettled`, fire-and-forget audit writes, named circuit breakers — were all made before any AI involvement.

Once the draft was complete, I brought AI in as a reviewer — not a designer:

> *"You are a senior engineer who has shipped distributed systems in production. Here is my architecture draft. Identify the top 3 weaknesses with specific failure scenarios. Do not suggest a complete redesign."*

AI suggested four things. Two were accepted, two were rejected:

| Suggestion | Decision | Reason |
|---|---|---|
| Use `Promise.allSettled` — `Promise.all` silently loses partial data | ✅ Accept | Critical fix. Directly shaped the `meta.isPartial` response field. |
| Audit write could block response if DB is slow | ✅ Accept | Confirms fire-and-forget was the right pattern. |
| Add Redis cache with TTL for repeated VIN lookups | ❌ Reject | Over-engineered. No evidence of repeated lookups as a problem. |
| Add message queue for at-least-once audit delivery | ❌ Reject | Valid at scale, but outside scope. Noted in trade-offs. |

---

### Step 4 — System design document (AI as collaborative colleague)

Rather than writing documentation alone, I collaborated with AI the way I would with a colleague — exchanging ideas, challenging assumptions, and iterating together. We worked through each section of the system design: architecture diagram, component roles, data flow, tech stack justifications, observability strategy, and the database schema.

Once the document was complete and agreed upon, I exported it from Notion as Markdown files. This became the single source of truth for the implementation phase.

---

### Step 5 — Test cases first (TDD-first, peer review with AI)

All 27 test cases were written in plain English **before AI was asked to write any implementation code**. The test list is the contract — AI must satisfy it, not shape it.

After writing my own scenarios, I asked AI to review the list as a peer:

> *"Review this test scenario list as a senior engineer. Suggest edge cases I may have missed. Do NOT generate any code."*

AI suggested five additions. Three were accepted, two were rejected:

| AI Suggestion | Decision | Reason |
|---|---|---|
| Assert correct `totalCount` and per-source counts in `meta` | ✅ Accept | Missing explicit assertion on meta count values. |
| Audit write failure must not affect the document response | ✅ Accept | DB-down scenario — important resilience property. |
| Assert 400 for VIN with special characters | ✅ Accept | Adds one more invalid-input path not already covered. |
| Assert caching for repeated VIN lookups within TTL | ❌ Reject | No cache in this implementation — out of scope. |
| Assert 503 when circuit breaker is OPEN | ❌ Reject | CB state is observable at `/health`; 503 is not a documented contract here. |

The final list —  cases — was locked before any implementation began.

---

### Step 6 — Implementation (AI executes to contract)

I created a local repository named `document-viewer` and added the exported Notion Markdown files as a `docs/` folder. I then used **Claude Opus 4.6** as the implementation agent, with a specific onboarding instruction:

> *"Read all Markdown files in the docs/ folder. Based on that documentation, produce a complete implementation plan listing every task you need to complete, in order."*

Before allowing any code to be written, I verified the plan against the documentation multiple times — checking that AI had correctly understood the architecture, the data model, the component boundaries, and the test contract. Only after the plan was confirmed accurate did I allow execution to begin.

The standing instruction for every implementation task:

```
After implementing, run all 27 tests.
If any test fails — fix the implementation, not the test.
Only consider the task done when all tests pass.
```

Each component was given a precise spec with both positive requirements and explicit negative constraints:

```
Implement DocumentsService with:
 - Use Promise.allSettled — NOT Promise.all
 - Call auditService.log() WITHOUT await (fire-and-forget)
 - Do NOT add caching of any kind
 - Do NOT import HttpService directly
```

Negative constraints matter as much as positive ones. Without them, AI will helpfully add Redis cache, retry decorators, and other complexity that looks reasonable but violates the architecture.

---

### Step 7 — Code review (human-led, file by file)

Once AI confirmed all tests passed and I verified the terminal output was correct, I reviewed the entire codebase systematically before touching GitHub. The review order:

1. **`package.json`** — verified all required dependencies are present, no unnecessary packages, versions are pinned appropriately
2. **Test files** — read every test case to confirm none were added or removed from the locked list, and that assertions reflect real intent rather than just "code ran without throwing"
3. **DTOs and validation** — confirmed VIN regex matches ISO 3779, DTO fields are typed correctly, no extra fields leak through
4. **Interceptor** — verified traceId is generated when absent, echoed in response header, and flows correctly into request context
5. **Controller** — confirmed no business logic lives here, only routing and delegation
6. **Adapters and circuit breaker** — verified source tagging is outside the CB closure, timeout is correctly set, named instances are reused not recreated
7. **DocumentsService** — verified `allSettled`, fire-and-forget pattern has no `await`, dedup and sort logic are type-safe
8. **AuditService** — confirmed errors are swallowed silently and never propagate
9. **README** — verified setup instructions are accurate, curl examples work, all endpoints are documented

After confirming everything worked correctly and matched the design document 100%, I created the GitHub repository and pushed the code.

---

### Key learnings

- **Domain knowledge first.** Using AI to understand VIN standards and dealership data models before designing anything meant the architecture was shaped by real business context, not just technical assumptions.
- **Documentation as the source of truth.** Exporting the design doc as Markdown and giving it to AI as context produced far more accurate implementation than describing requirements in a prompt.
- **Plan verification before execution.** Having AI produce an implementation plan — and verifying it against the docs before allowing code to run — caught misunderstandings early, before they became bugs.
- **Test-first creates an unambiguous definition of done.** AI given a locked test contract produces better output than AI given an open-ended description.
- **AI as peer reviewer beats AI as test writer.** "Find what I missed" catches gaps in thinking. "Write tests for this code" describes existing behaviour.
- **Read every line before accepting.** The review found subtle issues — awaited fire-and-forget calls, type-unsafe dedup logic, generic error codes — that all tests were passing but were still wrong in intent.
