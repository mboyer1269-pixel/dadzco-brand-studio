# AI Route — Setup & Deploy Checklist

Narrow checklist to bring `supabase/functions/ai-route` online.
This function routes exactly two task types to paid providers:

| Task type         | Provider  | Model                         |
|-------------------|-----------|-------------------------------|
| `structured_task` | OpenAI    | `gpt-4.1`                     |
| `brand_review`    | Anthropic | `claude-sonnet-4-6`           |

`structured_task` has one fallback: if OpenAI fails with anything other than
a `400` (timeout after 60s, network error, `429`, `5xx`, auth/config error),
the same request is retried on **Gemini `gemini-2.5-pro`** through Google's
OpenAI-compatible endpoint. A `400` is surfaced as-is (the request itself is
invalid). `brand_review` has no fallback.

Out of scope for this setup: batch runs, client-side provider selection,
frontend callers.

---

## 1. Required secrets

Set these in **Supabase Dashboard → Project Settings → Edge Functions →
Secrets**, or via CLI:

```bash
supabase secrets set OPENAI_API_KEY=sk-...   --project-ref strthzrvmoeyvuindugk
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref strthzrvmoeyvuindugk
supabase secrets set GEMINI_API_KEY=...       --project-ref strthzrvmoeyvuindugk
```

| Secret name         | Source                | Purpose                                   |
|---------------------|-----------------------|-------------------------------------------|
| `OPENAI_API_KEY`    | platform.openai.com   | `structured_task` calls (primary)         |
| `ANTHROPIC_API_KEY` | console.anthropic.com | `brand_review` calls                      |
| `GEMINI_API_KEY`    | aistudio.google.com   | `structured_task` fallback (optional — fallback is inactive until set) |

Auto-injected by Supabase (do not set manually):
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

A placeholder template lives at
[supabase/functions/.env.example](../supabase/functions/.env.example).
Never prefix provider secrets with `VITE_`. Never commit real keys.

---

## 2. Auth model (already enforced by the function)

Layered, already in code — no action needed unless you change it:

1. `verify_jwt = true` in `supabase/config.toml` — platform rejects
   missing/invalid JWTs before the function runs.
2. `requireUserSession(req)` — rejects anon-key-only JWTs → **401**.
3. `requireAdmin(sub)` — reads `user_roles.role = 'admin'` via the
   service-role key → **403** if not admin.

**Prerequisite before first real call:** at least one row in
`user_roles` with `user_id = <your auth.users.id>` and `role = 'admin'`.

---

## 3. Deploy

```bash
supabase functions deploy ai-route --project-ref strthzrvmoeyvuindugk
```

Function config is already pinned in `supabase/config.toml`:

```toml
[functions.ai-route]
verify_jwt = true
```

---

## 4. Smoke tests

Use a **real admin user's access token** as `<ADMIN_USER_JWT>` (from
`supabase.auth.getSession()` after magic-link sign-in), not the anon key.

### 4.1 `structured_task` → OpenAI

```bash
curl -sS -X POST "https://strthzrvmoeyvuindugk.supabase.co/functions/v1/ai-route" \
  -H "Authorization: Bearer <ADMIN_USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "taskType": "structured_task",
    "messages": [
      { "role": "system", "content": "Return strict JSON." },
      { "role": "user", "content": "Return {\"ok\": true} as JSON." }
    ],
    "options": { "response_format": { "type": "json_object" } }
  }'
```

Expect: `200` with
`{ "success": true, "provider": "openai", "model": "gpt-4.1", "result": "...", "fallback_used": false }`.

If OpenAI failed and Gemini answered:
`{ "success": true, "provider": "gemini", "model": "gemini-2.5-pro", "result": "...", "fallback_used": true, "fallback_from": "openai" }`.

If both fail: `502` with
`{ "error": "All providers failed for structured_task", "status": <openai status|null>, "fallback_status": <gemini status|null> }`.
`status` stays the OpenAI status so round-table keeps its 429 / 402 messages.

### 4.2 `brand_review` → Anthropic

```bash
curl -sS -X POST "https://strthzrvmoeyvuindugk.supabase.co/functions/v1/ai-route" \
  -H "Authorization: Bearer <ADMIN_USER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "taskType": "brand_review",
    "messages": [
      { "role": "user", "content": "One sentence on minimalism." }
    ]
  }'
```

Expect: `200` with
`{ "success": true, "provider": "anthropic", "model": "claude-sonnet-4-6", "result": "..." }`.

### 4.3 Negative checks (should fail as documented)

| Request                                             | Expect |
|-----------------------------------------------------|--------|
| No `Authorization` header                           | 401    |
| Anon-key JWT only (no user session)                 | 401    |
| Real user JWT but no `user_roles` admin row         | 403    |
| Unknown `taskType`                                  | 400    |
| Missing `messages`                                  | 400    |

---

## 5. Rollback

Redeploy the previous commit:

```bash
git checkout <prev-sha> -- supabase/functions/ai-route/index.ts supabase/config.toml
supabase functions deploy ai-route --project-ref strthzrvmoeyvuindugk
```

Do **not** flip `verify_jwt = false` as a rollback — this function
calls paid providers and must stay gated.

---

## 6. What is deliberately not in this setup

- Fallback for `brand_review` (only `structured_task` falls back, to Gemini)
- Batch engine
- Client-side provider selection (secrets stay server-only)
- Frontend integration (no existing caller uses `ai-route` yet)
- Logging into `ai_generation_logs` (the former ai-gateway logged there; it has been removed — logging is a follow-up)
