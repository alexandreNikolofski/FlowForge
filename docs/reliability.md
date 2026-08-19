# Reliability

This document expands on FlowForge's reliability model.

## Idempotency

- `idempotencyKey` is enforced with a UNIQUE constraint in the database to prevent concurrent inserts from creating duplicate jobs.
- The application performs a pre-check for an existing `idempotencyKey` before creating a job to provide fast feedback, but the DB is the final arbiter.

## Concurrency

- Workers are configured with a per-process `WORKER_CONCURRENCY` setting (default 10).
- BullMQ coordinates job delivery; the application assumes at-least-once semantics and relies on idempotency to make processing safe.

## Worker failures

- If a worker crashes during processing, the job is retried according to the retry policy. After exhausting retries the job is moved to the DLQ for manual inspection or replay.

## Dead Letter Queue (DLQ)

- DLQ holds failed jobs for operational recovery.
- Operators can inspect DLQ entries and use the `POST /jobs/:id/replay` endpoint to re-enqueue a job after fixing upstream issues.
