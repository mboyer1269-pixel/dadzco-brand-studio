import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  Target, Theater, Palette, Printer, BookOpen, TrendingUp, Landmark,
} from "lucide-react";

const agents = [
  {
    key: "brand_strategy",
    name: "Brand Strategy Specialist",
    role: "Positionnement & ADN",
    bio: "Gardien de la cohérence « Écho & Rire ». Valide chaque décision contre l'ADN de marque.",
    icon: Target,
    color: "bg-accent/30 text-accent-foreground border-accent/40",
    dot: "bg-accent",
  },
  {
    key: "creative_director",
    name: "Creative & Mythology Director",
    role: "Thèmes & Univers",
    bio: "Architecte des mondes narratifs. Tisse mythologie et poésie dans chaque collection.",
    icon: Theater,
    color: "bg-[hsl(260,15%,81%,0.3)] text-foreground border-[hsl(260,15%,81%,0.4)]",
    dot: "bg-[hsl(260,15%,81%)]",
  },
  {
    key: "artistic_designer",
    name: "Artistic Designer",
    role: "Direction Artistique",
    bio: "Palettes, typographies et placements graphiques. L'œil qui transforme le concept en visuel.",
    icon: Palette,
    color: "bg-secondary/30 text-secondary-foreground border-secondary/40",
    dot: "bg-secondary",
  },
  {
    key: "pod_specialist",
    name: "POD Specialist",
    role: "Faisabilité Technique",
    bio: "Expert print-on-demand. Valide placements, formats et fichiers pour chaque produit.",
    icon: Printer,
    color: "bg-muted text-foreground border-border",
    dot: "bg-muted-foreground",
  },
  {
    key: "storytelling",
    name: "Storytelling Grok",
    role: "Narration & Copy",
    bio: "Mythologies, punchlines, descriptions Shopify et captions sociales. La voix de la marque.",
    icon: BookOpen,
    color: "bg-accent/30 text-accent-foreground border-accent/40",
    dot: "bg-accent",
  },
  {
    key: "growth",
    name: "Growth & Conversion",
    role: "Stratégie Revenue",
    bio: "Bundles, upsells, pricing psychologique. Chaque SKU est optimisé pour convertir.",
    icon: TrendingUp,
    color: "bg-[hsl(142,40%,30%,0.2)] text-foreground border-[hsl(142,40%,40%,0.3)]",
    dot: "bg-[hsl(142,40%,40%)]",
  },
  {
    key: "financial",
    name: "Financial Gatekeeper",
    role: "Validation Marges",
    bio: "Cible 58.5%, buffer 12%, prix CAD. Aucun SKU ne passe sans son approbation.",
    icon: Landmark,
    color: "bg-[hsl(142,40%,30%,0.2)] text-foreground border-[hsl(142,40%,40%,0.3)]",
    dot: "bg-[hsl(142,40%,40%)]",
  },
];

interface Props {
  isActive: boolean;
}

export function RoundTableAgentCards({ isActive }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {agents.map((agent, i) => (
        <motion.div
          key={agent.key}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: i * 0.08, duration: 0.4, ease: "easeOut" }}
        >
          <Card className={`border ${agent.color} card-lift h-full`}>
            <CardContent className="p-3 text-center space-y-2">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-background/60">
                <agent.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-body font-medium text-foreground leading-tight">
                  {agent.name}
                </p>
                <p className="text-[9px] font-body text-muted-foreground mt-0.5">
                  {agent.role}
                </p>
              </div>
              <p className="text-[9px] font-body text-muted-foreground leading-relaxed hidden md:block">
                {agent.bio}
              </p>
              <div className="flex items-center justify-center gap-1.5 pt-1">
                <span className={`h-1.5 w-1.5 rounded-full ${agent.dot} ${isActive ? "animate-pulse" : ""}`} />
                <span className="text-[8px] font-body text-muted-foreground uppercase tracking-wider">
                  {isActive ? "Active" : "Standby"}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
