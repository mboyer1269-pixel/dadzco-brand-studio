import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const REQUIRED_SEAL_TYPES = ["brand_dna", "finance_gate", "production_ready"] as const;
const INACTIVE_STATUSES = ["idea", "exported"] as const;

export interface HQMetrics {
  activeCapsules: number | null;
  avgMargin: number | null;
  sealCoverage: number | null;
  openAlerts: number | null;
  errors: {
    activeCapsules?: string;
    avgMargin?: string;
    sealCoverage?: string;
    openAlerts?: string;
  };
  isLoading: boolean;
}

const INITIAL: HQMetrics = {
  activeCapsules: null,
  avgMargin: null,
  sealCoverage: null,
  openAlerts: null,
  errors: {},
  isLoading: true,
};

export function useHQMetrics(): HQMetrics {
  const [state, setState] = useState<HQMetrics>(INITIAL);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [collectionsResp, itemsResp, sealsResp, alertsResp] =
          await Promise.allSettled([
            supabase.from("collections").select("id, lifecycle_status"),
            supabase
              .from("collection_items")
              .select("margin")
              .not("margin", "is", null),
            supabase
              .from("collection_seals")
              .select("collection_id, seal_type, status")
              .eq("status", "approved"),
            supabase
              .from("strategic_alerts")
              .select("*", { count: "exact", head: true })
              .eq("is_dismissed", false),
          ]);

        if (cancelled) return;

        const next: HQMetrics = {
          activeCapsules: null,
          avgMargin: null,
          sealCoverage: null,
          openAlerts: null,
          errors: {},
          isLoading: false,
        };

        // Active capsules (+ capture ids for seal coverage)
        let activeIds: string[] = [];
        if (collectionsResp.status === "fulfilled" && !collectionsResp.value.error) {
          const rows = collectionsResp.value.data ?? [];
          activeIds = rows
            .filter(
              (r) =>
                r.lifecycle_status != null &&
                !INACTIVE_STATUSES.includes(
                  r.lifecycle_status as (typeof INACTIVE_STATUSES)[number]
                )
            )
            .map((r) => r.id as string);
          next.activeCapsules = activeIds.length;
        } else {
          next.errors.activeCapsules =
            collectionsResp.status === "rejected"
              ? String(collectionsResp.reason)
              : collectionsResp.value.error?.message ?? "Failed to load capsules";
        }

        // Avg margin (null if no items have margin data)
        if (itemsResp.status === "fulfilled" && !itemsResp.value.error) {
          const margins = (itemsResp.value.data ?? [])
            .map((r) => Number(r.margin))
            .filter((m) => Number.isFinite(m));
          if (margins.length > 0) {
            next.avgMargin =
              margins.reduce((a, b) => a + b, 0) / margins.length;
          }
        } else {
          next.errors.avgMargin =
            itemsResp.status === "rejected"
              ? String(itemsResp.reason)
              : itemsResp.value.error?.message ?? "Failed to load margins";
        }

        // Seal coverage: % of active collections with all 3 required seals approved
        if (sealsResp.status === "fulfilled" && !sealsResp.value.error) {
          if (!next.errors.activeCapsules) {
            if (activeIds.length === 0) {
              next.sealCoverage = 0;
            } else {
              const activeIdSet = new Set(activeIds);
              const approvedByCollection: Record<string, Set<string>> = {};
              for (const row of sealsResp.value.data ?? []) {
                const cid = row.collection_id as string;
                const st = row.seal_type as string;
                if (!activeIdSet.has(cid)) continue;
                if (
                  !REQUIRED_SEAL_TYPES.includes(
                    st as (typeof REQUIRED_SEAL_TYPES)[number]
                  )
                ) {
                  continue;
                }
                if (!approvedByCollection[cid]) {
                  approvedByCollection[cid] = new Set();
                }
                approvedByCollection[cid].add(st);
              }
              const fullySealed = Object.values(approvedByCollection).filter(
                (set) => set.size >= REQUIRED_SEAL_TYPES.length
              ).length;
              next.sealCoverage = Math.round(
                (fullySealed / activeIds.length) * 100
              );
            }
          } else {
            next.errors.sealCoverage = `Unavailable: activeCapsules failed (${next.errors.activeCapsules})`;
          }
        } else {
          next.errors.sealCoverage =
            sealsResp.status === "rejected"
              ? String(sealsResp.reason)
              : sealsResp.value.error?.message ?? "Failed to load seals";
        }

        // Open alerts (not dismissed)
        if (alertsResp.status === "fulfilled" && !alertsResp.value.error) {
          next.openAlerts = alertsResp.value.count ?? 0;
        } else {
          next.errors.openAlerts =
            alertsResp.status === "rejected"
              ? String(alertsResp.reason)
              : alertsResp.value.error?.message ?? "Failed to load alerts";
        }

        setState(next);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        setState({
          activeCapsules: null,
          avgMargin: null,
          sealCoverage: null,
          openAlerts: null,
          errors: {
            activeCapsules: message,
            avgMargin: message,
            sealCoverage: message,
            openAlerts: message,
          },
          isLoading: false,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
