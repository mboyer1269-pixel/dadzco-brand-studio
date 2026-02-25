import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Image, Search } from "lucide-react";

const Library = () => {
  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-light text-foreground tracking-wide">
              Library
            </h1>
            <p className="mt-1 text-sm text-muted-foreground font-body">
              All designs · Tags · Versions · Linked stories
            </p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search designs..." className="pl-9 font-body" />
          </div>
        </div>

        <Card className="border-border border-dashed">
          <CardContent className="p-12 text-center">
            <Image className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground font-body">
              Your design library is empty. Generated designs will appear here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Library;
