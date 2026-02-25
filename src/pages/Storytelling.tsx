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
          <Button className="font-body text-xs tracking-wider uppercase">
            <Plus className="h-4 w-4 mr-2" />
            New Story
          </Button>
        </div>

        <Card className="border-border border-dashed">
          <CardContent className="p-12 text-center">
            <PenTool className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground font-body">
              No stories yet. Generate mythology narratives and marketing copy for your designs.
            </p>
            <p className="text-xs text-muted-foreground font-body mt-2">
              Per SKU: mythology, punchlines, Shopify description, TikTok & Instagram captions, hero image brief.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Storytelling;
