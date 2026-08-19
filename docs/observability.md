# Observability

FlowForge exposes Prometheus metrics and ships example Grafana provisioning for dashboards.

Recommended metrics:

- `flowforge_jobs_total`
- `flowforge_jobs_completed_total`
- `flowforge_jobs_failed_total`
- `flowforge_job_processing_duration_seconds`
- `flowforge_queue_waiting_jobs`

Suggested dashboards:
- Throughput and success rate panel
- Failed jobs and DLQ panel
- Job processing latency (P50/P95/P99)

Tracing:
- Consider adding OpenTelemetry tracing after the system is stable to provide distributed traces across API → queue → worker → DB flows.
