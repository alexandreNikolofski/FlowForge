# Performance

Suggested approach to benchmark FlowForge:

- Use `k6` to generate load against the API `POST /jobs` to measure enqueue throughput and API latency.
- Use separate scenarios for 100 RPS, 500 RPS, and 1000 RPS.
- Measure P50/P95/P99 for API response time and job processing latency.

Example table to publish in README after measurements:

| Load | P50 | P95 | P99 | Error Rate |
|------|-----|-----|-----|------------|
| 100 RPS | ... | ... | ... | ... |
| 500 RPS | ... | ... | ... | ... |
| 1000 RPS | ... | ... | ... | ... |

Notes:
- Run benchmarks in a controlled environment (docker compose or cloud) and report the environment specs.
- Include Grafana screenshots of the most relevant panels.
