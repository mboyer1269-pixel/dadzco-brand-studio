import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { AlertTriangle, RefreshCw, Rocket } from "lucide-react";
import { LaunchChecklist } from "@/components/launch/LaunchChecklist";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Collection {
  id: string;
  name: string;
}

export default function Launch() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [collectionsError, setCollectionsError] = useState<string | null>(null);

  const loadCollections = useCallback(async () => {
    setCollectionsLoading(true);
    setCollectionsError(null);
    try {
      const { data, error } = await supabase
        .from("collections")
        .select("id, name")
        .neq("lifecycle_status", "idea")
        .neq("lifecycle_status", "exported")
        .order("name");

      // A failed query must never collapse into the "no active collections" empty state.
      if (error) throw error;

      const cols = (data || []) as Collection[];
      setCollections(cols);
      if (cols.length === 1) setSelectedCollectionId(cols[0].id);
    } catch (err) {
      console.error("Launch collections load error:", err);
      // PostgrestError is a plain object in some supabase-js versions, not an Error instance.
      const message =
        typeof (err as { message?: unknown })?.message === "string"
          ? (err as { message: string }).message
          : "Erreur inconnue";
      setCollectionsError(message);
      toast.error("Impossible de charger les collections.");
    } finally {
      setCollectionsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="gradient-header rounded-lg p-6 -mx-2">
          <div className="flex items-center gap-3 mb-2">
            <Rocket className="h-5 w-5 text-foreground" />
            <h1 className="font-display text-3xl font-light text-foreground tracking-wide">
              Launch Control
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-body">
            Checklist de pré-lancement — état persisté
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-body text-muted-foreground uppercase tracking-wider">
            Collection
          </label>
          <select
            disabled={collectionsLoading}
            value={selectedCollectionId ?? ""}
            onChange={(e) => setSelectedCollectionId(e.target.value || null)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-body text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            <option value="">— Sélectionner une collection —</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {!collectionsLoading && collectionsError && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-600 font-body truncate">
                  Erreur de chargement des collections — {collectionsError}
                </p>
              </div>
              <button
                type="button"
                onClick={loadCollections}
                className="flex items-center gap-1 text-[10px] font-body font-medium text-red-600 hover:underline flex-shrink-0"
              >
                <RefreshCw className="h-3 w-3" />
                Réessayer
              </button>
            </div>
          )}
          {!collectionsLoading && !collectionsError && collections.length === 0 && (
            <p className="text-xs text-muted-foreground font-body">
              Aucune collection active trouvée.
            </p>
          )}
        </div>

        <LaunchChecklist collectionId={selectedCollectionId ?? undefined} />
      </div>
    </AppLayout>
  );
}
