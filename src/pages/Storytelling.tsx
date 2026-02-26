import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PenTool, Plus } from "lucide-react";

const Storytelling = () => {
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-light text-foreground tracking-wide">
              Storytelling Engine
            </h1>
            <p className="mt-1 text-sm text-muted-foreground font-body">
              Écho & Rire narratives · Shopify · TikTok · Instagram
            </p>
          </div>
          <Button className="font-body text-xs tracking-wider uppercase btn-glow">
            <Plus className="h-4 w-4 mr-2" />
            New Story
          </Button>
        </div>

        <Card className="border-border border-dashed gradient-card-warm">
          <CardContent className="p-16 text-center echo-motif">
            <PenTool className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p className="font-display text-lg font-light text-foreground mb-1">
              Every design has a mythology
            </p>
            <p className="text-sm text-muted-foreground font-body max-w-md mx-auto">
              Generate Écho & Rire narratives, punchlines, Shopify descriptions, and social captions per SKU.
            </p>
            <p className="text-xs text-muted-foreground font-body mt-3 italic">
              « Dans le silence de la forme, l'écho trouve sa voix… »
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Storytelling;
