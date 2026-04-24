# Database Schema Design

Phase: System Design
Status: Complete
Priority: Critical
Due Date: April 19, 2026

| **Column** | **Type** | **Nullable** | **Purpose** |
| --- | --- | --- | --- |
| **id** | UUID | No | Primary key, auto-generated. |
| **trace_id** | UUID | No | Correlates the record to a specific HTTP request for debugging. |
| **vin** | CHAR(17) | No | The 17-char VIN searched (ISO 3779 standard). |
| **requested_at** | TIMESTAMPTZ | No | Exact timestamp with timezone, set by DB to avoid clock skew. |
| **duration_ms** | INTEGER | Yes | Total wall-clock time for latency analysis (P95/P99). |
| **sales_status** | VARCHAR(16) | Yes | Outcome of Sales API: `success` or `failed`. |
| **sales_count** | SMALLINT | Yes | Number of documents from Sales API (NULL if failed). |
| **sales_error** | TEXT | Yes | Error message captured if the Sales API call failed. |
| **service_status** | VARCHAR(16) | Yes | Outcome of Service API: `success` or `failed`. |
| **service_count** | SMALLINT | Yes | Number of documents from Service API. |
| **service_error** | TEXT | Yes | Error message captured if the Service API call failed. |
| **total_count** | SMALLINT | Yes | Final count of deduplicated documents returned to the client. |
| **is_partial** | BOOLEAN | No | `TRUE` if either API failed. Used to track partial failure rates. |