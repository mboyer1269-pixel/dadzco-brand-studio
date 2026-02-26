import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FolderOpen, Plus, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

const Collections = () => {
  const [collections, setCollections] = useState<Tables<"collections">[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("collections")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setCollections(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-light text-foreground tracking-wide">
              Collections
            </h1>
            <p className="mt-1 text-sm text-muted-foreground font-body">
              Build capsule collections · 4 Quiet + 3 Funny + 1 Hero Buzz
            </p>
          </div>
          <Link to="/collections/new">
            <Button className="font-body text-xs tracking-wider uppercase">
              <Plus className="h-4 w-4 mr-2" />
              New Collection
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground font-body animate-pulse">Loading…</p>
          </div>
        ) : collections.length === 0 ? (
          <Card className="border-border border-dashed gradient-card-warm">
            <CardContent className="p-16 text-center echo-motif">
              <FolderOpen className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
              <p className="font-display text-lg font-light text-foreground mb-1">
                Your first capsule awaits
              </p>
              <p className="text-sm text-muted-foreground font-body max-w-md mx-auto">
                Build a collection with margin calculator, family bundles, and personalization — all guided by the wizard.
              </p>
              <Link to="/collections/new">
                <Button size="lg" className="mt-6 font-body text-xs tracking-[0.2em] uppercase h-11 px-8 btn-glow">
                  <Plus className="h-4 w-4 mr-2" />
                  Start Collection Wizard
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((c) => {
              const meta = c.metadata as any;
              return (
                <Card key={c.id} className="border-border card-lift gradient-card-warm">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-display text-lg font-light text-foreground">{c.name}</h3>
                      <Badge variant={c.status === "draft" ? "secondary" : "default"} className="text-[9px] font-body uppercase">
                        {c.status}
                      </Badge>
                    </div>
                    {c.season && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-body">{c.season}</span>
                      </div>
                    )}
                    {meta?.type && (
                      <Badge variant="outline" className="text-[9px] font-body capitalize">{meta.type}</Badge>
                    )}
                    <p className="text-[10px] text-muted-foreground font-body mt-3">
                      Created {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Collections;
