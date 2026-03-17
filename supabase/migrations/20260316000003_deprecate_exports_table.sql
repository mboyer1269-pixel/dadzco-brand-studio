-- Migration C: Deprecate exports table
--
-- The exports table is superseded by export_packs / export_pack_items.
-- No data is dropped. No structure is changed.
-- This migration records the deprecation at the database level only.

COMMENT ON TABLE public.exports IS
  'DEPRECATED — superseded by export_packs and export_pack_items. '
  'Do not write new rows to this table. '
  'Use export_packs (collection-scoped, versioned, with manifest) instead.';

COMMENT ON COLUMN public.exports.status IS
  'DEPRECATED — status field on a deprecated table. '
  'See export_packs.status for the canonical export status.';
