# Problem Clarification & Solution Approaches

Phase: Documentation
Status: Complete
Priority: Critical
Due Date: April 18, 2026

## Key Clarifications

- A VIN is a vehicle’s **unique identifier**.
- There are two external systems:
    - Sales API
    - Service API
- The APIs may return:
    - Different data formats
    - Different response times
    - Duplicated data
    - Partial failures
- The UI must show:
    - A **single merged list**
    - The document **source (sales/service)**

## Core Challenges

- Fetching data in parallel
- Data normalization (different schemas)
- Handling duplicated, partial failures data

---

## **Solution Approaches**

### Approach 1 — Simple Parallel Aggregation

A single backend service calls both APIs in parallel and merges results.

```
Client → GET /documents?vin=XXX
              ↓
         Controller
              ↓
    Promise.all([salesApi, serviceApi])
              ↓
         Merge & Return
```

**Pros**

- Fast to implement
- Simple and easy to understand
- Meets basic requirements

**Cons**

- Fails entirely if one API fails
- No caching → repeated external calls
- No observability
- Tight coupling → not scalable
- Considered a basic/junior approach

---

### Approach 2 — Resilient Adapter Pattern + Partial Failure Handling

Introduce adapters for each external system and support partial failures.

```
Client → GET /documents?vin=XXX
              ↓
    DocumentAggregatorService
         ↙          ↘
SalesAdapter    ServiceAdapter
         ↘          ↙
    Promise.allSettled()
              ↓
    ResponseNormalizer
 (dedup + sort + source tagging)
              ↓
    AggregatedResult
```

**Pros**

- Handles partial failures gracefully
- Adapter pattern → easy to extend or replace APIs
- Clean separation of concerns
- Improved testability
- More production-ready design

**Cons**

- More complex than Approach 1
- No caching yet
- No circuit breaker for repeated failures

---

### Approach 3 — **Fault-Tolerant Aggregation with Caching & Observability**

Extend Approach 2 with resilience, performance, and observability:

- **Circuit Breaker**: Prevent cascading failures
- **Caching (TTL / Redis)**: Reduce latency and external calls
- **Structured Observability**: Logging, tracing, metrics

```
Client → Request
        ↓
     Cache Layer
   (hit → return)
        ↓ miss
Aggregator Service
   ↙            ↘
CircuitBreaker  CircuitBreaker
SalesAdapter    ServiceAdapter
        ↓
Promise.allSettled()
        ↓
Normalize + Dedup
        ↓
Cache Result
        ↓
Return + Logs (traceId, latency, status)
```

**Pros**

- Production-ready and scalable
- Strong resilience and performance
- Clear observability strategy
- High extensibility

**Cons**

- Highest implementation complexity
- Risk of over-engineering if not justified
- Requires clear assumptions (TTL, thresholds, etc.)

---

## Comparison

| Criteria | Approach 1 | Approach 2 | Approach 3 |  |
| --- | --- | --- | --- | --- |
| Implementation Speed | Fast | Medium | Slow |  |
| Resilience | None | Partial | Full |  |
| Performance | Low | Medium | High |  |
| Observability | None | Basic | Advanced |  |
| Testability | Good | Very Good | Very Good |  |

---

## Solution Approach

Use **Approach 2 as the foundation**, with selective enhancements from Approach 3:

- Add **circuit breaker**
- Add **structured logging (traceId + latency)**

Caching can be documented as a **future improvement**.

---