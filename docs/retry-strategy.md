# Retry Strategy

FlowForge uses a deterministic, configurable retry strategy for transient errors. The default policy (used for examples and demos) is:

- Attempt 1 -> 1s
- Attempt 2 -> 5s
- Attempt 3 -> 30s
- Attempt 4 -> move to DLQ

Rationale:
- Short initial delays recover from network blips and transient third-party failures.
- Increasing backoff prevents rapid retry storms against failing downstream systems.

Implementation notes:
- The policy is defined in `src/modules/jobs/jobs.constants.ts` and used by worker logic to decide when to reattempt or send to DLQ.
- Make the policy configurable via environment variables or a feature flag in production.
