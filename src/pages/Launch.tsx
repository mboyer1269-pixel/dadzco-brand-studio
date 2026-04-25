import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Rocket } from "lucide-react";
import { LaunchChecklist } from "@/components/launch/LaunchChecklist";
import { supabase } from "@/integrations/supabase/client";

interface Collection {
  id: string;
  name: string;
}

export default function Launch() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [collectionsLoading, setCollectionsLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("collections")
      .select("id, name")
      .neq("lifecycle_status", "idea")
      .neq("lifecycle_status", "exported")
      .order("name")
      .then(({ data }) => {
        const cols = (data || []) as Collection[];
        setCollections(cols);
        if (cols.length === 1) setSelectedCollectionId(cols[0].id);
      })
      .finally(() => setCollectionsLoading(false));
  }, []);

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
          {!collectionsLoading && collections.length === 0 && (
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
