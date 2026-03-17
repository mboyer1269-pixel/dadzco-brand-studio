-- Migration G: Founder's Vault V1
-- Tables: vault_configs, vault_purchases, vault_redemptions.
-- Domain 4 — never mix with Domain 3 (seals) or Domain 5 (QR).
-- V1: customer_id is a free UUID — no auth.users FK.
-- Privileged writes go through Edge Functions via service-role.
-- Service-role bypasses RLS — policies below guard client-side access only.

-- ─────────────────────────────────────────────
-- 1. vault_configs
-- ─────────────────────────────────────────────

CREATE TABLE public.vault_configs (
  id                  UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id       UUID        NOT NULL UNIQUE
                        REFERENCES public.collections(id) ON DELETE CASCADE,
  reward_sku_ref      TEXT,
                        -- loose ref to collection_items.sku — no FK by design
                        -- V1: validated in application layer, not DB constraint
  purchase_threshold  INTEGER     NOT NULL DEFAULT 3,
  is_active           BOOLEAN     NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vault_configs ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "Admin full access vault_configs"
  ON public.vault_configs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- No anon policy — vault config is internal governance, never public.

-- ─────────────────────────────────────────────
-- 2. vault_purchases (append-only ledger)
-- ─────────────────────────────────────────────

CREATE TABLE public.vault_purchases (
  id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id    UUID        NOT NULL
                     REFERENCES public.collections(id) ON DELETE RESTRICT,
  vault_config_id  UUID        NOT NULL
                     REFERENCES public.vault_configs(id) ON DELETE RESTRICT,
  customer_id      UUID        NOT NULL,
                     -- free UUID in V1 — no auth.users FK
  sku_ref          TEXT,
  amount_cad       NUMERIC(10, 2),
  counted_for_vault BOOLEAN    NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX vault_purchases_customer_id_idx     ON public.vault_purchases (customer_id);
CREATE INDEX vault_purchases_vault_config_id_idx ON public.vault_purchases (vault_config_id);

ALTER TABLE public.vault_purchases ENABLE ROW LEVEL SECURITY;

-- Admin: SELECT only from client — writes go through Edge Functions (service-role)
CREATE POLICY "Admin select vault_purchases"
  ON public.vault_purchases FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- No INSERT/UPDATE/DELETE client policy — append-only via service-role Edge Functions.
-- No anon access ever.

-- ─────────────────────────────────────────────
-- 3. vault_redemptions
-- ─────────────────────────────────────────────

CREATE TABLE public.vault_redemptions (
  id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vault_config_id  UUID        NOT NULL
                     REFERENCES public.vault_configs(id) ON DELETE RESTRICT,
  customer_id      UUID        NOT NULL,
                     -- free UUID in V1 — no auth.users FK
  redeemed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  redemption_ref   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One active redemption per customer per vault_config (V1 business rule)
  UNIQUE (vault_config_id, customer_id)
);

CREATE INDEX vault_redemptions_customer_id_idx ON public.vault_redemptions (customer_id);

ALTER TABLE public.vault_redemptions ENABLE ROW LEVEL SECURITY;

-- Admin: SELECT only — redemptions written by Edge Functions (service-role)
CREATE POLICY "Admin select vault_redemptions"
  ON public.vault_redemptions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- No anon access ever.
-- No INSERT/UPDATE/DELETE client policy — service-role Edge Functions only.
