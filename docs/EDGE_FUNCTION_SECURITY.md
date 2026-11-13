# Edge Function Security Notes

This document records the final intentional `verify_jwt = false` Edge
Function states after the Edge Function hardening sequence.

These entries are not accidental public holes. Each remaining
`verify_jwt = false` function has a deliberate protection model or is disabled
before privileged work can run.

| Function | verify_jwt | Current state | Protection model | Why false is intentional | Before changing |
|---|---:|---|---|---|---|
| check-gates | false | Internal/scheduled | x-internal-secret + CHECK_GATES_INTERNAL_SECRET | Scheduled/internal jobs do not use user JWTs | Keep/rotate secret; configure scheduler intentionally |

## Resolved entries (fix/v1-launch-readiness)

| Function | verify_jwt | State | Protection model |
|---|---:|---|---|
| create-export-pack | true | Re-enabled | Platform JWT + `requireUserSession` + `requireAdmin` (`_shared/auth.ts`), collection ownership, all 3 seals approved. Never writes `lifecycle_status` / `status` — lifecycle transitions stay in `lifecycle-gate`. |
| ai-gateway | — | Removed | Function, config entry, and dead client module (`src/lib/ai-gateway.ts`) deleted. All AI routing goes through `ai-route`. Run `supabase functions delete ai-gateway --project-ref strthzrvmoeyvuindugk` to remove the deployed copy. |

## Guardrails

- `check-gates` must not be invoked without `x-internal-secret`.
- `CHECK_GATES_INTERNAL_SECRET` must be configured as a Supabase Edge Function
  secret before any scheduled or internal `check-gates` invocation.
- `create-export-pack` must keep auth + admin checks before reading the request
  body, and must keep the 3-seal gate before any write.
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
