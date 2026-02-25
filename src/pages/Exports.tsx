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
          <Button className="font-body text-xs tracking-wider uppercase">
            <Plus className="h-4 w-4 mr-2" />
            New Export
          </Button>
        </div>

        <Card className="border-border border-dashed">
          <CardContent className="p-12 text-center">
            <Download className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground font-body">
              No exports yet. Generate ZIP packs and Shopify listing files from your collections.
            </p>
            <p className="text-xs text-muted-foreground font-body mt-2">
              Supports: Printful ZIP · Naming conventions · Shopify JSON/CSV · Bundle pricing export
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Exports;
