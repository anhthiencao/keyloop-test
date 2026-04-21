# Test Case Catalog

Phase: Testing
Status: Complete
Priority: Medium
Due Date: April 19, 2026

### 1. Business Logic (Documents Service)

| **Test Case** | **Scenario** | **Expected Assertion** |
| --- | --- | --- |
| **Happy Path Merge** | Data returned from both APIs. | Documents merged, `isPartial` is `false`. |
| **Sort Order** | Documents have different dates. | Sorted by `createdAt` descending (newest first). |
| **Deduplication** | Identical `documentId` from both sources. | Only 1 instance remains in the final list. |
| **Partial Failure (Sales)** | Sales API fails, Service API works. | Returns Service docs, `isPartial: true`, metadata shows Sales error. |
| **Partial Failure (Service)** | Service API fails, Sales API works. | Returns Sales docs, `isPartial: true`, metadata shows Service error. |
| **Full Failure** | Both APIs fail/timeout. | Empty documents array, `isPartial: true`, `totalCount: 0`. |
| **Fire-and-Forget Audit** | After successful/failed aggregation. | `auditService.log` called with correct `vin` and `traceId`. |

### 2. HTTP Layer & Validation (Controller)

| **Test Case** | **Scenario** | **Expected Assertion** |
| --- | --- | --- |
| **Valid VIN** | Standard 17-char alphanumeric VIN. | Status `200 OK`. |
| **Trace ID Injection** | No `x-trace-id` in request header. | Response contains a generated `x-trace-id` header. |
| **Trace ID Echo** | Custom `x-trace-id` provided in request. | Same ID echoed back in response header. |
| **Invalid Length** | VIN is too short or too long. | Status `400 Bad Request`. |
| **Forbidden Chars** | VIN contains letters `I`, `O`, or `Q`. | Status `400 Bad Request` (ISO 3779 violation). |
| **Missing Param** | Request without `vin` query parameter. | Status `400 Bad Request`. |

### 3. Resilience (Circuit Breaker)

| **Test Case** | **Scenario** | **Expected Assertion** |
| --- | --- | --- |
| **Successful Exec** | Wrapped function resolves. | Returns value, state remains `CLOSED`. |
| **Error Propagation** | Wrapped function rejects. | Breaker rethrows the same error instance. |
| **State Tracking** | Call made to unknown breaker name. | Returns `NOT_INITIALIZED` state. |
| **Instance Reuse** | Multiple calls to same named breaker. | Uses the same instance (doesn't create duplicates). |

---