import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { exportPackPDF } from "@/lib/export-pack-pdf";
import { toast } from "sonner";
import {
  Download,
  Plus,
  ChevronDown,
  ChevronUp,
  Folder,
  Package,
  FileDown,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type ExportPackItem = Pick<
  Tables<"export_pack_items">,
  "id" | "sku_name" | "product_type" | "retail_price_cad" | "cost_cad" | "margin" | "mockup_url"
>;

type ExportPack = Tables<"export_packs"> & {
  collections: Pick<Tables<"collections">, "name" | "lifecycle_status"> | null;
  export_pack_items: ExportPackItem[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const LIFECYCLE_LABELS: Record<string, string> = {
  idea: "Idea",
  strategy_review: "Strategy Review",
  mockup_stage: "Mockup Stage",
  approved_for_production: "Approved",
  in_production: "In Production",
  ready_for_export: "Ready for Export",
  exported: "Exported",
};

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function MarginCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const pct = Math.round(value * 100);
  const colour = pct >= 55 ? "text-green-500" : "text-red-500";
  return <span className={`font-mono text-xs font-medium ${colour}`}>{pct}%</span>;
}

function LifecycleBadge({ status }: { status: string | null }) {
  if (!status) return null;
  return (
    <Badge variant="outline" className="font-body text-[10px] tracking-wider uppercase ml-2 border-border text-muted-foreground">
      {LIFECYCLE_LABELS[status] ?? status}
    </Badge>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const Exports = () => {
  const [packs, setPacks] = useState<ExportPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPacks = async () => {
      const { data, error } = await supabase
        .from("export_packs")
        .select(
          "*, collections(name, lifecycle_status), export_pack_items(id, sku_name, product_type, retail_price_cad, cost_cad, margin, mockup_url)"
        )
        .order("created_at", { ascending: false });

      if (!error && data) {
        setPacks(data as ExportPack[]);
      }
      setLoading(false);
    };

    fetchPacks();
  }, []);

  const toggleExpand = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  const handleDownloadPDF = (pack: ExportPack, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      exportPackPDF(pack);
    } catch (err) {
      console.error("Export pack PDF error:", err);
      toast.error("Impossible de générer le PDF.");
    }
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-light text-foreground tracking-wide">
              Export Center
            </h1>
            <p className="mt-1 text-sm text-muted-foreground font-body">
              Printful packs · Shopify listings · Bundle pricing
            </p>
          </div>
          <div title="Trigger exports from a collection's detail page">
            <Button
              disabled
              className="font-body text-xs tracking-wider uppercase opacity-40 cursor-not-allowed"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Export
            </Button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && packs.length === 0 && (
          <Card className="border-border border-dashed gradient-card-warm">
            <CardContent className="p-16 text-center echo-motif">
              <Download className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="font-display text-lg font-light text-foreground mb-1">
                No export packs yet
              </p>
              <p className="text-sm text-muted-foreground font-body max-w-md mx-auto">
                Generate export packs from a collection's detail page once it
                reaches <span className="font-medium">Approved for Production</span>.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Pack list */}
        {!loading && packs.length > 0 && (
          <div className="space-y-3">
            {packs.map((pack) => {
              const isExpanded = expandedId === pack.id;
              const collectionName = pack.collections?.name ?? "Unknown collection";
              const lifecycleStatus = pack.collections?.lifecycle_status ?? null;
              const itemCount = pack.export_pack_items.length;

              return (
                <Card
                  key={pack.id}
                  className="border-border gradient-card-warm overflow-hidden"
                >
                  {/* ── Row ── */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={isExpanded}
                    onClick={() => toggleExpand(pack.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleExpand(pack.id);
                      }
                    }}
                    className="w-full text-left cursor-pointer"
                  >
                    <CardContent className="p-5 flex items-center justify-between gap-4">
                      {/* Left: collection + meta */}
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-1">
                          <span className="font-display text-base font-light text-foreground tracking-wide truncate">
                            {collectionName}
                          </span>
                          <LifecycleBadge status={lifecycleStatus} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-body flex-wrap">
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {itemCount} SKU{itemCount !== 1 ? "s" : ""}
                          </span>
                          <span className="flex items-center gap-1">
                            <Folder className="h-3 w-3" />
                            <span className="font-mono truncate max-w-[260px]">
                              {pack.folder_path || "—"}
                            </span>
                          </span>
                          <span>{formatRelativeDate(pack.created_at)}</span>
                        </div>
                      </div>

                      {/* Right: PDF + version + status + expand toggle */}
                      <div className="flex items-center gap-3 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 font-body text-[10px] tracking-wider uppercase"
                          onClick={(e) => handleDownloadPDF(pack, e)}
                        >
                          <FileDown className="h-3 w-3 mr-1" />
                          PDF
                        </Button>
                        <Badge
                          variant="outline"
                          className="font-mono text-xs border-border"
                        >
                          v{pack.version}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="font-body text-[10px] tracking-wider uppercase"
                        >
                          {pack.status}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </CardContent>
                  </div>

                  {/* ── Expanded detail ── */}
                  {isExpanded && (
                    <div className="border-t border-border px-5 pb-5 pt-4 space-y-5">
                      {/* Folder structure */}
                      {pack.manifest &&
                        typeof pack.manifest === "object" &&
                        !Array.isArray(pack.manifest) &&
                        (pack.manifest as Record<string, unknown>).folderStructure && (
                          <div>
                            <p className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-2">
                              Folder structure
                            </p>
                            <div className="space-y-1">
                              {Object.entries(
                                (
                                  (pack.manifest as Record<string, unknown>)
                                    .folderStructure as Record<string, string>
                                ) ?? {}
                              ).map(([key, path]) => (
                                <div
                                  key={key}
                                  className="flex items-baseline gap-2 text-xs"
                                >
                                  <span className="text-muted-foreground font-body w-32 shrink-0 capitalize">
                                    {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                                  </span>
                                  <span className="font-mono text-foreground break-all">
                                    {path}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* SKU items table */}
                      {itemCount > 0 && (
                        <div>
                          <p className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-2">
                            SKUs in this pack
                          </p>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs font-body">
                              <thead>
                                <tr className="border-b border-border text-muted-foreground">
                                  <th className="text-left pb-2 pr-4 font-normal">SKU</th>
                                  <th className="text-left pb-2 pr-4 font-normal">Type</th>
                                  <th className="text-right pb-2 pr-4 font-normal">Cost</th>
                                  <th className="text-right pb-2 pr-4 font-normal">Retail</th>
                                  <th className="text-right pb-2 font-normal">Margin</th>
                                </tr>
                              </thead>
                              <tbody>
                                {pack.export_pack_items.map((item) => (
                                  <tr
                                    key={item.id}
                                    className="border-b border-border/50 last:border-0"
                                  >
                                    <td className="py-2 pr-4 text-foreground font-medium">
                                      {item.sku_name}
                                    </td>
                                    <td className="py-2 pr-4 text-muted-foreground">
                                      {item.product_type ?? "—"}
                                    </td>
                                    <td className="py-2 pr-4 text-right font-mono text-muted-foreground">
                                      {item.cost_cad != null
                                        ? `$${item.cost_cad.toFixed(2)}`
                                        : "—"}
                                    </td>
                                    <td className="py-2 pr-4 text-right font-mono text-muted-foreground">
                                      {item.retail_price_cad != null
                                        ? `$${item.retail_price_cad.toFixed(2)}`
                                        : "—"}
                                    </td>
                                    <td className="py-2 text-right">
                                      <MarginCell value={item.margin} />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {itemCount === 0 && (
                        <p className="text-xs text-muted-foreground font-body italic">
                          No items recorded in this pack.
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Exports;
