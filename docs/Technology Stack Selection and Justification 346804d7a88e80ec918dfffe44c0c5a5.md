# Technology Stack Selection and Justification

Phase: System Design
Status: Complete
Priority: Critical
Due Date: April 19, 2026
Notes: Document chosen technologies for backend (Node.js/Express), frontend (React), database (PostgreSQL), containerization (Docker), and testing (Jest). Include rationale for each choice.
Technology: Docker, Jest, Node.js, PostgreSQL, React, TypeScript

| **Category** | **Technology** | **Justification** |
| --- | --- | --- |
| **Framework** | NestJS 10 | Dependency injection, modular architecture, and built-in testing support. Mirrors familiar patterns from existing work (Dopamint backend). CLI scaffolding accelerates setup without sacrificing structure. |
| **Language** | TypeScript 5 | Strict null checks and `noImplicitAny` enforce correctness at compile time. |
| **HTTP Client** | @nestjs/axios | Thin RxJS-based wrapper over Axios. Supports interceptors for request tracing, configurable timeouts per call, and clean integration with the NestJS DI container. |
| **Circuit Breaker** | opossum 8 | Production-grade circuit breaker with named instances and event hooks (open/close/halfOpen). Event hooks feed directly into the structured logger and health endpoint. |
| **ORM / Database** | TypeORM + PostgreSQL 16 | TypeORM decorators define the schema as code, eliminating the need for initial migration files. PostgreSQL provides ACID guarantees for audit log integrity and supports analytical queries. |
| **Validation** | class-validator + class-transformer | VIN validation (ISO 3779) declared as a class decorator on the DTO. ValidationPipe runs globally so the controller never receives invalid input. |
| **Config** | @nestjs/config | All external URLs, DB credentials, and port numbers are read from environment variables. No hardcoded values in source; includes `.env.example` for documentation. |
| **Logging** | NestJS Logger (pino-compatible) | Structured JSON log objects include `traceId`, `vin`, and `latency_ms` on every request. Machine-readable format enables easy log aggregation (Datadog, ELK). |
| **API Documentation** | @nestjs/swagger | OpenAPI spec auto-generated from DTOs and controller decorators. Eliminates documentation drift as the spec always reflects the live code. |
| **Testing** | Jest + Supertest | Jest is the NestJS-native test runner. Supertest enables full HTTP-layer integration tests without starting a real server. |