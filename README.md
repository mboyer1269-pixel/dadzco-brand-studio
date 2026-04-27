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

```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SITE_URL=https://your-production-domain.com
```

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
