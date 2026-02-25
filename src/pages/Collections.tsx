import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderOpen, Plus } from "lucide-react";

const Collections = () => {
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
          <Button className="font-body text-xs tracking-wider uppercase">
            <Plus className="h-4 w-4 mr-2" />
            New Collection
          </Button>
        </div>

        <Card className="border-border border-dashed">
          <CardContent className="p-12 text-center">
            <FolderOpen className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground font-body">
              No collections yet. Create your first capsule collection.
            </p>
            <p className="text-xs text-muted-foreground font-body mt-2">
              Each collection includes margin calculator, family bundles, and personalization options.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Collections;
