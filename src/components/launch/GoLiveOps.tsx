import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckSquare } from "lucide-react";

interface CheckItem {
  id: string;
  label: string;
  description: string;
  checked: boolean;
}

const INITIAL_ITEMS: CheckItem[] = [
  {
    id: "meta-sync",
    label: "Meta API Synced",
    description: "Connexion Meta Business Suite active et tokens valides",
    checked: false,
  },
  {
    id: "leonardo-assets",
    label: "Leonardo Assets Generated",
    description: "Visuels campagne générés et approuvés (min. 3 formats)",
    checked: false,
  },
  {
    id: "manus-copy",
    label: "Manus Copy Approved",
    description: "Stratégie marketing et copy validés par le fondateur",
    checked: false,
  },
  {
    id: "shopify-sync",
    label: "Shopify Sync",
    description: "Produits publiés, prix confirmés, inventaire à jour",
    checked: false,
  },
  {
    id: "printful-upload",
    label: "Printful Upload",
    description: "Fichiers d'impression envoyés et mockups validés",
    checked: false,
  },
];

export function GoLiveOps() {
  const [items, setItems] = useState<CheckItem[]>(INITIAL_ITEMS);

  const checkedCount = items.filter((i) => i.checked).length;
  const total = items.length;
  const progress = Math.round((checkedCount / total) * 100);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  const getStatusLabel = () => {
    if (progress === 100) return "GO LIVE";
    if (progress >= 60) return "PRESQUE PRÊT";
    if (progress > 0) return "EN COURS";
    return "EN ATTENTE";
  };

  const getStatusColor = () => {
    if (progress === 100) return "bg-emerald-500/10 text-emerald-600 border-emerald-500/30";
    if (progress >= 60) return "bg-amber-500/10 text-amber-600 border-amber-500/30";
    return "bg-muted text-muted-foreground border-border";
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-display text-base font-light flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-lavande" />
              Go-Live Ops
            </CardTitle>
            <p className="text-xs text-muted-foreground font-body mt-1">
              Checklist de pré-lancement
            </p>
          </div>
          <Badge variant="outline" className={`text-[9px] font-body ${getStatusColor()}`}>
            {getStatusLabel()}
          </Badge>
        </div>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-body text-muted-foreground uppercase tracking-wider">
              Progression
            </span>
            <span className="text-xs font-body font-medium text-foreground">
              {checkedCount}/{total} — {progress}%
            </span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => toggleItem(item.id)}
            className="w-full flex items-start gap-3 p-3 rounded-md text-left transition-all duration-200 hover:bg-muted/40 group"
          >
            <div
              className={`mt-0.5 h-4 w-4 rounded-sm border flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
                item.checked
                  ? "bg-navy border-navy"
                  : "border-border/70 group-hover:border-lavande/50"
              }`}
            >
              {item.checked && (
                <svg className="h-2.5 w-2.5 text-creme" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-xs font-body font-medium transition-all duration-200 ${
                  item.checked
                    ? "line-through text-muted-foreground/50"
                    : "text-foreground"
                }`}
              >
                {item.label}
              </p>
              <p
                className={`text-[10px] font-body mt-0.5 transition-all duration-200 ${
                  item.checked
                    ? "text-muted-foreground/30"
                    : "text-muted-foreground/70"
                }`}
              >
                {item.description}
              </p>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
