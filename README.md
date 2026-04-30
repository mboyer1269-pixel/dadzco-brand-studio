# DADZCO · Brand OS

Système opérationnel de marque pour DADZCO | MUMZCO | APPAREL.

## Stack

- **Frontend** : React + TypeScript + Tailwind CSS + Vite
- **Backend** : Supabase (Auth, Database, Edge Functions, Storage)
- **AI** : Leonardo AI (génération visuelle), OpenAI (Round Table, CHAP)
- **Déploiement** : Vercel

## Modules

| Module | Description |
|---|---|
| HQ | Tableau de bord stratégique, KPIs, CHAP AI |
| Brand | Brand Book Hub, extraction IA des règles de marque |
| Create | Founder Drop pipeline, Round Table AI |
| Collections | Gestion des capsules et collections |
| Financial | Suivi financier et marges |
| Launch | Plan marketing, calendrier, go-live |
| Settings | Compte, apparence, ADN de marque |

## Développement local

```bash
npm install
npm run dev
```

## Variables d'environnement

Production Supabase project:

```
Dadzco
project ref: strthzrvmoeyvuindugk
URL: https://strthzrvmoeyvuindugk.supabase.co
```

The repository config is production-bound by default. Local Supabase CLI
metadata under `supabase/.temp/` may point to a staging project and must not be
committed or used as the source of truth for production deploys.

Client (safe to bundle):

```
VITE_SUPABASE_URL=https://strthzrvmoeyvuindugk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here
VITE_SITE_URL=https://dadzco-brand-studio.vercel.app
```

`VITE_SUPABASE_PUBLISHABLE_KEY` is the public browser key used by the React SPA.
Never put `SUPABASE_SERVICE_ROLE_KEY` or provider API keys in `VITE_` variables.
Use [.env.example](.env.example) for safe local placeholders. Keep real `.env`
files untracked.

`VITE_SITE_URL` must be set in Vercel (and any other deployment environment).
Without it, magic link emails embed `window.location.origin` as the redirect URL,
which will be `localhost` when a link is requested from a local dev session.

### Supabase Auth URL Configuration

In the Supabase Dashboard → Authentication → URL Configuration, set:

| Field | Value |
|---|---|
| Site URL | `https://your-production-domain.com` |
| Redirect URLs | `https://your-production-domain.com/**` |
| Redirect URLs | `http://localhost:8080/**` |

`VITE_SITE_URL` and the Supabase Site URL must match.

### Admin email/password login

Admin users must have a password set in Supabase Dashboard → Authentication → Users before using email/password login.

## Edge function secrets (server-only)

Edge Functions require server-only secrets that must never be bundled into the
client. Template and checklist:

- Secret template: [supabase/functions/.env.example](supabase/functions/.env.example)
- Deploy & smoke-test checklist: [docs/AI_ROUTE_SETUP.md](docs/AI_ROUTE_SETUP.md)

Required secrets (set in Supabase Dashboard → Edge Functions → Secrets):
`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `CHECK_GATES_INTERNAL_SECRET`.

`CHECK_GATES_INTERNAL_SECRET` protects the internal `check-gates` function and
must be sent by scheduled/internal callers through the `x-internal-secret`
header. Do not add a real value to this repository.
