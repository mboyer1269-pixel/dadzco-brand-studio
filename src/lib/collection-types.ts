export type CollectionType = "quiet" | "funny" | "hybrid" | "hero";

export interface CollectionTypeConfig {
  id: CollectionType;
  label: string;
  description: string;
  skuCount: number;
  tags: string[];
}

export const COLLECTION_TYPES: CollectionTypeConfig[] = [
  {
    id: "quiet",
    label: "Quiet Luxury",
    description: "4 SKUs minimalistes · 70% negative space · écho géométrique",
    skuCount: 4,
    tags: ["Minimalist", "Geometric", "Ton-sur-ton"],
  },
  {
    id: "funny",
    label: "Funny Premium",
    description: "3 SKUs witty · typographie élégante · humour premium",
    skuCount: 3,
    tags: ["Typography", "Witty", "Premium humour"],
  },
  {
    id: "hybrid",
    label: "Full Hybrid",
    description: "4 Quiet + 3 Funny + 1 Hero Buzz · collection complète",
    skuCount: 8,
    tags: ["Complete", "Écho & Rire", "Capsule"],
  },
  {
    id: "hero",
    label: "Hero Buzz Limited",
    description: "1 SKU édition limitée · 50 exemplaires · numéro brodé",
    skuCount: 1,
    tags: ["Limited", "Numbered", "Collector"],
  },
];

export const PALETTE_COLORS = [
  { id: "sable", label: "Sable", className: "bg-sable" },
  { id: "brume", label: "Brume", className: "bg-brume" },
  { id: "navy", label: "Navy", className: "bg-navy" },
  { id: "creme", label: "Crème", className: "bg-creme" },
  { id: "lavande", label: "Lavande", className: "bg-lavande" },
];

export const STYLE_OPTIONS = [
  { id: "puff", label: "Puff Print", desc: "Raised texture chest print" },
  { id: "broderie", label: "Broderie ton-sur-ton", desc: "Tonal embroidery" },
  { id: "seamless", label: "Seamless All-Over", desc: "Full coverage AOP" },
];

export const FUNNY_SKU_NAMES = [
  "Chief Chaos Engineer",
  "Director of Domestic Mayhem",
  "Family Vibe Check",
  "Professional Snack Distributor",
  "CEO of Bedtime Negotiations",
];

export interface WizardSKU {
  id: string;
  name: string;
  type: "quiet" | "funny" | "hero";
  baseCost: number;
  retailPrice: number;
  margin: number;
  marginPct: number;
  personalization: boolean;
  style: string;
  palette: string[];
  story?: {
    mythology: string;
    punchlines: string[];
    shopifyDescription: string;
    tiktokCaption: string;
    instagramCaption: string;
    heroImageBrief: string;
  };
}

export interface WizardState {
  step: number;
  collectionType: CollectionType | null;
  name: string;
  season: string;
  palette: string[];
  style: string;
  skus: WizardSKU[];
  isGenerating: boolean;
  isGeneratingStories: boolean;
}
