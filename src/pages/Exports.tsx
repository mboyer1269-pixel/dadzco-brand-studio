import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Plus } from "lucide-react";

const Exports = () => {
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-light text-foreground tracking-wide">
              Export Center
            </h1>
            <p className="mt-1 text-sm text-muted-foreground font-body">
              Printful packs · Shopify listings · Bundle pricing
            </p>
          </div>
          <Button className="font-body text-xs tracking-wider uppercase btn-glow">
            <Plus className="h-4 w-4 mr-2" />
            New Export
          </Button>
        </div>

        <Card className="border-border border-dashed gradient-card-warm">
          <CardContent className="p-16 text-center echo-motif">
            <Download className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p className="font-display text-lg font-light text-foreground mb-1">
              Production-ready in one click
            </p>
            <p className="text-sm text-muted-foreground font-body max-w-md mx-auto">
              Generate ZIP packs, Shopify listings, and bundle pricing exports from your collections.
            </p>
            <p className="text-xs text-muted-foreground font-body mt-3">
              Printful ZIP · Naming conventions · Shopify JSON/CSV · Bundle pricing
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Exports;
