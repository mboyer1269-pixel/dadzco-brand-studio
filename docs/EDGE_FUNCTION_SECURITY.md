# Edge Function Security Notes

This document records the final intentional `verify_jwt = false` Edge
Function states after the Edge Function hardening sequence.

These entries are not accidental public holes. Each remaining
`verify_jwt = false` function has a deliberate protection model or is disabled
before privileged work can run.

| Function | verify_jwt | Current state | Protection model | Why false is intentional | Before changing |
|---|---:|---|---|---|---|
| check-gates | false | Internal/scheduled | x-internal-secret + CHECK_GATES_INTERNAL_SECRET | Scheduled/internal jobs do not use user JWTs | Keep/rotate secret; configure scheduler intentionally |
| create-export-pack | false | Disabled/no-op | Immediate 503 before privileged work | Export flow is not reviewed; function returns before service-role/export/lifecycle work | Design export flow, ownership/admin model, lifecycle path |
| ai-gateway | false | Disabled/no-op | Immediate 503 before provider/service-role/logging work | AI routing strategy is not reviewed; function returns before provider calls/log writes | Decide ai-route vs ai-gateway strategy, provider model, logging/rate limits |

## Guardrails

- `check-gates` must not be invoked without `x-internal-secret`.
- `CHECK_GATES_INTERNAL_SECRET` must be configured as a Supabase Edge Function
  secret before any scheduled or internal `check-gates` invocation.
- `create-export-pack` must not be re-enabled until the export workflow,
  ownership/admin model, and lifecycle path are reviewed.
- `ai-gateway` must not be re-enabled until the AI routing strategy, provider
  model, logging, and rate limits are reviewed.
- Future changes to these states require a focused PR with tests.

## Review Checklist For Future Changes

Before changing any of these functions from the current state:

1. Confirm the intended caller model.
2. Confirm whether the caller can provide a user JWT.
3. Confirm whether service-role access, DB writes, storage access, or paid
   provider calls can run.
4. Add or update focused regression tests proving unauthorized callers cannot
   reach privileged work.
5. Keep config changes limited to the target function.
