import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { COLLECTION_TYPES, type CollectionType } from "@/lib/collection-types";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Props {
  selected: CollectionType | null;
  onSelect: (type: CollectionType) => void;
}

export function WizardStepType({ selected, onSelect }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-light text-foreground tracking-wide">
          Choose Collection Type
        </h2>
        <p className="text-sm text-muted-foreground font-body mt-1">
          Select the capsule strategy for your new collection
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {COLLECTION_TYPES.map((type) => (
          <Card
            key={type.id}
            className={cn(
              "cursor-pointer transition-all duration-300 border-2",
              selected === type.id
                ? "border-primary shadow-md"
                : "border-border hover:border-secondary"
            )}
            onClick={() => onSelect(type.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-display text-lg font-light text-foreground">
                    {type.label}
                  </h3>
                  <span className="text-xs font-body text-muted-foreground">
                    {type.skuCount} SKU{type.skuCount > 1 ? "s" : ""}
                  </span>
                </div>
                {selected === type.id && (
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="h-3.5 w-3.5 text-primary-foreground" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-body mb-3">
                {type.description}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {type.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px] font-body">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
